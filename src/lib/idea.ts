/** The kinds of note the "Suggest a plant or idea" form offers (the same options as the Notion database). */
export const IDEA_KINDS = ['Missing plant', 'Feature idea', 'Something confusing', 'Bug'] as const;
export type IdeaKind = (typeof IDEA_KINDS)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the form and shapes what's sent. A plant name alone is enough for a missing plant. */
export function buildIdea(f: { kind: IdeaKind; plant: string; details: string; email: string; app: string }) {
  const plant = f.kind === 'Missing plant' ? f.plant.trim() : '';
  const details = f.details.trim();
  const email = f.email.trim();
  const emailBad = !!email && !EMAIL.test(email);
  const ok = !emailBad && (details.length >= 3 || plant.length >= 2);
  return { ok, emailBad, body: { type: f.kind, plant, details, email, app: f.app } };
}
