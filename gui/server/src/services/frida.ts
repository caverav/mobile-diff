import * as frida from 'frida';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { broadcastProgress } from '../websocket.js';

type Platform = 'ios' | 'android';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORAGE_DIR = join(homedir(), '.mobile-diff', 'snapshots');

export class FridaService {
  static async createSnapshot(
    deviceId: string,
    bundleId: string,
    label: string,
    scopes: string[],
    format: string,
    useSSH: boolean
  ): Promise<void> {
    let session: frida.Session | null = null;
    let script: frida.Script | null = null;

    try {
      broadcastProgress({ type: 'progress', stage: 'connect', message: 'Connecting to device...' });

      // Get device
      const deviceManager = frida.getDeviceManager();
      const devices = await deviceManager.enumerateDevices();
      const device = devices.find(d => d.id === deviceId);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Detect platform
      const platform = await this.detectPlatform(device);
      broadcastProgress({ type: 'progress', stage: 'platform', message: `Platform: ${platform}` });

      // Attach to app
      broadcastProgress({ type: 'progress', stage: 'attach', message: 'Attaching to app...' });
      let pid: number;
      try {
        pid = await device.spawn([bundleId]);
        session = await device.attach(pid);
        await device.resume(pid);
      } catch {
        const apps = await device.enumerateApplications();
        const app = apps.find(a => a.identifier === bundleId);
        if (!app || !app.pid) {
          throw new Error(`App ${bundleId} not running`);
        }
        session = await device.attach(app.pid);
      }

      // Load agent
      broadcastProgress({ type: 'progress', stage: 'load', message: 'Loading agent...' });
      const agentPath = join(__dirname, '..', '..', '..', '..', 'agent', 'dist', `${platform}-agent.js`);
      const agentCode = readFileSync(agentPath, 'utf-8');
      script = await session.createScript(agentCode);
      await script.load();

      // Create snapshot
      broadcastProgress({ type: 'progress', stage: 'snapshot', message: 'Creating snapshot...' });
      const result = await script.exports.createSnapshot(scopes);

      // Save metadata
      const snapshotDir = join(STORAGE_DIR, deviceId, bundleId, label);
      const metadata: SnapshotMetadata = {
        platform,
        device: deviceId,
        bundle: bundleId,
        label,
        timestamp: result.timestamp,
        scopes,
        totalFiles: 0,
        totalSize: 0,
      };

      writeFileSync(join(snapshotDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Save app data
      if (format === 'json') {
        writeFileSync(join(snapshotDir, 'appdata.json'), JSON.stringify(result.appData, null, 2));
      }

      // Note: File transfer not implemented in this simplified version
      // In production, would use frida-remote-stream or SCP here

      broadcastProgress({ type: 'complete', message: 'Snapshot created successfully' });

      await script.unload();
      await session.detach();
    } catch (error) {
      if (script) await script.unload().catch(() => {});
      if (session) await session.detach().catch(() => {});
      throw error;
    }
  }

  private static async detectPlatform(device: frida.Device): Promise<Platform> {
    try {
      const processes = await device.enumerateProcesses();
      if (processes.some(p => p.name === 'launchd' || p.name === 'SpringBoard')) {
        return 'ios';
      }
      return 'android';
    } catch {
      return 'ios';
    }
  }
}
