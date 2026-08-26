import type { ChallengeManager } from '@cicd-lab/simulator';
import chalk from 'chalk';

const levelColors: Record<string, typeof chalk.green> = {
  beginner: chalk.green,
  intermediate: chalk.yellow,
  advanced: chalk.red,
};

const levelIcons: Record<string, string> = {
  beginner: '●',
  intermediate: '●●',
  advanced: '●●●',
};

export function listCommand(manager: ChallengeManager, opts: { level?: string; topic?: string }): void {
  let challenges = manager.getAll();

  if (opts.level) {
    challenges = challenges.filter((c) => c.level === opts.level);
  }
  if (opts.topic) {
    challenges = challenges.filter((c) => c.topic === opts.topic);
  }

  if (challenges.length === 0) {
    console.log(chalk.dim('No challenges found matching your filters.'));
    return;
  }

  console.log(chalk.bold('\n  CI/CD Security Lab — Challenges\n'));

  const grouped = {
    beginner: challenges.filter((c) => c.level === 'beginner'),
    intermediate: challenges.filter((c) => c.level === 'intermediate'),
    advanced: challenges.filter((c) => c.level === 'advanced'),
  };

  for (const [level, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    const color = levelColors[level] || chalk.white;
    console.log(color.bold(`  ${level.toUpperCase()}`));
    for (const c of items) {
      const icon = levelIcons[level] || '';
      console.log(`    ${color(icon)} ${chalk.white(c.id.padEnd(30))} ${chalk.dim(c.title.padEnd(35))} ${chalk.cyan(`${c.points}pts`)} ${chalk.dim(`~${c.estimatedTime}`)}`);
    }
    console.log();
  }

  console.log(chalk.dim(`  ${challenges.length} challenge(s) available\n`));
}
