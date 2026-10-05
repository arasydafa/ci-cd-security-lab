import { ChallengeManager, auditAll, auditChallenge, listFixtures } from '@cicd-lab/simulator';
import chalk from 'chalk';

function printAudit(id: string, problems: string[]): void {
  if (problems.length === 0) {
    console.log(chalk.green(`  ✓ ${id}`));
    return;
  }
  console.log(chalk.red(`  ✗ ${id}`));
  for (const p of problems) {
    console.log(chalk.dim(`    - ${p}`));
  }
}

/**
 * Authoring gate: schema + fixture files + solution/vulnerable verdicts +
 * cosmetic-evasion sweep. Exits non-zero when any challenge is evadable or
 * incomplete — this is what CI runs to reject weak challenges.
 */
export async function validateCommand(manager: ChallengeManager, challengeId?: string): Promise<void> {
  if (challengeId) {
    const ref = listFixtures().find((f) => f.id === challengeId);
    if (!ref) {
      console.log(chalk.red(`\n  Challenge "${challengeId}" not found.\n`));
      process.exitCode = 1;
      return;
    }
    console.log(chalk.bold(`\n  Validating "${challengeId}"\n`));
    const audit = await auditChallenge(manager, ref);
    printAudit(audit.id, audit.problems);
    console.log();
    process.exitCode = audit.problems.length > 0 ? 1 : 0;
    return;
  }

  console.log(chalk.bold('\n  Validating all challenges (schema + fixtures + evasions)\n'));
  const failures = await auditAll(manager);
  const total = listFixtures().length;
  for (const f of failures) {
    printAudit(f.id, f.problems);
  }
  if (failures.length === 0) {
    console.log(chalk.green(`  All ${total} challenges valid and evasion-resistant.\n`));
  } else {
    console.log(chalk.red(`\n  ${failures.length}/${total} challenges failing.\n`));
    process.exitCode = 1;
  }
}
