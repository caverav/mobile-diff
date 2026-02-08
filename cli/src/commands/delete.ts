import { Command } from 'commander';
import chalk from 'chalk';
import { deleteSnapshot, snapshotExists } from '../core/storage.js';

export function deleteSnapshotCommand() {
  return new Command('delete')
    .description('Delete a snapshot')
    .argument('<device>', 'Device ID')
    .argument('<bundle>', 'Bundle/Package ID')
    .argument('<label>', 'Snapshot label')
    .action(async (device: string, bundle: string, label: string) => {
      await deleteSnapshotAction(device, bundle, label);
    });
}

async function deleteSnapshotAction(device: string, bundle: string, label: string): Promise<void> {
  try {
    if (!snapshotExists(device, bundle, label)) {
      console.log(chalk.yellow(`Snapshot "${label}" not found`));
      process.exit(1);
    }

    deleteSnapshot(device, bundle, label);
    console.log(chalk.green(`✓ Snapshot "${label}" deleted`));
  } catch (error) {
    console.error(chalk.red(`Failed: ${error}`));
    process.exit(1);
  }
}
