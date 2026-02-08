# mobile-diff

Snapshot and compare mobile app file systems across iOS and Android.

## Features

- 📸 Capture full file system snapshots
- 🔍 Compare snapshots to see what changed
- 📱 Support for iOS and Android
- 🖥️  Both CLI and GUI interfaces
- 🚀 Fast transfers using frida-remote-stream
- 🔐 Works on jailbroken and non-jailbroken devices
- 📊 Multiple output formats (text, JSON, YAML)

## Installation

```bash
npm install -g mobile-diff
```

## CLI Usage

```bash
# Create a snapshot
mobile-diff snapshot create <device> <bundle> --label "before-login"

# List snapshots
mobile-diff snapshot list <device> <bundle>

# Compare two snapshots
mobile-diff snapshot diff <device> <bundle> before-login after-login

# Delete a snapshot
mobile-diff snapshot delete <device> <bundle> before-login
```

## GUI Usage

```bash
# Launch GUI (runs on http://localhost:31338)
bun run dev:gui

# Or in production
bun run start:gui
```

The GUI provides a web interface for:
- Browsing connected devices and apps
- Creating snapshots with real-time progress
- Managing and comparing snapshots
- Visual snapshot selection

**Ports:**
- Backend: `http://localhost:31338`
- Frontend dev server: `http://localhost:3000` (proxies to backend)

## How it works

### iOS
- Uses `NSFileCoordinator` to create zip archives (memory efficient)
- Transfers using `frida-remote-stream` or `scp` (auto-detected for jailbroken devices)
- Extracts app data (UserDefaults, Cookies, Keychain, Pasteboard)

### Android
- Uses `ZipOutputStream` to compress directories
- Transfers using `frida-remote-stream` or `adb pull`
- Extracts app data (SharedPreferences, databases, files)

## Scopes

**iOS default scopes:**
- `Documents` - User's Documents folder
- `Library` - App's Library folder (preferences, caches, etc.)
- `tmp` - Temporary files
- `Bundle` - App bundle contents

**Android default scopes:**
- `files` - Internal files directory
- `cache` - Cache directory
- `databases` - SQLite databases
- `shared_prefs` - SharedPreferences XML files

## Output Structure

```
~/.mobile-diff/snapshots/
  └── {device-id}/
      └── {bundle-id}/
          └── {label}/
              ├── Documents.zip
              ├── Library.zip
              ├── userdefaults.txt
              ├── cookies.txt
              ├── keychain.txt
              └── metadata.json
```

## Development

```bash
# Install dependencies
bun install

# Build agent
bun run build:agent

# Build CLI
bun run build:cli

# Run CLI locally
bun run --cwd cli dev snapshot list
```

## License

MIT
