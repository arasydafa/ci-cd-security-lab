import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { ChallengeManager } from './challenges.js';
import { parseChallengeMeta } from './schema.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// dist/ -> package root -> packages -> repo root -> challenges
const CHALLENGES_DIR = path.resolve(HERE, '..', '..', '..', 'challenges');

export interface FixtureRef {
  level: string;
  dir: string;
  /** Declared id (falls back to the directory name when unreadable). */
  id: string;
}

/** Every challenge directory, sorted for deterministic runs. */
export function listFixtures(): FixtureRef[] {
  const out: FixtureRef[] = [];
  for (const level of ['beginner', 'intermediate', 'advanced']) {
    const levelDir = path.join(CHALLENGES_DIR, level);
    if (!fs.existsSync(levelDir)) continue;
    const dirs = fs
      .readdirSync(levelDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const dir of dirs) {
      const metaPath = path.join(levelDir, dir, 'challenge.yml');
      if (!fs.existsSync(metaPath)) continue;
      let id = dir;
      try {
        const meta = yaml.load(fs.readFileSync(metaPath, 'utf-8')) as { id?: unknown };
        if (typeof meta?.id === 'string') id = meta.id;
      } catch {
        // Leave the directory name; auditChallenge reports the parse error.
      }
      out.push({ level, dir, id });
    }
  }
  return out;
}

export interface CosmeticVariant {
  name: string;
  yaml: string;
}

/**
 * Semantics-preserving rewrites. A validation that passes on the original
 * vulnerable workflow but fails on every variant is cosmetic-brittle and
 * must be hardened; a solution variant that newly fails is over-fitted.
 */
export function cosmeticVariants(workflowYaml: string): CosmeticVariant[] {
  const trimmed = workflowYaml.replace(/\s+$/, '');
  return [
    {
      name: 'trailing-comment',
      yaml: `${trimmed}\n# authoring-harness probe: cosmetic comment\n`,
    },
    {
      name: 'renamed-step',
      yaml: workflowYaml.replace(/^(\s*-\s*name:\s*)(.+)$/m, '$1$2 (probe)'),
    },
    {
      name: 'blank-lines',
      yaml: `${trimmed}\n\n   \n`,
    },
  ];
}

export interface ChallengeAudit {
  id: string;
  level: string;
  dir: string;
  schemaOk: boolean;
  /** Human-readable problems (schema, missing files, verdict flips). */
  problems: string[];
  solutionPasses: boolean;
  vulnerableFails: boolean;
}

async function verdict(
  manager: ChallengeManager,
  id: string,
  yamlText: string | undefined,
): Promise<boolean | string> {
  if (yamlText === undefined) return 'missing workflow file';
  try {
    const r = await manager.runSimulation(id, yamlText);
    return r.validation.passed;
  } catch (e) {
    return `simulation error: ${(e as Error).message}`;
  }
}

/** Full authoring audit for one fixture: schema, files, verdicts, evasions. */
export async function auditChallenge(
  manager: ChallengeManager,
  ref: FixtureRef,
): Promise<ChallengeAudit> {
  const problems: string[] = [];
  const base = path.join(CHALLENGES_DIR, ref.level, ref.dir);

  try {
    parseChallengeMeta(yaml.load(fs.readFileSync(path.join(base, 'challenge.yml'), 'utf-8')), `${ref.level}/${ref.dir}/challenge.yml`);
  } catch (e) {
    problems.push(`schema: ${(e as Error).message}`);
  }

  const scenario = path.join(base, 'scenario.md');
  if (!fs.existsSync(scenario) || fs.readFileSync(scenario, 'utf-8').trim().length === 0) {
    problems.push('files: scenario.md missing or empty');
  }
  const hintsDir = path.join(base, 'hints');
  const hintCount =
    fs.existsSync(hintsDir) && fs.statSync(hintsDir).isDirectory()
      ? fs.readdirSync(hintsDir).filter((f) => f.endsWith('.md')).length
      : 0;
  if (hintCount === 0) problems.push('files: no hints/*.md');

  const vulnerable = manager.getVulnerableWorkflow(ref.id);
  const solution = manager.getSolutionWorkflow(ref.id);
  if (vulnerable === undefined) problems.push('files: vulnerable/workflow.yml missing');
  if (solution === undefined) problems.push('files: solution/workflow.yml missing');

  let solutionPasses = false;
  let vulnerableFails = false;
  if (solution !== undefined) {
    const v = await verdict(manager, ref.id, solution);
    solutionPasses = v === true;
    if (v !== true) problems.push(`solution does not pass: ${typeof v === 'string' ? v : 'validation failed'}`);
    for (const variant of cosmeticVariants(solution)) {
      const vv = await verdict(manager, ref.id, variant.yaml);
      if (vv !== true) problems.push(`solution variant "${variant.name}" newly fails (over-fitted check)`);
    }
  }
  if (vulnerable !== undefined) {
    const v = await verdict(manager, ref.id, vulnerable);
    vulnerableFails = v === false;
    if (v !== false) problems.push(`vulnerable does not fail: ${typeof v === 'string' ? v : 'validation passed'}`);
    for (const variant of cosmeticVariants(vulnerable)) {
      const vv = await verdict(manager, ref.id, variant.yaml);
      if (vv !== false) problems.push(`vulnerable variant "${variant.name}" wrongly passes (evadable check)`);
    }
  }

  return {
    id: ref.id,
    level: ref.level,
    dir: ref.dir,
    schemaOk: !problems.some((p) => p.startsWith('schema:')),
    problems,
    solutionPasses,
    vulnerableFails,
  };
}

/** Audit every fixture; returns only the failing ones. */
export async function auditAll(manager?: ChallengeManager): Promise<ChallengeAudit[]> {
  const mgr = manager || new ChallengeManager();
  const failures: ChallengeAudit[] = [];
  for (const ref of listFixtures()) {
    const audit = await auditChallenge(mgr, ref);
    if (audit.problems.length > 0) failures.push(audit);
  }
  return failures;
}
