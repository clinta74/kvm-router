import { Router, Response } from 'express';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';
import { rewriteNginxConfig } from '../nginx-manager.js';

const router = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureUniqueSlug(base: string, excludeId?: number): string {
  let slug = base;
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const row = excludeId
      ? db.prepare('SELECT id FROM hosts WHERE slug = ? AND id != ?').get(candidate, excludeId)
      : db.prepare('SELECT id FROM hosts WHERE slug = ?').get(candidate);
    if (!row) return candidate;
    attempt++;
  }
}

interface Host {
  id: number;
  name: string;
  slug: string;
  url: string;
  order_index: number;
  max_body_size: string;
  created_at: string;
  updated_at: string;
}

/** GET /api/hosts — returns all hosts ordered by order_index */
router.get('/', requireAuth, (_req: AuthRequest, res: Response) => {
  const hosts = db
    .prepare('SELECT * FROM hosts ORDER BY order_index ASC, id ASC')
    .all() as Host[];
  res.json(hosts);
});

/** POST /api/hosts — create a new host */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, url, slug: customSlug, order_index, max_body_size } = req.body as {
    name?: string;
    url?: string;
    slug?: string;
    order_index?: number;
    max_body_size?: string;
  };

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    res.status(400).json({ error: 'URL is required and must start with http or https' });
    return;
  }

  const baseSlug = customSlug ? slugify(customSlug) : slugify(name.trim());
  if (!baseSlug) {
    res.status(400).json({ error: 'Could not generate a valid URL slug from the name provided' });
    return;
  }
  const slug = ensureUniqueSlug(baseSlug);
  const bodySize = max_body_size?.trim() || '10m';

  const maxOrder = (db.prepare('SELECT MAX(order_index) as m FROM hosts').get() as { m: number | null }).m ?? -1;
  const idx = order_index !== undefined ? order_index : maxOrder + 1;

  const result = db
    .prepare('INSERT INTO hosts (name, slug, url, order_index, max_body_size) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), slug, url.trim(), idx, bodySize);

  const host = db.prepare('SELECT * FROM hosts WHERE id = ?').get(result.lastInsertRowid) as Host;
  await rewriteNginxConfig();
  res.status(201).json(host);
});

/** PUT /api/hosts/reorder — accepts [{id, order_index}, ...] */
router.put('/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  const items = req.body as { id: number; order_index: number }[];
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Body must be an array of {id, order_index}' });
    return;
  }

  const update = db.prepare('UPDATE hosts SET order_index = ?, updated_at = datetime(\'now\') WHERE id = ?');
  const tx = db.transaction(() => {
    for (const item of items) {
      update.run(item.order_index, item.id);
    }
  });
  tx();

  await rewriteNginxConfig();
  const hosts = db.prepare('SELECT * FROM hosts ORDER BY order_index ASC, id ASC').all() as Host[];
  res.json(hosts);
});

/** PUT /api/hosts/:id — update a host */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const existing = db.prepare('SELECT * FROM hosts WHERE id = ?').get(id) as Host | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Host not found' });
    return;
  }

  const { name, url, slug: customSlug, order_index, max_body_size } = req.body as {
    name?: string;
    url?: string;
    slug?: string;
    order_index?: number;
    max_body_size?: string;
  };

  const newName = name?.trim() ?? existing.name;
  const newUrl = url?.trim() ?? existing.url;
  const newOrderIndex = order_index !== undefined ? order_index : existing.order_index;
  const newBodySize = max_body_size?.trim() || existing.max_body_size;

  // Re-generate slug only if name changed and no custom slug provided
  let newSlug: string;
  if (customSlug !== undefined) {
    const base = slugify(customSlug);
    newSlug = base ? ensureUniqueSlug(base, id) : existing.slug;
  } else if (name && name.trim() !== existing.name) {
    newSlug = ensureUniqueSlug(slugify(newName), id);
  } else {
    newSlug = existing.slug;
  }

  if (!newUrl.startsWith('http')) {
    res.status(400).json({ error: 'URL must start with http or https' });
    return;
  }

  db.prepare(
    'UPDATE hosts SET name = ?, slug = ?, url = ?, order_index = ?, max_body_size = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(newName, newSlug, newUrl, newOrderIndex, newBodySize, id);

  const host = db.prepare('SELECT * FROM hosts WHERE id = ?').get(id) as Host;
  await rewriteNginxConfig();
  res.json(host);
});

/** DELETE /api/hosts/:id */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const existing = db.prepare('SELECT id FROM hosts WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Host not found' });
    return;
  }

  db.prepare('DELETE FROM hosts WHERE id = ?').run(id);
  await rewriteNginxConfig();
  res.status(204).send();
});

export default router;
