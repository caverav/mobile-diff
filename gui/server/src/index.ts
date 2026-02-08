import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { deviceRoutes } from './routes/devices.js';
import { snapshotRoutes } from './routes/snapshots.js';

const app = new Hono();

// CORS
app.use('/*', cors());

// API routes
app.route('/api/devices', deviceRoutes);
app.route('/api/snapshots', snapshotRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

const port = parseInt(process.env.PORT || '31338');

console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
