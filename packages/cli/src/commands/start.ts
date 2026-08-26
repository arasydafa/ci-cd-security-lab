import fs from 'fs';
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
