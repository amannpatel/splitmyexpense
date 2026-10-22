import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from './money';
import { createId } from './id';
import { MAX_PARTICIPANTS, MAX_TITLE_LENGTH, isValidParticipant, nameKey } from './validation';
import type { GroupSession, Participant } from './types';

/**
 * LocalStorage persistence. Only the raw inputs are stored (people, amounts, currency, paid marks);
 * totals, balances and transfers are always recalculated. Swap this module for an API client to add
 * shared online groups later — the rest of the app only talks to `SessionStore`.
 */

export const STORAGE_KEY = 'splitzy.session';
export const SCHEMA_VERSION = 1;

interface StoredEnvelope {
  schemaVersion: typeof SCHEMA_VERSION;
  session: GroupSession;
}

export type LoadStatus = 'new' | 'restored' | 'repaired' | 'unreadable';

export interface LoadResult {
  status: LoadStatus;
  session: GroupSession;
}

export interface SessionStore {
  load(): LoadResult;
  save(session: GroupSession): boolean;
}

export function createSession(currency: CurrencyCode = DEFAULT_CURRENCY): GroupSession {
  const now = new Date().toISOString();
  return { id: createId(), title: '', currency, participants: [], settledTransferKeys: [], createdAt: now, updatedAt: now };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/**
 * Validates untrusted JSON. Individually broken participants are dropped (status "repaired");
 * anything structurally wrong yields a fresh session (status "unreadable").
 */
export function parseStoredSession(raw: string | null): LoadResult {
  if (raw === null || raw === '') return { status: 'new', session: createSession() };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { status: 'unreadable', session: createSession() };
  }

  const envelope = data as Partial<StoredEnvelope> | null;
  if (typeof envelope !== 'object' || envelope === null || envelope.schemaVersion !== SCHEMA_VERSION) {
    return { status: 'unreadable', session: createSession() };
  }

  const s = envelope.session as Partial<GroupSession> | undefined;
  if (typeof s !== 'object' || s === null || typeof s.id !== 'string' || !Array.isArray(s.participants)) {
    return { status: 'unreadable', session: createSession() };
  }

  let repaired = false;
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const participants: Participant[] = [];
  for (const candidate of s.participants as unknown[]) {
    if (
      participants.length >= MAX_PARTICIPANTS ||
      !isValidParticipant(candidate) ||
      seenIds.has(candidate.id) ||
      seenNames.has(nameKey(candidate.name))
    ) {
      repaired = true;
      continue;
    }
    seenIds.add(candidate.id);
    seenNames.add(nameKey(candidate.name));
    participants.push({
      id: candidate.id,
      name: candidate.name.trim(),
      avatarSeed: candidate.avatarSeed,
      paidMinor: candidate.paidMinor,
    });
  }

  const currency = isCurrencyCode(s.currency) ? s.currency : DEFAULT_CURRENCY;
  if (currency !== s.currency) repaired = true;

  const settledTransferKeys = Array.isArray(s.settledTransferKeys)
    ? s.settledTransferKeys.filter((k): k is string => typeof k === 'string')
    : [];

  const now = new Date().toISOString();
  const session: GroupSession = {
    id: s.id,
    title: typeof s.title === 'string' ? s.title.slice(0, MAX_TITLE_LENGTH) : '',
    currency,
    participants,
    settledTransferKeys,
    createdAt: isIsoDate(s.createdAt) ? s.createdAt : now,
    updatedAt: isIsoDate(s.updatedAt) ? s.updatedAt : now,
  };
  return { status: repaired ? 'repaired' : 'restored', session };
}

export function serializeSession(session: GroupSession): string {
  const envelope: StoredEnvelope = { schemaVersion: SCHEMA_VERSION, session };
  return JSON.stringify(envelope);
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createLocalStore(storage: Storage | null = getLocalStorage()): SessionStore {
  return {
    load() {
      try {
        return parseStoredSession(storage?.getItem(STORAGE_KEY) ?? null);
      } catch {
        return { status: 'unreadable', session: createSession() };
      }
    },
    save(session) {
      if (!storage) return false;
      try {
        storage.setItem(STORAGE_KEY, serializeSession(session));
        return true;
      } catch {
        return false;
      }
    },
  };
}
