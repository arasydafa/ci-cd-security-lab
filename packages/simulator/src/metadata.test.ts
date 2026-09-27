import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHALLENGES = path.resolve(__dirname, '..', '..', '..', 'challenges');

const VALID_PAGES = new Set([
  'github-actions',
  'docker',
  'kubernetes',
  'terraform',
  'monitoring',
]);

interface Meta {
  id: string;
  prerequisites?: string[];
  objectives?: string[];
  references?: { page: string; label: string }[];
}

function loadAll(): { level: string; dir: string; meta: Meta }[] {
  const out: { level: string; dir: string; meta: Meta }[] = [];
  for (const level of ['beginner', 'intermediate', 'advanced']) {
    const levelDir = path.join(CHALLENGES, level);
    for (const dir of fs.readdirSync(levelDir).filter((d) => fs.statSync(path.join(levelDir, d)).isDirectory())) {
      const meta = yaml.load(fs.readFileSync(path.join(levelDir, dir, 'challenge.yml'), 'utf8')) as Meta;
      out.push({ level, dir, meta });
    }
  }
  return out;
}

describe('challenge metadata', () => {
  it('every challenge has objectives', () => {
    for (const { meta } of loadAll()) {
      assert.ok(
        Array.isArray(meta.objectives) && meta.objectives.length >= 2,
        `${meta.id}: needs at least 2 objectives`,
      );
      for (const o of meta.objectives || []) {
        assert.ok(typeof o === 'string' && o.length > 10, `${meta.id}: objective too short`);
      }
    }
  });

  it('prerequisites resolve, never self-reference, and form no cycles', () => {
    const all = loadAll();
    const ids = new Set(all.map((c) => c.meta.id));
    for (const { meta } of all) {
      for (const p of meta.prerequisites || []) {
        assert.ok(ids.has(p), `${meta.id}: dangling prerequisite ${p}`);
        assert.notEqual(p, meta.id, `${meta.id}: self prerequisite`);
      }
    }
    // Cycle check via DFS.
    const edges = new Map(all.map((c) => [c.meta.id, c.meta.prerequisites || []]));
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string, trail: string[]): void => {
      if (done.has(id)) return;
      assert.ok(!visiting.has(id), `prerequisite cycle: ${[...trail, id].join(' -> ')}`);
      visiting.add(id);
      for (const next of edges.get(id) || []) visit(next, [...trail, id]);
      visiting.delete(id);
      done.add(id);
    };
    for (const id of ids) visit(id, []);
  });

  it('references point at real guide pages with labels', () => {
    for (const { meta } of loadAll()) {
      assert.ok(
        Array.isArray(meta.references) && meta.references.length >= 1,
        `${meta.id}: needs at least 1 reference`,
      );
      for (const r of meta.references || []) {
        assert.ok(VALID_PAGES.has(r.page), `${meta.id}: unknown reference page ${r.page}`);
        assert.ok(typeof r.label === 'string' && r.label.length > 0, `${meta.id}: reference needs label`);
      }
    }
  });
});
