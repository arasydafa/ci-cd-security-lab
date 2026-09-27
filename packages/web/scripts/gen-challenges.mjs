/**
 * Generates src/data/challenges.generated.ts from the challenges/ source dirs.
 *
 * The static bundle lets the Pages deployment (no backend) serve the
 * challenge list, details, hints, and solutions. Simulation still requires
 * the local API server. Run via `npm run gen-challenges` (also in prebuild).
 *
 * Usage: node scripts/gen-challenges.mjs  (cwd: packages/web)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..');
const repoRoot = path.resolve(webDir, '..', '..');
const challengesDir = path.join(repoRoot, 'challenges');
const outFile = path.join(webDir, 'src', 'data', 'challenges.generated.ts');

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return '';
  }
}

function loadAll() {
  const out = [];
  if (!fs.existsSync(challengesDir)) {
    console.warn(`[gen-challenges] ${challengesDir} not found, emitting empty bundle`);
    return out;
  }
  for (const level of ['beginner', 'intermediate', 'advanced']) {
    const levelDir = path.join(challengesDir, level);
    if (!fs.existsSync(levelDir)) continue;
    const dirs = fs.readdirSync(levelDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const dir of dirs) {
      const base = path.join(levelDir, dir);
      const metaPath = path.join(base, 'challenge.yml');
      if (!fs.existsSync(metaPath)) continue;
      let meta;
      try {
        meta = yaml.load(fs.readFileSync(metaPath, 'utf-8')) || {};
      } catch (e) {
        console.warn(`[gen-challenges] skipping ${dir}: bad yml (${e.message})`);
        continue;
      }
      const hintsDir = path.join(base, 'hints');
      let hints = [];
      if (fs.existsSync(hintsDir)) {
        hints = fs.readdirSync(hintsDir)
          .filter((f) => f.endsWith('.md'))
          .sort()
          .map((f) => readIfExists(path.join(hintsDir, f)));
      }
      out.push({
        id: meta.id || dir,
        title: meta.title || dir,
        level,
        topic: meta.topic || 'github-actions',
        points: meta.points || 100,
        estimatedTime: meta.estimated_time || '15m',
        description: meta.description || '',
        tags: meta.tags || [],
        prerequisites: meta.prerequisites || [],
        objectives: meta.objectives || [],
        references: meta.references || [],
        scenario: readIfExists(path.join(base, 'scenario.md')),
        vulnerableWorkflow: readIfExists(path.join(base, 'vulnerable', 'workflow.yml')),
        solutionWorkflow: readIfExists(path.join(base, 'solution', 'workflow.yml')),
        hints,
        hintsPenalty: (meta.scoring && meta.scoring.hints_used_penalty) || 25,
      });
    }
  }
  return out;
}

const challenges = loadAll();
const body = `/**
 * GENERATED — do not edit by hand.
 * Produced by \`npm run gen-challenges\` from the challenges/ source dirs.
 * Powers the offline (Pages, no backend) fallback.
 */
export interface StaticChallenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  description: string;
  tags: string[];
  prerequisites: string[];
  objectives: string[];
  references: { page: string; label: string }[];
  scenario: string;
  vulnerableWorkflow: string;
  solutionWorkflow: string;
  hints: string[];
  hintsPenalty: number;
}

export const STATIC_CHALLENGES: StaticChallenge[] = ${JSON.stringify(challenges, null, 2)};
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body);
console.log(`[gen-challenges] ${challenges.length} challenges -> ${path.relative(repoRoot, outFile)}`);
