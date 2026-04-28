import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { getJwtSecret } from '../auth.js';

const router = Router();

/** GET /api/auth/status — returns whether any user account exists */
router.get('/status', (_req: Request, res: Response) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  res.json({ setupRequired: row.count === 0 });
});

/** POST /api/auth/setup — create the first admin account (only works when 0 users exist) */
router.post('/setup', (req: Request, res: Response) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (row.count > 0) {
    res.status(403).json({ error: 'Setup already completed' });
    return;
  }

  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const hash = bcrypt.hashSync(password.trim(), 12);
  const result = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username.trim(), hash);

  const token = jwt.sign(
    { sub: result.lastInsertRowid, username: username.trim() },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
  res.status(201).json({ token });
});

/** POST /api/auth/login */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = db
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
  res.json({ token });
});

export default router;
