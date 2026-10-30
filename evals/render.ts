import type { EvalCase } from './cases';
import { CAUSES, SYMPTOMS } from '../src/data/diagnosis';

/** evals/CASES.md: the cases in plain words, for the person who approves them. */

const cause = (id: string) => CAUSES[id]?.title ?? id;
const symptom = (id: string) => SYMPTOMS.find((s) => s.id === id)?.label ?? id;
const JOBS: Record<string, string> = { 'stage-potash': 'High-potash feed (every 10–14 days)', 'stage-potash-slow': 'High-potash feed, half strength every 2 weeks', 'stage-pollinate': 'Shake the flowers' };
const job = (id: string) => JOBS[id] ?? id;

function expectation(c: EvalCase): string {
  switch (c.kind) {
    case 'diagnose': {
      const parts = [`Picks **${symptom(c.symptom)}**.`];
      if (c.top1) parts.push(`First possible cause: **${cause(c.top1)}**.`);
      if (c.inTop3?.length) parts.push(`Shown among the causes: ${c.inTop3.map((id) => `**${cause(id)}**`).join(', ')}.`);
      if (c.notTop1?.length) parts.push(`Never first: ${c.notTop1.map(cause).join(', ')}.`);
      if (c.absent?.length) parts.push(`Never shown: ${c.absent.map(cause).join(', ')}.`);
      return parts.join(' ');
    }
    case 'feed':
      return `Feeding advice says: "${c.advice.source.replace(/^\^/, '').replace(/\\/g, '').replace(/\(\?:|\(|\)/g, '').replace(/\|/g, '" or "')}"`;
    case 'mix':
      if (c.name !== undefined) return c.kind_ ? `Recognised as **${c.kind_ === 'organic' ? 'rich organic' : c.kind_ === 'slow' ? 'slow-release' : 'no fertiliser'}**.` : 'Not recognised (no guessing).';
      return `Feed reminders wait **${c.weeks} weeks**.`;
    case 'tasks': {
      const parts: string[] = [];
      if (c.has?.length) parts.push(`Grow jobs include: ${c.has.map((id) => `**${job(id)}**`).join(', ')}.`);
      if (c.hasNot?.length) parts.push(`No ${c.hasNot.map(job).join(' or ')}.`);
      return parts.join(' ');
    }
  }
}

const SECTIONS: [EvalCase['kind'], string][] = [
  ['diagnose', 'Plant doctor'],
  ['feed', 'Feeding advice'],
  ['mix', 'Potting mixes'],
  ['tasks', 'Grow patch jobs'],
];

export function renderCasesMd(cases: EvalCase[]): string {
  const out = [
    '# Knowledge eval cases',
    '',
    'What PlantFam must (or should) answer in each situation. Every knowledge change is tested against these',
    '(`npm test`); a **must** case failing blocks the change. Generated from `evals/cases.ts`: to change a case,',
    'edit that file, then run `UPDATE_CASES_MD=1 npx vitest run evals` to refresh this list.',
    '',
    `${cases.filter((c) => c.level === 'must').length} must, ${cases.filter((c) => c.level === 'should').length} should.`,
    '',
  ];
  for (const [kind, heading] of SECTIONS) {
    const list = cases.filter((c) => c.kind === kind);
    if (!list.length) continue;
    out.push(`## ${heading}`, '');
    for (const c of list) {
      out.push(`### ${c.title}`, '', `${c.level === 'must' ? '**Must**' : 'Should'}. ${expectation(c)}`, '', `Why: ${c.why}`, '', `Source: ${/^https?:/.test(c.source) ? `<${c.source}>` : c.source} · \`${c.id}\``, '');
    }
  }
  return out.join('\n');
}
