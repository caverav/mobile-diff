import { Hono } from 'hono';
import * as frida from 'frida';

const app = new Hono();

// List all devices
app.get('/', async (c) => {
  try {
    const deviceManager = frida.getDeviceManager();
    const devices = await deviceManager.enumerateDevices();

    const deviceList = devices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      icon: d.icon,
    }));

    return c.json(deviceList);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// List apps on a device
app.get('/:deviceId/apps', async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const deviceManager = frida.getDeviceManager();
    const devices = await deviceManager.enumerateDevices();
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    const apps = await device.enumerateApplications();

    const appList = apps.map(app => ({
      identifier: app.identifier,
      name: app.name,
      pid: app.pid || null,
    }));

    return c.json(appList);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get device info
app.get('/:deviceId', async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const deviceManager = frida.getDeviceManager();
    const devices = await deviceManager.enumerateDevices();
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    // Try to determine platform
    let platform = 'unknown';
    try {
      const processes = await device.enumerateProcesses();
      if (processes.some(p => p.name === 'launchd' || p.name === 'SpringBoard')) {
        platform = 'ios';
      } else if (processes.some(p => p.name === 'system_server' || p.name === 'zygote')) {
        platform = 'android';
      }
    } catch {
      // Ignore
    }

    return c.json({
      id: device.id,
      name: device.name,
      type: device.type,
      icon: device.icon,
      platform,
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export const deviceRoutes = app;
