/**
 * Offline fallback for static hosting (GitHub Pages has no API server).
 *
 * Shapes mirror the API responses (`{ data }` envelope is added by callers),
 * so pages can swap sources without touching render logic. Simulation and
 * scoring stay server-side only — the UI must say so instead of faking it.
 */
import { STATIC_CHALLENGES } from './challenges.generated.js';

export interface StaticListItem {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  tags: string[];
}

export interface StaticDetail extends StaticListItem {
  description: string;
  scenario: string;
  vulnerableWorkflow: string;
  hintCount: number;
  scoring: { hints_used_penalty: number; time_bonus: number };
}

const toListItem = (c: (typeof STATIC_CHALLENGES)[number]): StaticListItem => ({
  id: c.id,
  title: c.title,
  level: c.level,
  topic: c.topic,
  points: c.points,
  estimatedTime: c.estimatedTime,
  tags: c.tags,
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
