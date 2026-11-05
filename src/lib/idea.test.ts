import { describe, expect, it } from 'vitest';
import { buildIdea } from './idea';

const base = { kind: 'Feature idea' as const, plant: '', details: '', email: '', app: 'PlantFam 1.0 · iOS 26' };

describe('buildIdea', () => {
  it('needs a few words, or a plant name for a missing plant', () => {
    expect(buildIdea(base).ok).toBe(false);
    expect(buildIdea({ ...base, details: 'Dark mode widgets' }).ok).toBe(true);
    expect(buildIdea({ ...base, kind: 'Missing plant', plant: 'Dragon fruit' }).ok).toBe(true);
  });

  it('drops the plant field for other kinds and checks the email', () => {
    const b = buildIdea({ ...base, details: 'Hello there', plant: 'Fig', email: 'not-an-email' });
    expect(b.body.plant).toBe('');
    expect(b.emailBad).toBe(true);
    expect(b.ok).toBe(false);
    expect(buildIdea({ ...base, details: 'Hello there', email: ' me@example.com ' }).body.email).toBe('me@example.com');
  });
});
