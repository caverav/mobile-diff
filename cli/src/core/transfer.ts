import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import type { FridaClient } from './frida-client.js';

const execAsync = promisify(exec);

export async function transferFile(
  client: FridaClient,
  remotePath: string,
  localPath: string,
  useSSH: boolean,
  deviceId: string
): Promise<void> {
  if (useSSH) {
    // Use SCP for jailbroken iOS devices
    await transferViaSCP(remotePath, localPath, deviceId);
  } else {
    // Use frida-remote-stream
    await transferViaFrida(client, remotePath, localPath);
  }
}

async function transferViaSCP(remotePath: string, localPath: string, deviceId: string): Promise<void> {
  try {
    // Assuming SSH is set up with root@device
    await execAsync(`scp root@${deviceId}:${remotePath} ${localPath}`);
  } catch (error) {
    throw new Error(`SCP transfer failed: ${error}`);
  }
}

async function transferViaFrida(client: FridaClient, remotePath: string, localPath: string): Promise<void> {
  try {
    // Use frida-remote-stream
    const { open } = await import('frida-remote-stream');

    // Create a stream from the remote file
    const stream = await open(remotePath);
    const writer = createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      stream.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
      stream.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Frida transfer failed: ${error}`);
  }
}

export async function transferZips(
  client: FridaClient,
  zipPaths: Record<string, string>,
  targetDir: string,
  useSSH: boolean,
  deviceId: string,
  onProgress?: (scope: string, current: number, total: number) => void
): Promise<void> {
  const scopes = Object.keys(zipPaths);
  const total = scopes.length;

  for (let i = 0; i < total; i++) {
    const scope = scopes[i];
    const remotePath = zipPaths[scope];
    const localPath = join(targetDir, `${scope}.zip`);

    if (onProgress) {
      onProgress(scope, i + 1, total);
    }

    await transferFile(client, remotePath, localPath, useSSH, deviceId);
  }
}
