export type Platform = 'ios' | 'android';

export type OutputFormat = 'text' | 'json' | 'yaml';

export interface SnapshotOptions {
  scopes?: string[];
  maxFileSize?: number;
  outputFormat?: OutputFormat;
  useSSH?: boolean; // For jailbroken iOS
  useADB?: boolean; // For rooted Android
}

export interface SnapshotMetadata {
  platform: Platform;
  device: string;
  bundle: string;
  label: string;
  timestamp: string;
  scopes: string[];
  totalFiles: number;
  totalSize: number;
}

export interface AppData {
  userDefaults?: Record<string, any>; // iOS
  cookies?: Cookie[];
  keychain?: KeychainEntry[];
  pasteboard?: PasteboardItem[];
  sharedPreferences?: Record<string, any>; // Android
  databases?: string[]; // List of database paths
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiresDate?: string;
  isSecure: boolean;
  isHTTPOnly: boolean;
}

export interface KeychainEntry {
  account?: string;
  service?: string;
  label?: string;
  accessGroup?: string;
  creationDate?: string;
  modificationDate?: string;
  type: string;
}

export interface PasteboardItem {
  type: string;
  content: string;
}

export interface FileEntry {
  path: string;
  size: number;
  isDirectory: boolean;
  hash?: string;
  modifiedDate?: string;
}

export interface SnapshotResult {
  metadata: SnapshotMetadata;
  appData: AppData;
  zipPaths: Record<string, string>; // scope -> temp zip path
}

export interface DiffResult {
  added: FileEntry[];
  deleted: FileEntry[];
  modified: FileEntry[];
  unchanged: FileEntry[];
  appDataChanges: {
    userDefaults?: Record<string, DiffEntry>;
    cookies?: DiffEntry[];
    keychain?: DiffEntry[];
    sharedPreferences?: Record<string, DiffEntry>;
  };
}

export interface DiffEntry {
  key: string;
  status: 'added' | 'deleted' | 'modified' | 'unchanged';
  before?: any;
  after?: any;
}

export const DEFAULT_SCOPES = {
  ios: ['Documents', 'Library', 'tmp', 'Bundle'],
  android: ['files', 'cache', 'databases', 'shared_prefs'],
};

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
