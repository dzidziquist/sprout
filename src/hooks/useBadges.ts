import { useMemo } from 'react';
import { usePlantStore } from '@/store/plantStore';
import { useDay } from '@/hooks/useDay';
import { badgesFor, computeStreak, medalBadge } from '@/engine/streak';
import { rewardsFor } from '@/engine/rewards';

/** The streak and every milestone, with the gold medal in front once it's earned. */
export function useBadges() {
  const plants = usePlantStore((s) => s.plants);
  const events = usePlantStore((s) => s.events);
  const climate = usePlantStore((s) => s.profile.climate);
  const supporter = usePlantStore((s) => s.profile.supporter);
  const supporterSince = usePlantStore((s) => s.profile.supporterSince);
  const trips = usePlantStore((s) => s.profile.trips);
  // The week (and what's overdue) moves on at midnight even when nothing else changes.
  const day = useDay();
  return useMemo(() => {
    const input = { plants, events, climate, now: new Date(), trips };
    const streak = computeStreak(input);
    const core = badgesFor(input, streak);
    const medal = medalBadge(rewardsFor(core, { supporter, supporterSince }).medal.at);
    return { streak, badges: medal ? [medal, ...core] : core };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants, events, climate, supporter, supporterSince, trips, day]);
}
