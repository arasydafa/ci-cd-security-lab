import fs from 'fs';
import type { ChallengeManager } from '@cicd-lab/simulator';
import chalk from 'chalk';

export async function runCommand(
  manager: ChallengeManager,
  file: string | undefined,
  opts: { challenge?: string }
): Promise<void> {
  const challengeId = opts.challenge;

  if (!challengeId && !file) {
    console.log(chalk.red('\n  Provide a challenge ID with -c <id> or a YAML file path.\n'));
    console.log(chalk.dim('  Examples:'));
    console.log(chalk.dim('    cicd-lab run -c secrets-leak'));
    console.log(chalk.dim('    cicd-lab run fixed.yml -c secrets-leak\n'));
    return;
  }

  let workflowYaml: string | undefined;

  if (file) {
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`\n  File "${file}" not found.\n`));
      return;
    }
    workflowYaml = fs.readFileSync(file, 'utf-8');
  }

  console.log(chalk.bold('\n  Running simulation...\n'));

  try {
    const result = await manager.runSimulation(challengeId || '', workflowYaml);

    // Print execution logs
    for (const log of result.result.logs) {
      console.log(chalk.dim(`  ${log}`));
    }
    console.log();

    // Print findings
    if (result.result.findings.length > 0) {
      console.log(chalk.bold('  ─── Security Findings ───'));
      for (const finding of result.result.findings) {
        const icon = finding.severity === 'critical' ? chalk.red('!!') :
          finding.severity === 'high' ? chalk.red('!') :
          finding.severity === 'medium' ? chalk.yellow('!') :
          chalk.dim('-');
        console.log(`  ${icon} [${finding.severity.toUpperCase()}] ${finding.message}`);
        if (finding.remediation) {
          console.log(chalk.dim(`    → ${finding.remediation}`));
        }
      }
      console.log();
    }

    // Print validation
    console.log(chalk.bold('  ─── Validation ───'));
    for (const check of result.validation.checks) {
      const icon = check.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${icon} ${check.description}`);
      if (check.message) {
        console.log(chalk.dim(`    ${check.message}`));
      }
    }
    console.log();

    if (result.validation.passed) {
      console.log(chalk.green.bold('  ✓ Challenge PASSED!\n'));
    } else {
      console.log(chalk.red.bold('  ✗ Challenge FAILED — fix the issues above and try again.\n'));
    }
  } catch (error) {
    console.log(chalk.red(`\n  Error: ${(error as Error).message}\n`));
  }
}
