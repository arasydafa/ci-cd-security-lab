#!/usr/bin/env node

import { Command } from 'commander';
import { ChallengeManager } from '@cicd-lab/simulator';
import { listCommand } from './commands/list.js';
import { startCommand } from './commands/start.js';
import { runCommand } from './commands/run.js';
import { hintCommand } from './commands/hint.js';
import { progressCommand } from './commands/progress.js';

const program = new Command();
const manager = new ChallengeManager();

program
  .name('cicd-lab')
  .description('CI/CD Security Learning Lab - simulate, learn, and master pipeline security')
  .version('2.0.0');

program
  .command('list')
  .description('List available challenges')
  .option('-l, --level <level>', 'Filter by level (beginner, intermediate, advanced)')
  .option('-t, --topic <topic>', 'Filter by topic (github-actions, docker, kubernetes, terraform)')
  .action((opts) => listCommand(manager, opts));

program
  .command('start <challenge-id>')
  .description('Start a challenge and show its scenario')
  .action((id) => startCommand(manager, id));

program
  .command('run [file]')
  .description('Run a workflow simulation (default: vulnerable workflow of current challenge)')
  .option('-c, --challenge <id>', 'Challenge ID to run')
  .action((file, opts) => runCommand(manager, file, opts));

program
  .command('hint <challenge-id> [number]')
  .description('Get a hint for a challenge')
  .action((id, num) => hintCommand(manager, id, num));

program
  .command('progress')
  .description('Show your progress')
  .action(() => progressCommand());

program.parse();
