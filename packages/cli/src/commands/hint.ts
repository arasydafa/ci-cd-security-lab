import type { ChallengeManager } from '@cicd-lab/simulator';
import chalk from 'chalk';

export function hintCommand(manager: ChallengeManager, challengeId: string, hintNum?: string): void {
  const challenge = manager.getById(challengeId);

  if (!challenge) {
    console.log(chalk.red(`\n  Challenge "${challengeId}" not found.\n`));
    return;
  }

  if (!hintNum) {
    console.log(chalk.bold(`\n  Hints for "${challenge.title}"`));
    console.log(chalk.dim(`  ${challenge.paths.hints.length} hint(s) available\n`));
    for (let i = 0; i < challenge.paths.hints.length; i++) {
      console.log(chalk.dim(`    cicd-lab hint ${challengeId} ${i + 1}`));
    }
    console.log();
    return;
  }

  const index = parseInt(hintNum, 10) - 1;
  const hint = manager.getHint(challengeId, index);

  if (!hint) {
    console.log(chalk.red(`\n  Hint ${hintNum} not available. ${challenge.paths.hints.length} hint(s) exist.\n`));
    return;
  }

  console.log(chalk.bold(`\n  Hint ${hintNum} for "${challenge.title}"\n`));
  const lines = hint.split('\n');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(chalk.dim(`\n  (Using hints reduces your score by ${challenge.scoring.hints_used_penalty} points each)\n`));
}
