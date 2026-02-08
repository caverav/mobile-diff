# TODO

## Must Have (for v1.0)

- [ ] Install dependencies and test build
  - [ ] `bun install`
  - [ ] `bun run build:agent`
  - [ ] `bun run build:cli`
- [ ] Test with real iOS device
  - [ ] Test snapshot creation
  - [ ] Test file transfer
  - [ ] Test diff output
- [ ] Test with Android device
- [ ] Fix frida-remote-stream integration
  - [ ] Current implementation needs actual frida-remote-stream API
  - [ ] May need to create custom pipe from Frida script
- [ ] Add file count and size calculation in metadata
- [ ] Handle errors gracefully (device disconnect, app crash, etc.)
- [ ] Add progress reporting for large transfers
- [ ] Verify SSH/SCP works on jailbroken devices

## Nice to Have

- [ ] GUI (Electron application)
  - [ ] Device/app selector
  - [ ] Snapshot list view
  - [ ] Visual diff viewer (Monaco editor)
  - [ ] Progress tracking
- [ ] Incremental snapshots (only capture changed files)
- [ ] Snapshot compression (zip the entire snapshot directory)
- [ ] Remote snapshot storage (upload to cloud/server)
- [ ] Snapshot export/import
- [ ] File filtering (exclude patterns)
- [ ] Binary file diff (hex viewer)
- [ ] Database schema diff (for SQLite)
- [ ] Watch mode (auto-snapshot on file changes)
- [ ] Snapshot scheduling (cron-like)

## Documentation

- [ ] Add installation instructions
- [ ] Add usage examples with screenshots
- [ ] Document iOS scope paths
- [ ] Document Android scope paths
- [ ] Add troubleshooting guide
- [ ] Add API documentation for programmatic use

## Known Issues

1. **frida-remote-stream**: The transfer.ts implementation uses frida-remote-stream but may need adjustment based on actual API
2. **NSFileCoordinator**: Needs testing to verify it works reliably for creating zips
3. **Android ZipOutputStream**: Recursive zipping may fail with deep directory structures
4. **Keychain**: Only captures metadata, not actual secrets (by design, but document this)
5. **Platform detection**: May need improvement for edge cases

## Future Ideas

- Support for other platforms (Windows Phone, HarmonyOS)
- Plugin system for custom data extractors
- Diff filtering (show only certain file types)
- Snapshot tagging and search
- Snapshot comparison across devices
- Integration with CI/CD pipelines
- Web interface for remote access
