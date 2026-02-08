import { Hono } from 'hono';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { FridaService } from '../services/frida.js';
import { broadcastProgress } from '../websocket.js';

interface SnapshotMetadata {
  platform: string;
  device: string;
  bundle: string;
  label: string;
  timestamp: string;
  scopes: string[];
  totalFiles: number;
  totalSize: number;
}

const app = new Hono();
const STORAGE_DIR = join(homedir(), '.mobile-diff', 'snapshots');

// List snapshots for a device/bundle
app.get('/:device/:bundle', (c) => {
  try {
    const device = c.req.param('device');
    const bundle = c.req.param('bundle');
    const dir = join(STORAGE_DIR, device, bundle);

    if (!existsSync(dir)) {
      return c.json([]);
    }

    const labels = readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const snapshots = labels
      .map(label => {
        try {
          const metadataPath = join(dir, label, 'metadata.json');
          if (!existsSync(metadataPath)) return null;
          return JSON.parse(readFileSync(metadataPath, 'utf-8')) as SnapshotMetadata;
        } catch {
          return null;
        }
      })
      .filter((m): m is SnapshotMetadata => m !== null);

    return c.json(snapshots);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create snapshot
app.post('/:device/:bundle', async (c) => {
  try {
    const device = c.req.param('device');
    const bundle = c.req.param('bundle');
    const body = await c.req.json();
    const { label, scopes, format = 'text', useSSH = false } = body;

    if (!label) {
      return c.json({ error: 'Label is required' }, 400);
    }

    const snapshotDir = join(STORAGE_DIR, device, bundle, label);
    if (existsSync(snapshotDir)) {
      return c.json({ error: 'Snapshot already exists' }, 400);
    }

    mkdirSync(snapshotDir, { recursive: true });

    // Start snapshot creation in background
    FridaService.createSnapshot(device, bundle, label, scopes, format, useSSH)
      .catch(error => {
        console.error('Snapshot creation failed:', error);
        broadcastProgress({ type: 'error', message: String(error) });
      });

    return c.json({ success: true, label });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get snapshot metadata
app.get('/:device/:bundle/:label', (c) => {
  try {
    const device = c.req.param('device');
    const bundle = c.req.param('bundle');
    const label = c.req.param('label');
    const metadataPath = join(STORAGE_DIR, device, bundle, label, 'metadata.json');

    if (!existsSync(metadataPath)) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    return c.json(metadata);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete snapshot
app.delete('/:device/:bundle/:label', (c) => {
  try {
    const device = c.req.param('device');
    const bundle = c.req.param('bundle');
    const label = c.req.param('label');
    const snapshotDir = join(STORAGE_DIR, device, bundle, label);

    if (!existsSync(snapshotDir)) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    rmSync(snapshotDir, { recursive: true, force: true });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Compare snapshots
app.get('/:device/:bundle/compare/:before/:after', (c) => {
  try {
    const device = c.req.param('device');
    const bundle = c.req.param('bundle');
    const before = c.req.param('before');
    const after = c.req.param('after');

    const beforeDir = join(STORAGE_DIR, device, bundle, before);
    const afterDir = join(STORAGE_DIR, device, bundle, after);

    if (!existsSync(beforeDir) || !existsSync(afterDir)) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    // Return paths for frontend to handle diff
    return c.json({
      beforePath: beforeDir,
      afterPath: afterDir,
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export const snapshotRoutes = app;
