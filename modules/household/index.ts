import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

/** One record in the shared jungle (see src/engine/household for what's inside). */
export interface WireItem {
  id: string;
  kind: string;
  json: string;
  /** When it was last changed, ms. */
  at: number;
}

export interface Changes {
  items?: WireItem[];
  deleted?: string[];
  /** Diary photo file names now on the phone. */
  photos?: string[];
  token?: string | null;
  /** The change token was too old: fetch again without one. */
  reset?: boolean;
  /** The household is gone: stopped by the owner, or this person was removed or left. */
  gone?: boolean;
}

export interface Person {
  id: string;
  name: string;
  owner: boolean;
  status: 'accepted' | 'pending' | 'removed' | 'unknown';
  me: boolean;
}

export interface Invite {
  url: string;
  title: string;
  /** The household owner's id: where their jungle lives. */
  owner: string;
  ownerName: string;
}

/**
 * The CloudKit bridge (ios/HouseholdModule.swift). `owner` is null for the household's owner (their own
 * private zone) and the owner's id for members (the zone reached through sharing).
 */
interface HouseholdNative {
  accountStatus(): Promise<'available' | 'noAccount' | 'restricted' | 'temporarilyUnavailable' | 'couldNotDetermine'>;
  myId(): Promise<string>;
  ensureZone(): Promise<void>;
  save(owner: string | null, items: WireItem[], deleteIds: string[]): Promise<string[]>;
  savePhoto(owner: string | null, name: string, fileUri: string): Promise<void>;
  fetchChanges(owner: string | null, token: string | null, diaryDir: string): Promise<Changes>;
  invite(title: string): Promise<void>;
  people(owner: string | null): Promise<Person[]>;
  remove(personId: string): Promise<void>;
  stopSharing(): Promise<void>;
  leave(owner: string): Promise<void>;
  pendingInvite(): Promise<Invite | null>;
  acceptInvite(url: string): Promise<string>;
  dismissInvite(): void;
  /** Silent pushes when the jungle changes on another phone ('onChange'). */
  subscribe(owner: string | null): Promise<void>;
  unsubscribe(owner: string | null): Promise<void>;
  /** A sync finished: lets iOS know the push that woke the app was handled. */
  changeHandled(): void;
  addListener(event: 'onInvite' | 'onChange', listener: () => void): EventSubscription;
}

/** Null on web, Android, tests and builds from before household sharing. */
export const Household = requireOptionalNativeModule<HouseholdNative>('Household');
