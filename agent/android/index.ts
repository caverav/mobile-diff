// @ts-nocheck
/* eslint-disable */

// Create zip of directory using ZipOutputStream
export function zipDirectory(path: string): string | null {
  try {
    const File = Java.use('java.io.File');
    const FileOutputStream = Java.use('java.io.FileOutputStream');
    const ZipOutputStream = Java.use('java.util.zip.ZipOutputStream');
    const ZipEntry = Java.use('java.util.zip.ZipEntry');
    const FileInputStream = Java.use('java.io.FileInputStream');

    const sourceDir = File.$new(path);
    if (!sourceDir.exists() || !sourceDir.isDirectory()) {
      return null;
    }

    // Create temp zip file
    const cacheDir = Java.use('android.app.ActivityThread').currentApplication().getApplicationContext().getCacheDir();
    const tempZip = File.$new(cacheDir, `snapshot_${Date.now()}.zip`);
    const fos = FileOutputStream.$new(tempZip);
    const zos = ZipOutputStream.$new(fos);

    zipDirectoryRecursive(sourceDir, sourceDir, zos);

    zos.close();
    fos.close();

    return tempZip.getAbsolutePath();
  } catch (e) {
    console.error(`Failed to zip directory ${path}:`, e);
    return null;
  }
}

function zipDirectoryRecursive(rootDir: any, currentDir: any, zos: any): void {
  const FileInputStream = Java.use('java.io.FileInputStream');
  const ZipEntry = Java.use('java.util.zip.ZipEntry');

  const files = currentDir.listFiles();
  if (!files) return;

  const buffer = Java.array('byte', new Array(1024).fill(0));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.isDirectory()) {
      zipDirectoryRecursive(rootDir, file, zos);
    } else {
      const relativePath = file.getAbsolutePath().substring(rootDir.getAbsolutePath().length() + 1);
      const entry = ZipEntry.$new(relativePath);
      zos.putNextEntry(entry);

      const fis = FileInputStream.$new(file);
      let len: number;
      while ((len = fis.read(buffer)) > 0) {
        zos.write(buffer, 0, len);
      }
      fis.close();
      zos.closeEntry();
    }
  }
}

// Capture SharedPreferences
export function captureSharedPreferences(): Record<string, any> {
  try {
    const context = Java.use('android.app.ActivityThread').currentApplication().getApplicationContext();
    const prefsDir = context.getFilesDir().getParent() + '/shared_prefs';
    const File = Java.use('java.io.File');
    const prefsDirFile = File.$new(prefsDir);

    if (!prefsDirFile.exists()) {
      return {};
    }

    const result: Record<string, any> = {};
    const files = prefsDirFile.listFiles();

    if (!files) return result;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.getName().endsWith('.xml')) {
        const prefsName = file.getName().replace('.xml', '');
        const prefs = context.getSharedPreferences(prefsName, 0);
        const allEntries = prefs.getAll();
        const entrySet = allEntries.entrySet();
        const iterator = entrySet.iterator();

        const prefsData: Record<string, any> = {};
        while (iterator.hasNext()) {
          const entry = iterator.next();
          const key = entry.getKey().toString();
          const value = entry.getValue();
          prefsData[key] = parseJavaValue(value);
        }

        result[prefsName] = prefsData;
      }
    }

    return result;
  } catch (e) {
    console.error("Failed to capture SharedPreferences:", e);
    return {};
  }
}

// List databases
export function listDatabases(): string[] {
  try {
    const context = Java.use('android.app.ActivityThread').currentApplication().getApplicationContext();
    const dbDir = context.getDatabasePath('dummy').getParent();
    const File = Java.use('java.io.File');
    const dbDirFile = File.$new(dbDir);

    if (!dbDirFile.exists()) {
      return [];
    }

    const files = dbDirFile.listFiles();
    if (!files) return [];

    const databases: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.isFile() && !file.getName().endsWith('-journal')) {
        databases.push(file.getName());
      }
    }

    return databases;
  } catch (e) {
    console.error("Failed to list databases:", e);
    return [];
  }
}

// Helper to parse Java values
function parseJavaValue(value: any): any {
  if (value === null) return null;

  try {
    const className = value.getClass().getName();

    if (className === 'java.lang.Boolean') {
      return value.booleanValue();
    } else if (className === 'java.lang.Integer') {
      return value.intValue();
    } else if (className === 'java.lang.Long') {
      return value.longValue();
    } else if (className === 'java.lang.Float') {
      return value.floatValue();
    } else if (className === 'java.lang.Double') {
      return value.doubleValue();
    } else if (className === 'java.lang.String') {
      return value.toString();
    } else if (className.startsWith('java.util.Set')) {
      const arr: any[] = [];
      const iterator = value.iterator();
      while (iterator.hasNext()) {
        arr.push(iterator.next().toString());
      }
      return arr;
    } else {
      return value.toString();
    }
  } catch (e) {
    return value.toString();
  }
}

// Main snapshot function
export function createSnapshot(scopes: string[]): any {
  const context = Java.use('android.app.ActivityThread').currentApplication().getApplicationContext();
  const zipPaths: Record<string, string> = {};

  // Map scope names to actual paths
  const scopeMapping: Record<string, string> = {
    'files': context.getFilesDir().getAbsolutePath(),
    'cache': context.getCacheDir().getAbsolutePath(),
    'databases': context.getDatabasePath('dummy').getParent(),
    'shared_prefs': context.getFilesDir().getParent() + '/shared_prefs',
  };

  // Zip each scope
  for (const scope of scopes) {
    const actualPath = scopeMapping[scope] || scope;
    const zipPath = zipDirectory(actualPath);
    if (zipPath) {
      zipPaths[scope] = zipPath;
    }
  }

  // Capture app data
  const appData = {
    sharedPreferences: captureSharedPreferences(),
    databases: listDatabases(),
  };

  return {
    zipPaths,
    appData,
    timestamp: new Date().toISOString(),
  };
}

rpc.exports = {
  createSnapshot,
  zipDirectory,
  captureSharedPreferences,
  listDatabases,
};
