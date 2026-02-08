import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import type { SnapshotMetadata, Platform } from '@mobile-diff/shared';

const STORAGE_DIR = join(homedir(), '.mobile-diff', 'snapshots');

export function getSnapshotDir(device: string, bundle: string, label?: string): string {
  const base = join(STORAGE_DIR, device, bundle);
  if (label) {
    return join(base, label);
  }
  return base;
}

export function ensureSnapshotDir(device: string, bundle: string, label: string): string {
  const dir = getSnapshotDir(device, bundle, label);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function listSnapshots(device: string, bundle: string): SnapshotMetadata[] {
  const dir = getSnapshotDir(device, bundle);
  if (!existsSync(dir)) {
    return [];
  }

  const labels = readdirSync(dir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  return labels
    .map(label => {
      try {
        return loadMetadata(device, bundle, label);
      } catch {
        return null;
      }
    })
    .filter((m): m is SnapshotMetadata => m !== null);
}

export function saveMetadata(device: string, bundle: string, label: string, metadata: SnapshotMetadata): void {
  const dir = ensureSnapshotDir(device, bundle, label);
  const metadataPath = join(dir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

export function loadMetadata(device: string, bundle: string, label: string): SnapshotMetadata {
  const metadataPath = join(getSnapshotDir(device, bundle, label), 'metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error(`Snapshot ${label} not found`);
  }
  return JSON.parse(readFileSync(metadataPath, 'utf-8'));
}

export function deleteSnapshot(device: string, bundle: string, label: string): void {
  const dir = getSnapshotDir(device, bundle, label);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function snapshotExists(device: string, bundle: string, label: string): boolean {
  const dir = getSnapshotDir(device, bundle, label);
  return existsSync(dir) && existsSync(join(dir, 'metadata.json'));
}

export function saveAppData(device: string, bundle: string, label: string, appData: any, format: 'text' | 'json' | 'yaml'): void {
  const dir = ensureSnapshotDir(device, bundle, label);

  if (format === 'json') {
    writeFileSync(join(dir, 'appdata.json'), JSON.stringify(appData, null, 2));
  } else if (format === 'yaml') {
    const yaml = require('js-yaml');
    writeFileSync(join(dir, 'appdata.yaml'), yaml.dump(appData));
  } else {
    // Text format
    if (appData.userDefaults) {
      const lines = Object.entries(appData.userDefaults).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
      writeFileSync(join(dir, 'userdefaults.txt'), lines.join('\n'));
    }

    if (appData.sharedPreferences) {
      const lines: string[] = [];
      for (const [file, prefs] of Object.entries(appData.sharedPreferences as Record<string, any>)) {
        lines.push(`[${file}]`);
        for (const [k, v] of Object.entries(prefs)) {
          lines.push(`${k}=${JSON.stringify(v)}`);
        }
        lines.push('');
      }
      writeFileSync(join(dir, 'sharedpreferences.txt'), lines.join('\n'));
    }

    if (appData.cookies) {
      const header = 'name,domain,path,value,expires,secure,httponly';
      const lines = appData.cookies.map((c: any) =>
        `${c.name},${c.domain},${c.path},${c.value},${c.expiresDate || ''},${c.isSecure},${c.isHTTPOnly}`
      );
      writeFileSync(join(dir, 'cookies.txt'), [header, ...lines].join('\n'));
    }

    if (appData.keychain) {
      const lines: string[] = [];
      appData.keychain.forEach((entry: any, i: number) => {
        lines.push(`[Entry ${i + 1}]`);
        for (const [k, v] of Object.entries(entry)) {
          if (v) lines.push(`${k}=${v}`);
        }
        lines.push('');
      });
      writeFileSync(join(dir, 'keychain.txt'), lines.join('\n'));
    }

    if (appData.pasteboard) {
      const lines = appData.pasteboard.map((item: any) =>
        `${item.type}: ${item.content}`
      );
      writeFileSync(join(dir, 'pasteboard.txt'), lines.join('\n'));
    }

    if (appData.databases) {
      writeFileSync(join(dir, 'databases.txt'), appData.databases.join('\n'));
    }
  }
}
