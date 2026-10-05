#!/usr/bin/env node

import { Command } from 'commander';
import { ChallengeManager } from '@cicd-lab/simulator';
import { listCommand } from './commands/list.js';
import { startCommand } from './commands/start.js';
import { runCommand } from './commands/run.js';
import { hintCommand } from './commands/hint.js';
import { progressCommand } from './commands/progress.js';
import { validateCommand } from './commands/validate.js';

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
  .option('--exec [mode]', 'Execute steps for real: "host" (this machine, dangerous) or "sandbox" (docker, opt-in). Default: dry-run')
  .action((file, opts) => runCommand(manager, file, opts));

program
  .command('hint <challenge-id> [number]')
  .description('Get a hint for a challenge')
  .action((id, num) => hintCommand(manager, id, num));

program
  .command('progress')
  .description('Show your progress (supports web sync via --export/--import)')
  .option('--export <file>', 'Export progress JSON (web-compatible)')
  .option('--import <file>', 'Import progress JSON (merges, keeps best score)')
  .action((opts) => progressCommand(opts));

program
  .command('validate [challenge-id]')
  .description('Authoring gate: schema + fixtures + evasion audit (used by CI)')
  .action((id) => validateCommand(manager, id));

program.parse();
