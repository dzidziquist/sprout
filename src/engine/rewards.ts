import type { Badge } from './streak';

/*
 * Gifts you grow into. PlantFam is free with no tips switched on, so the cosmetic extras that
 * used to thank tippers are earned by caring for plants instead: each unlocks at a number of
 * milestones. (A tip, if tips are ever switched on, unlocks them all at once.)
 */

export type RewardId = 'gold' | 'party' | 'icons' | 'medal';

export interface Reward {
  id: RewardId;
  title: string;
  body: string;
  /** For "2 more milestones to …". */
  short: string;
  /** Milestones needed. */
  needs: number;
}

export const REWARDS: Reward[] = [
  { id: 'gold', title: 'Gold plant cards', body: 'Give any plant a sparkly gold card in Edit plant.', short: 'gold cards', needs: 3 },
  { id: 'party', title: 'A party buddy', body: 'The plant on your Support card (Me tab) swaps for a pothos in a party hat, confetti and all.', short: 'your party buddy', needs: 5 },
  { id: 'icons', title: 'Four extra app icons', body: 'Night, Cactus, Sunny or Party, in Settings → App icon.', short: 'extra app icons', needs: 7 },
  { id: 'medal', title: 'The PlantFam gold medal', body: 'A gold medal joins your milestones.', short: 'the gold medal', needs: 10 },
];

export interface RewardState {
  unlocked: boolean;
  /** When it unlocked: the date of the milestone that tipped it over. */
  at?: string;
}

export type Rewards = Record<RewardId, RewardState> & { earned: number };

export function rewardsFor(badges: Badge[], opts: { supporter?: boolean; supporterSince?: string } = {}): Rewards {
  const dates = badges.map((b) => b.earnedAt).filter((d): d is string => !!d).sort();
  const out = { earned: dates.length } as Rewards;
  for (const r of REWARDS) {
    const at = dates[r.needs - 1];
    if (at) out[r.id] = { unlocked: true, at };
    else if (opts.supporter) out[r.id] = { unlocked: true, at: opts.supporterSince };
    else out[r.id] = { unlocked: false };
  }
  return out;
}
