#!/usr/bin/env node

import { Command } from 'commander';
import { createSnapshotCommand } from './commands/create.js';
import { listSnapshotsCommand } from './commands/list.js';
import { diffSnapshotsCommand } from './commands/diff.js';
import { deleteSnapshotCommand } from './commands/delete.js';

const program = new Command();

program
  .name('mobile-diff')
  .description('Snapshot and compare mobile app file systems')
  .version('0.1.0');

program
  .command('snapshot')
  .description('Manage snapshots')
  .addCommand(createSnapshotCommand())
  .addCommand(listSnapshotsCommand())
  .addCommand(diffSnapshotsCommand())
  .addCommand(deleteSnapshotCommand());

program.parse();
