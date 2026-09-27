/**
 * Offline fallback for static hosting (GitHub Pages has no API server).
 *
 * Shapes mirror the API responses (`{ data }` envelope is added by callers),
 * so pages can swap sources without touching render logic. Simulation and
 * scoring stay server-side only — the UI must say so instead of faking it.
 */
import { STATIC_CHALLENGES } from './challenges.generated.js';

export interface ChallengeRef {
  page: string;
  label: string;
}

export interface StaticListItem {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  tags: string[];
  prerequisites: string[];
  objectives: string[];
  references: ChallengeRef[];
}

export interface StaticDetail extends StaticListItem {
  description: string;
  scenario: string;
  vulnerableWorkflow: string;
  hintCount: number;
  scoring: { hints_used_penalty: number; time_bonus: number };
}

export interface ProgressEntry {
  attempts: number;
  hintsUsed: number;
  bestScore: number;
  completed: boolean;
  completedAt?: string;
  solutionViewed?: boolean;
  /** First engagement (hint, run, or solution view) — basis for time_bonus. */
  startedAt?: string;
}

export type ProgressData = Record<string, ProgressEntry>;

export function isCleanSolve(e?: ProgressEntry): boolean {
  return !!e?.completed && (e.hintsUsed || 0) === 0 && !e.solutionViewed;
}

export function solvedWithSolution(e?: ProgressEntry): boolean {
  return !!e?.completed && !!e?.solutionViewed;
}

const toListItem = (c: (typeof STATIC_CHALLENGES)[number]): StaticListItem => ({
  id: c.id,
  title: c.title,
  level: c.level,
  topic: c.topic,
  points: c.points,
  estimatedTime: c.estimatedTime,
  tags: c.tags || [],
  prerequisites: (c as { prerequisites?: string[] }).prerequisites || [],
  objectives: (c as { objectives?: string[] }).objectives || [],
  references: (c as { references?: ChallengeRef[] }).references || [],
});

export function staticList(level = '', topic = ''): StaticListItem[] {
  return STATIC_CHALLENGES.filter(
    (c) => (!level || c.level === level) && (!topic || c.topic === topic),
  ).map(toListItem);
}

export function staticDetail(id: string): StaticDetail | undefined {
  const c = STATIC_CHALLENGES.find((c) => c.id === id);
  if (!c) return undefined;
  return {
    ...toListItem(c),
    description: c.description,
    scenario: c.scenario,
    vulnerableWorkflow: c.vulnerableWorkflow,
    hintCount: c.hints.length,
    scoring: { hints_used_penalty: c.hintsPenalty, time_bonus: 50 },
  };
}

export function staticHint(id: string, num: number): string | undefined {
  const c = STATIC_CHALLENGES.find((c) => c.id === id);
  return c?.hints[num - 1];
}

export function staticSolution(id: string): string | undefined {
  return STATIC_CHALLENGES.find((c) => c.id === id)?.solutionWorkflow || undefined;
}

const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

function byLevelThenId(a: StaticListItem, b: StaticListItem): number {
  return (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || a.id.localeCompare(b.id);
}

/** Entry-level challenges (no prerequisites), beginner first. */
export function entryChallenges(): StaticListItem[] {
  return STATIC_CHALLENGES.map(toListItem)
    .filter((c) => c.prerequisites.length === 0)
    .sort(byLevelThenId);
}

/** Challenges that list `id` as a prerequisite — the "Next up" from here. */
export function dependentsOf(id: string): StaticListItem[] {
  return STATIC_CHALLENGES.map(toListItem)
    .filter((c) => c.prerequisites.includes(id))
    .sort(byLevelThenId);
}

/**
 * First uncompleted challenge whose prerequisites are all completed.
 * Gives new learners a deterministic "start here / continue here".
 */
export function nextUp(progress: ProgressData): StaticListItem | undefined {
  const done = new Set(
    Object.entries(progress).filter(([, p]) => p.completed).map(([id]) => id),
  );
  return STATIC_CHALLENGES.map(toListItem)
    .sort(byLevelThenId)
    .find((c) => !done.has(c.id) && c.prerequisites.every((p) => done.has(p)));
}

/**
 * Related challenges ordered: same topic first, then same level,
 * then the rest — stable by id. Excludes the current challenge.
 */
export function relatedTo(id: string, limit = 4): StaticListItem[] {
  const all = STATIC_CHALLENGES.map(toListItem);
  const cur = all.find((c) => c.id === id);
  if (!cur) return [];
  const score = (c: StaticListItem): number => {
    if (c.topic === cur.topic && c.level === cur.level) return 0;
    if (c.topic === cur.topic) return 1;
    if (c.level === cur.level) return 2;
    return 3;
  };
  return all
    .filter((c) => c.id !== id)
    .sort((a, b) => score(a) - score(b) || byLevelThenId(a, b))
    .slice(0, limit);
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem('cicd-lab-progress');
    return raw ? (JSON.parse(raw) as ProgressData) : {};
  } catch {
    return {};
  }
}

export function saveProgress(data: ProgressData): void {
  localStorage.setItem('cicd-lab-progress', JSON.stringify(data));
}
