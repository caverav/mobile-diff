import * as frida from 'frida';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Platform } from '@mobile-diff/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class FridaClient {
  private session: frida.Session | null = null;
  private script: frida.Script | null = null;

  async connect(deviceId: string, bundleId: string, platform: Platform): Promise<void> {
    try {
      // Get device
      const deviceManager = frida.getDeviceManager();
      const devices = await deviceManager.enumerateDevices();
      const device = devices.find(d => d.id === deviceId);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Attach to app
      let pid: number;
      try {
        pid = await device.spawn([bundleId]);
        this.session = await device.attach(pid);
        await device.resume(pid);
      } catch {
        // App already running
        const apps = await device.enumerateApplications();
        const app = apps.find(a => a.identifier === bundleId);
        if (!app || !app.pid) {
          throw new Error(`App ${bundleId} not running`);
        }
        this.session = await device.attach(app.pid);
      }

      // Load agent
      const agentPath = join(__dirname, '..', '..', '..', 'agent', 'dist', `${platform}-agent.js`);
      const agentCode = readFileSync(agentPath, 'utf-8');
      this.script = await this.session.createScript(agentCode);

      this.script.message.connect((message) => {
        if (message.type === 'error') {
          console.error('Script error:', message.stack);
        }
      });

      await this.script.load();
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async call<T>(method: string, ...args: any[]): Promise<T> {
    if (!this.script) {
      throw new Error('Not connected');
    }

    try {
      const result = await this.script.exports[method](...args);
      return result as T;
    } catch (error) {
      throw new Error(`RPC call failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.script) {
      await this.script.unload();
      this.script = null;
    }
    if (this.session) {
      await this.session.detach();
      this.session = null;
    }
  }
}

export async function detectPlatform(deviceId: string): Promise<Platform> {
  const deviceManager = frida.getDeviceManager();
  const devices = await deviceManager.enumerateDevices();
  const device = devices.find(d => d.id === deviceId);

  if (!device) {
    throw new Error(`Device ${deviceId} not found`);
  }

  // Frida device types: local, remote, usb
  // Check OS via device properties
  const params = (device as any).querySystemParameters?.() || {};

  if (params.os?.toLowerCase().includes('android') || device.name.toLowerCase().includes('android')) {
    return 'android';
  }

  return 'ios'; // Default to iOS
}

export async function isJailbroken(deviceId: string): Promise<boolean> {
  try {
    const deviceManager = frida.getDeviceManager();
    const devices = await deviceManager.enumerateDevices();
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      return false;
    }

    // Check if we can access system processes (jailbreak indicator)
    const processes = await device.enumerateProcesses();
    return processes.some(p => p.name === 'launchd' || p.name === 'SpringBoard');
  } catch {
    return false;
  }
}
