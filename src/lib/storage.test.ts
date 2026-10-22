import { describe, expect, it } from 'vitest';
import { createLocalStore, createSession, parseStoredSession, serializeSession, STORAGE_KEY } from './storage';
import { newParticipant, sessionReducer } from './session';
import { calculateLedger } from './settlement';
import { validateGroup } from './validation';

describe('validateGroup', () => {
  it('accepts a clean group and flags duplicates and bad amounts', () => {
    const alice = newParticipant('Alice', 900);
    expect(validateGroup([alice, newParticipant('Bob', 0)])).toEqual([]);
    expect(validateGroup([alice, { ...newParticipant('ALICE', 1) }])).toHaveLength(1);
    expect(validateGroup([{ ...alice, paidMinor: -1 }])).toHaveLength(1);
  });
});

describe('parseStoredSession', () => {
  it('starts fresh when nothing is stored', () => {
    expect(parseStoredSession(null).status).toBe('new');
  });

  it('round-trips a valid session', () => {
    const session = { ...createSession(), title: 'Goa', participants: [newParticipant('Alice', 900)] };
    const result = parseStoredSession(serializeSession(session));
    expect(result.status).toBe('restored');
    expect(result.session).toEqual(session);
  });

  it.each(['{not json', '"string"', 'null', '{"schemaVersion":99,"session":{}}', '{"schemaVersion":1}'])(
    'falls back safely for %s',
    (raw) => {
      const result = parseStoredSession(raw);
      expect(result.status).toBe('unreadable');
      expect(result.session.participants).toEqual([]);
    },
  );

  it('drops invalid participants and unknown currencies', () => {
    const good = newParticipant('Alice', 900);
    const raw = JSON.stringify({
      schemaVersion: 1,
      session: {
        id: 's1',
        currency: 'XYZ',
        participants: [
          good,
          { ...good, id: 'dup-name', name: 'alice' },
          { id: 'x', name: 'Neg', avatarSeed: 'a', paidMinor: -5 },
          { id: 'y', name: 'Float', avatarSeed: 'a', paidMinor: 1.5 },
          { id: 'z', name: '', avatarSeed: 'a', paidMinor: 1 },
          'junk',
        ],
        settledTransferKeys: ['ok', 42],
      },
    });
    const result = parseStoredSession(raw);
    expect(result.status).toBe('repaired');
    expect(result.session.participants).toEqual([good]);
    expect(result.session.currency).toBe('INR');
    expect(result.session.settledTransferKeys).toEqual(['ok']);
  });
});

describe('createLocalStore', () => {
  it('persists and restores through Storage', () => {
    localStorage.clear();
    const store = createLocalStore(localStorage);
    const session = { ...createSession(), participants: [newParticipant('Bob', 300)] };
    expect(store.save(session)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Bob');
    expect(store.load().session).toEqual(session);
  });

  it('reports failure when storage is unavailable', () => {
    const store = createLocalStore(null);
    expect(store.save(createSession())).toBe(false);
    expect(store.load().status).toBe('new');
  });
});

describe('sessionReducer', () => {
  it('keeps paid marks separate from contributions and prunes stale ones', () => {
    const alice = newParticipant('Alice', 900);
    const bob = newParticipant('Bob', 300);
    let session = { ...createSession(), participants: [alice, bob] };
    const [transfer] = calculateLedger(session.participants).transfers;

    session = sessionReducer(session, { type: 'toggleSettled', key: transfer!.key });
    expect(session.settledTransferKeys).toEqual([transfer!.key]);
    expect(session.participants).toEqual([alice, bob]);

    session = sessionReducer(session, { type: 'addToExisting', id: bob.id, amountMinor: 100 });
    expect(session.participants[1]!.paidMinor).toBe(400);
    expect(session.settledTransferKeys).toEqual([]);
  });

  it('rescales amounts when the currency changes', () => {
    const session = { ...createSession('INR'), participants: [newParticipant('A', 12345)] };
    const next = sessionReducer(session, { type: 'setCurrency', currency: 'JPY' });
    expect(next.participants[0]!.paidMinor).toBe(123);
  });
});
