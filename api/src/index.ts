import express from 'express';
import { getJwtSecret } from './auth.js';
import authRouter from './routes/auth.js';
import hostsRouter from './routes/hosts.js';
import { rewriteNginxConfig } from './nginx-manager.js';

// Validate JWT_SECRET at startup — fail fast
getJwtSecret();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(express.json());

// Trust proxy headers (nginx is in front)
app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/hosts', hostsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] Listening on http://127.0.0.1:${PORT}`);
  // Regenerate nginx config on startup in case hosts exist but config was lost
  rewriteNginxConfig()
    .then(() => console.log('[api] nginx config synced on startup'))
    .catch((err) => console.warn('[api] nginx config sync failed:', err));
});
