import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { FridaClient, detectPlatform, isJailbroken } from '../core/frida-client.js';
import { ensureSnapshotDir, saveMetadata, saveAppData, snapshotExists } from '../core/storage.js';
import { transferZips } from '../core/transfer.js';
import { DEFAULT_SCOPES, type SnapshotMetadata, type OutputFormat } from '@mobile-diff/shared';

interface CreateOptions {
  label: string;
  scopes?: string;
  format?: OutputFormat;
  ssh?: boolean;
}

export function createSnapshotCommand() {
  return new Command('create')
    .description('Create a snapshot of an app')
    .argument('<device>', 'Device ID')
    .argument('<bundle>', 'Bundle/Package ID')
    .requiredOption('-l, --label <label>', 'Snapshot label')
    .option('-s, --scopes <scopes>', 'Comma-separated scopes (default: all)')
    .option('-f, --format <format>', 'Output format (text|json|yaml)', 'text')
    .option('--ssh', 'Use SSH/SCP for transfer (jailbroken devices)')
    .action(async (device: string, bundle: string, options: CreateOptions) => {
      await createSnapshot(device, bundle, options);
    });
}

async function createSnapshot(device: string, bundle: string, options: CreateOptions): Promise<void> {
  const spinner = ora('Initializing...').start();

  try {
    // Check if snapshot already exists
    if (snapshotExists(device, bundle, options.label)) {
      spinner.fail(chalk.red(`Snapshot "${options.label}" already exists`));
      process.exit(1);
    }

    // Detect platform
    spinner.text = 'Detecting platform...';
    const platform = await detectPlatform(device);
    spinner.succeed(chalk.green(`Platform: ${platform}`));

    // Determine transfer method
    let useSSH = options.ssh || false;
    if (!useSSH && platform === 'ios') {
      spinner.start('Checking for jailbreak...');
      const jailbroken = await isJailbroken(device);
      if (jailbroken) {
        useSSH = true;
        spinner.succeed(chalk.green('Jailbroken device detected, using SSH'));
      } else {
        spinner.succeed(chalk.blue('Non-jailbroken device, using Frida transfer'));
      }
    }

    // Parse scopes
    const scopes = options.scopes
      ? options.scopes.split(',').map(s => s.trim())
      : DEFAULT_SCOPES[platform];

    spinner.succeed(chalk.green(`Scopes: ${scopes.join(', ')}`));

    // Connect to device
    spinner.start('Connecting to device...');
    const client = new FridaClient();
    await client.connect(device, bundle, platform);
    spinner.succeed(chalk.green('Connected'));

    // Create snapshot
    spinner.start('Creating snapshot...');
    const result = await client.call<any>('createSnapshot', scopes);
    spinner.succeed(chalk.green('Snapshot created'));

    // Prepare storage
    const snapshotDir = ensureSnapshotDir(device, bundle, options.label);

    // Transfer zip files
    spinner.start('Transferring files...');
    await transferZips(
      client,
      result.zipPaths,
      snapshotDir,
      useSSH,
      device,
      (scope, current, total) => {
        spinner.text = `Transferring files... ${scope} (${current}/${total})`;
      }
    );
    spinner.succeed(chalk.green('Files transferred'));

    // Save app data
    spinner.start('Saving app data...');
    saveAppData(device, bundle, options.label, result.appData, options.format as OutputFormat);
    spinner.succeed(chalk.green('App data saved'));

    // Save metadata
    const metadata: SnapshotMetadata = {
      platform,
      device,
      bundle,
      label: options.label,
      timestamp: result.timestamp,
      scopes,
      totalFiles: 0, // TODO: count files in zips
      totalSize: 0, // TODO: calculate size
    };
    saveMetadata(device, bundle, options.label, metadata);

    // Cleanup
    await client.disconnect();

    console.log(chalk.green.bold(`\n✓ Snapshot "${options.label}" created successfully`));
    console.log(chalk.gray(`Location: ${snapshotDir}`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed: ${error}`));
    process.exit(1);
  }
}
