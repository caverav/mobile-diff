import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getSnapshotDir, loadMetadata } from '../core/storage.js';

const execAsync = promisify(exec);

interface DiffOptions {
  tool?: string;
  color?: boolean;
  unified?: number;
}

export function diffSnapshotsCommand() {
  return new Command('diff')
    .description('Compare two snapshots')
    .argument('<device>', 'Device ID')
    .argument('<bundle>', 'Bundle/Package ID')
    .argument('<before>', 'Before snapshot label')
    .argument('<after>', 'After snapshot label')
    .option('-t, --tool <tool>', 'Diff tool (diff|git)', 'diff')
    .option('--no-color', 'Disable colored output')
    .option('-u, --unified <lines>', 'Number of context lines', '3')
    .action(async (device: string, bundle: string, before: string, after: string, options: DiffOptions) => {
      await diffSnapshots(device, bundle, before, after, options);
    });
}

async function diffSnapshots(
  device: string,
  bundle: string,
  before: string,
  after: string,
  options: DiffOptions
): Promise<void> {
  try {
    // Load metadata
    const beforeMeta = loadMetadata(device, bundle, before);
    const afterMeta = loadMetadata(device, bundle, after);

    console.log(chalk.bold(`\nComparing snapshots:`));
    console.log(chalk.gray(`  Before: ${before} (${new Date(beforeMeta.timestamp).toLocaleString()})`));
    console.log(chalk.gray(`  After:  ${after} (${new Date(afterMeta.timestamp).toLocaleString()})`));
    console.log();

    const beforeDir = getSnapshotDir(device, bundle, before);
    const afterDir = getSnapshotDir(device, bundle, after);

    // Extract zips if needed
    await extractZipsIfNeeded(beforeDir, beforeMeta.scopes);
    await extractZipsIfNeeded(afterDir, afterMeta.scopes);

    // Compare each scope
    for (const scope of beforeMeta.scopes) {
      if (!afterMeta.scopes.includes(scope)) {
        console.log(chalk.yellow(`⚠ Scope "${scope}" only exists in before snapshot`));
        continue;
      }

      console.log(chalk.bold.cyan(`\n=== ${scope} ===\n`));

      const beforeExtracted = join(beforeDir, 'extracted', scope);
      const afterExtracted = join(afterDir, 'extracted', scope);

      if (!existsSync(beforeExtracted) || !existsSync(afterExtracted)) {
        console.log(chalk.gray('(No extracted files found)'));
        continue;
      }

      // Run diff
      await runDiff(beforeExtracted, afterExtracted, options);
    }

    // Compare app data
    console.log(chalk.bold.cyan(`\n=== App Data ===\n`));
    await compareAppData(beforeDir, afterDir);

  } catch (error) {
    console.error(chalk.red(`Failed: ${error}`));
    process.exit(1);
  }
}

async function extractZipsIfNeeded(snapshotDir: string, scopes: string[]): Promise<void> {
  const extractedDir = join(snapshotDir, 'extracted');

  for (const scope of scopes) {
    const zipPath = join(snapshotDir, `${scope}.zip`);
    const targetDir = join(extractedDir, scope);

    if (!existsSync(zipPath)) {
      continue;
    }

    if (existsSync(targetDir)) {
      continue; // Already extracted
    }

    mkdirSync(targetDir, { recursive: true });

    try {
      await execAsync(`unzip -q "${zipPath}" -d "${targetDir}"`);
    } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to extract ${scope}.zip: ${error}`));
    }
  }
}

async function runDiff(beforeDir: string, afterDir: string, options: DiffOptions): Promise<void> {
  const colorFlag = options.color !== false ? '--color=always' : '';
  const unifiedFlag = `-u${options.unified || 3}`;

  let command: string;

  if (options.tool === 'git') {
    command = `git diff --no-index ${colorFlag} ${beforeDir} ${afterDir}`;
  } else {
    command = `diff -r ${unifiedFlag} ${colorFlag} ${beforeDir} ${afterDir}`;
  }

  try {
    const { stdout } = await execAsync(command);
    if (stdout) {
      console.log(stdout);
    } else {
      console.log(chalk.gray('No differences found'));
    }
  } catch (error: any) {
    if (error.code === 1) {
      // diff returns 1 when differences are found
      console.log(error.stdout);
    } else {
      throw error;
    }
  }
}

async function compareAppData(beforeDir: string, afterDir: string): Promise<void> {
  const files = ['userdefaults.txt', 'sharedpreferences.txt', 'cookies.txt', 'keychain.txt', 'pasteboard.txt', 'databases.txt'];

  for (const file of files) {
    const beforeFile = join(beforeDir, file);
    const afterFile = join(afterDir, file);

    if (!existsSync(beforeFile) && !existsSync(afterFile)) {
      continue;
    }

    console.log(chalk.bold(`\n--- ${file} ---\n`));

    if (!existsSync(beforeFile)) {
      console.log(chalk.green('(File added in after snapshot)'));
      continue;
    }

    if (!existsSync(afterFile)) {
      console.log(chalk.red('(File removed in after snapshot)'));
      continue;
    }

    try {
      const { stdout } = await execAsync(`diff -u "${beforeFile}" "${afterFile}"`);
      console.log(chalk.gray('No differences'));
    } catch (error: any) {
      if (error.code === 1) {
        console.log(error.stdout);
      } else {
        console.error(chalk.yellow(`Failed to diff ${file}: ${error.message}`));
      }
    }
  }
}
