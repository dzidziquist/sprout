import { useMemo } from 'react';
import { badgesFor } from '@/engine/streak';
import { rewardsFor, type Rewards } from '@/engine/rewards';
import { usePlantStore } from '@/store/plantStore';

/** Which gifts this fam has grown into. Recomputed only when plants, care or climate change. */
export function useRewards(): Rewards {
  const plants = usePlantStore((s) => s.plants);
  const events = usePlantStore((s) => s.events);
  const climate = usePlantStore((s) => s.profile.climate);
  const supporter = usePlantStore((s) => s.profile.supporter);
  const supporterSince = usePlantStore((s) => s.profile.supporterSince);
  return useMemo(
    () => rewardsFor(badgesFor({ plants, events, climate, now: new Date() }), { supporter, supporterSince }),
    [plants, events, climate, supporter, supporterSince],
  );
}
