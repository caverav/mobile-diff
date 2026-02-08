import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { listSnapshots } from '../core/storage.js';

export function listSnapshotsCommand() {
  return new Command('list')
    .description('List all snapshots for an app')
    .argument('<device>', 'Device ID')
    .argument('<bundle>', 'Bundle/Package ID')
    .action(async (device: string, bundle: string) => {
      await listSnapshotsAction(device, bundle);
    });
}

async function listSnapshotsAction(device: string, bundle: string): Promise<void> {
  try {
    const snapshots = listSnapshots(device, bundle);

    if (snapshots.length === 0) {
      console.log(chalk.yellow('No snapshots found'));
      return;
    }

    const data = [
      [
        chalk.bold('Label'),
        chalk.bold('Platform'),
        chalk.bold('Timestamp'),
        chalk.bold('Scopes'),
      ],
      ...snapshots.map(s => [
        chalk.cyan(s.label),
        s.platform,
        new Date(s.timestamp).toLocaleString(),
        s.scopes.join(', '),
      ]),
    ];

    console.log(table(data, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼',
      },
    }));

    console.log(chalk.gray(`Total: ${snapshots.length} snapshot(s)`));
  } catch (error) {
    console.error(chalk.red(`Failed: ${error}`));
    process.exit(1);
  }
}
