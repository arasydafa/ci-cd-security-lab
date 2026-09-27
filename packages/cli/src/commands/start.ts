import type { ChallengeManager } from '@cicd-lab/simulator';
import chalk from 'chalk';

export function startCommand(manager: ChallengeManager, challengeId: string): void {
  const challenge = manager.getById(challengeId);

  if (!challenge) {
    console.log(chalk.red(`\n  Challenge "${challengeId}" not found.\n`));
    console.log(chalk.dim('  Run "cicd-lab list" to see available challenges.\n'));
    return;
  }

  const scenario = manager.getScenario(challengeId);
  const workflow = manager.getVulnerableWorkflow(challengeId);

  console.log(chalk.bold(`\n  ${challenge.title}`));
  console.log(chalk.dim(`  Level: ${challenge.level} | Topic: ${challenge.topic} | Points: ${challenge.points} | Time: ~${challenge.estimatedTime}\n`));

  if (challenge.prerequisites.length > 0) {
    console.log(chalk.bold('  ─── Prerequisites ───'));
    for (const p of challenge.prerequisites) {
      const pre = manager.getById(p);
      console.log(chalk.dim(`    • ${p}${pre ? ` — ${pre.title}` : ''}`));
    }
    console.log();
  } else {
    console.log(chalk.dim('  Entry-level — no prerequisites. Start here.\n'));
  }

  if (challenge.objectives.length > 0) {
    console.log(chalk.bold('  ─── Objectives ───'));
    for (const o of challenge.objectives) {
      console.log(`    • ${o}`);
    }
    console.log();
  }

  if (challenge.references.length > 0) {
    console.log(chalk.bold('  ─── References ───'));
    for (const r of challenge.references) {
      console.log(chalk.dim(`    • ${r.label} (/reference/${r.page})`));
    }
    console.log();
  }

  // Next up: challenges that list this one as a prerequisite.
  const next = manager.getAll().filter((c) => c.prerequisites.includes(challengeId));
  if (next.length > 0) {
    console.log(chalk.bold('  ─── Next up ───'));
    for (const n of next) {
      console.log(chalk.dim(`    • ${n.id} — ${n.title}`));
    }
    console.log();
  }

  if (scenario) {
    console.log(chalk.bold('  ─── Scenario ───'));
    const lines = scenario.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log();
  }

  if (workflow) {
    console.log(chalk.bold('  ─── Vulnerable Workflow ───'));
    const lines = workflow.split('\n');
    for (const line of lines) {
      console.log(chalk.dim(`  ${line}`));
    }
    console.log();
  }

  console.log(chalk.dim('  Commands:'));
  console.log(chalk.dim(`    cicd-lab hint ${challengeId} 1     Get hint 1`));
  console.log(chalk.dim(`    cicd-lab run -c ${challengeId}    Run simulation`));
  console.log(chalk.dim(`    cicd-lab run -c ${challengeId} fixed.yml  Run your fix\n`));
}
