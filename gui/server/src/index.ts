import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './public' }));
}

const port = process.env.PORT || 31338;

import { addClient, removeClient } from './websocket.js';

export default {
  port,
  fetch: app.fetch,
  websocket: {
    open(ws: any) {
      console.log('WebSocket client connected');
      addClient(ws);
    },
    message(ws: any, message: string) {
      // Echo back for testing
      ws.send(message);
    },
    close(ws: any) {
      console.log('WebSocket client disconnected');
      removeClient(ws);
    },
  },
};

console.log(`Server running on http://localhost:${port}`);
