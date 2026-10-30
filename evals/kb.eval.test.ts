import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CASES } from './cases';
import { renderCasesMd } from './render';
import { run } from './run';

/*
 * The knowledge evals (evals/cases.ts). Every `must` case has to pass; `should` cases are scored and the
 * score mustn't drop below SHOULD_BAR. On top of that, no `should` case that passed before may start
 * failing: evals/passing.json lists them, and only grows (UPDATE_PASSING=1 adds newly passing cases).
 * The scorecard prints at the end.
 */

const SHOULD_BAR = 0.8;
const results = CASES.map((c) => ({ c, problem: run(c) }));

describe('knowledge evals', () => {
  it('has unique case ids, each with a reason and a source', () => {
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    for (const c of CASES) {
      expect(c.why.length, c.id).toBeGreaterThan(15);
      expect(c.source.length, c.id).toBeGreaterThan(5);
    }
  });

  for (const { c, problem } of results.filter((r) => r.c.level === 'must')) {
    it(`must: ${c.title}`, () => {
      expect(problem, `${c.id}: ${problem}`).toBeUndefined();
    });
  }

  it('keeps the readable list (evals/CASES.md) in step with the cases', () => {
    const file = join(__dirname, 'CASES.md');
    const md = renderCasesMd(CASES);
    if (process.env.UPDATE_CASES_MD) writeFileSync(file, md);
    expect(existsSync(file) && readFileSync(file, 'utf8') === md, 'evals/CASES.md is out of date: run UPDATE_CASES_MD=1 npx vitest run evals').toBe(true);
  });

  it('never lets a should case that passed before start failing', () => {
    const file = join(__dirname, 'passing.json');
    const before: string[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
    const now = results.filter((r) => r.c.level === 'should' && !r.problem).map((r) => r.c.id);
    const regressed = results.filter((r) => before.includes(r.c.id) && r.problem).map((r) => `${r.c.id}: ${r.problem}`);
    expect(regressed, 'These passed before. Fix the knowledge, or explain the change and have a person approve editing the case.').toEqual([]);
    const gone = before.filter((id) => !CASES.some((c) => c.id === id));
    expect(gone, 'Cases that passed before were removed: removing a case needs a person to approve it').toEqual([]);
    const added = now.filter((id) => !before.includes(id));
    if (process.env.UPDATE_PASSING) writeFileSync(file, JSON.stringify([...before, ...added].sort(), null, 2) + '\n');
    else expect(added, 'Newly passing should cases: run UPDATE_PASSING=1 npx vitest run evals to lock them in').toEqual([]);
  });

  it(`should cases score at least ${SHOULD_BAR * 100}%`, () => {
    const should = results.filter((r) => r.c.level === 'should');
    const passed = should.filter((r) => !r.problem).length;
    expect(passed / should.length, should.filter((r) => r.problem).map((r) => `${r.c.id}: ${r.problem}`).join('\n')).toBeGreaterThanOrEqual(SHOULD_BAR);
  });
});

afterAll(() => {
  const by = (level: string) => results.filter((r) => r.c.level === level);
  const line = (level: string) => `${level}: ${by(level).filter((r) => !r.problem).length}/${by(level).length}`;
  const failing = results.filter((r) => r.problem).map((r) => `  ✗ [${r.c.level}] ${r.c.id}: ${r.problem}`);
  console.log(['', 'Knowledge evals', `  ${line('must')}   ${line('should')}`, ...failing, ''].join('\n'));
});
