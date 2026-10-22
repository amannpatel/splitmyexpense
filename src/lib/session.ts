import { calculateLedger } from './settlement';
import { majorToMinor, rescaleMinor, type CurrencyCode } from './money';
import { createId } from './id';
import { cleanName, MAX_TITLE_LENGTH } from './validation';
import type { GroupSession, Participant } from './types';

export type SessionAction =
  | { type: 'add'; participant: Participant }
  | { type: 'addToExisting'; id: string; amountMinor: number }
  | { type: 'update'; id: string; name: string; paidMinor: number }
  | { type: 'remove'; id: string }
  | { type: 'insert'; participant: Participant; index: number }
  | { type: 'setTitle'; title: string }
  | { type: 'setCurrency'; currency: CurrencyCode }
  | { type: 'toggleSettled'; key: string }
  | { type: 'resetSettled' }
  | { type: 'replace'; session: GroupSession };

export function newParticipant(name: string, paidMinor: number): Participant {
  return { id: createId(), name: cleanName(name), avatarSeed: createId(), paidMinor };
}

/** Drops paid-marks for transfers that no longer exist, e.g. after an amount was edited. */
function pruneSettled(session: GroupSession): GroupSession {
  if (session.settledTransferKeys.length === 0) return session;
  const live = new Set(calculateLedger(session.participants).transfers.map((t) => t.key));
  const kept = session.settledTransferKeys.filter((k) => live.has(k));
  return kept.length === session.settledTransferKeys.length ? session : { ...session, settledTransferKeys: kept };
}

function touch(session: GroupSession, changes: Partial<GroupSession>): GroupSession {
  return pruneSettled({ ...session, ...changes, updatedAt: new Date().toISOString() });
}

export function sessionReducer(session: GroupSession, action: SessionAction): GroupSession {
  switch (action.type) {
    case 'add':
      return touch(session, { participants: [...session.participants, action.participant] });
    case 'addToExisting':
      return touch(session, {
        participants: session.participants.map((p) =>
          p.id === action.id ? { ...p, paidMinor: p.paidMinor + action.amountMinor } : p,
        ),
      });
    case 'update':
      return touch(session, {
        participants: session.participants.map((p) =>
          p.id === action.id ? { ...p, name: cleanName(action.name), paidMinor: action.paidMinor } : p,
        ),
      });
    case 'remove':
      return touch(session, { participants: session.participants.filter((p) => p.id !== action.id) });
    case 'insert': {
      if (session.participants.some((p) => p.id === action.participant.id)) return session;
      const participants = [...session.participants];
      participants.splice(Math.min(action.index, participants.length), 0, action.participant);
      return touch(session, { participants });
    }
    case 'setTitle':
      return touch(session, { title: action.title.slice(0, MAX_TITLE_LENGTH) });
    case 'setCurrency':
      if (action.currency === session.currency) return session;
      return touch(session, {
        currency: action.currency,
        participants: session.participants.map((p) => ({
          ...p,
          paidMinor: rescaleMinor(p.paidMinor, session.currency, action.currency),
        })),
        settledTransferKeys: [],
      });
    case 'toggleSettled': {
      const has = session.settledTransferKeys.includes(action.key);
      return touch(session, {
        settledTransferKeys: has
          ? session.settledTransferKeys.filter((k) => k !== action.key)
          : [...session.settledTransferKeys, action.key],
      });
    }
    case 'resetSettled':
      return touch(session, { settledTransferKeys: [] });
    case 'replace':
      return action.session;
  }
}

const SAMPLE: ReadonlyArray<readonly [string, number]> = [
  ['Aarav', 2400],
  ['Priya', 1150],
  ['Kabir', 0],
  ['Meera', 650],
];

export function buildSampleParticipants(currency: CurrencyCode): Participant[] {
  return SAMPLE.map(([name, major]) => newParticipant(name, majorToMinor(major, currency)));
}
