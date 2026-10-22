import { describe, expect, it } from 'vitest';
import {
  calculateBalances,
  calculateFairShares,
  calculateGroupTotals,
  calculateLedger,
  calculateSettlements,
  type Contribution,
} from './settlement';
import { MAX_AMOUNT_MINOR, parseAmount } from './money';
import { MAX_PARTICIPANTS } from './validation';
import type { Transfer } from './types';

const person = (name: string, paidMinor: number): Contribution => ({ id: `id-${name}`, name, paidMinor });

/** Compact "From>To:amount" view of a settlement for readable assertions. */
const describeTransfers = (transfers: Transfer[]) =>
  transfers.map((t) => `${t.fromId.replace('id-', '')}>${t.toId.replace('id-', '')}:${t.amountMinor}`);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Every invariant a settlement must satisfy, regardless of input. */
function assertLedgerInvariants(participants: Contribution[]) {
  const { totals, balances, transfers } = calculateLedger(participants);

  const shareSum = balances.reduce((s, b) => s + b.shareMinor, 0);
  expect(shareSum).toBe(totals.totalMinor);
  expect(balances.reduce((s, b) => s + b.balanceMinor, 0)).toBe(0);

  const shares = balances.map((b) => b.shareMinor);
  expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);

  const pairs = new Set<string>();
  const net = new Map(balances.map((b) => [b.id, b.balanceMinor]));
  for (const t of transfers) {
    expect(t.fromId).not.toBe(t.toId);
    expect(Number.isSafeInteger(t.amountMinor)).toBe(true);
    expect(t.amountMinor).toBeGreaterThan(0);
    const pair = `${t.fromId}>${t.toId}`;
    expect(pairs.has(pair)).toBe(false);
    pairs.add(pair);
    net.set(t.fromId, net.get(t.fromId)! + t.amountMinor);
    net.set(t.toId, net.get(t.toId)! - t.amountMinor);
  }
  for (const value of net.values()) expect(value).toBe(0);

  expect(transfers.length).toBeLessThanOrEqual(Math.max(0, participants.length - 1));
  return { totals, balances, transfers };
}

describe('calculateGroupTotals', () => {
  it('handles an empty group', () => {
    expect(calculateGroupTotals([])).toEqual({
      totalMinor: 0,
      count: 0,
      baseShareMinor: 0,
      remainderMinor: 0,
      topContributor: null,
    });
  });

  it('finds the top contributor', () => {
    const totals = calculateGroupTotals([person('Alice', 900), person('Bob', 300), person('Charlie', 0)]);
    expect(totals.totalMinor).toBe(1200);
    expect(totals.baseShareMinor).toBe(400);
    expect(totals.topContributor?.name).toBe('Alice');
  });
});

describe('settlement engine', () => {
  it('1. one person: nothing to settle', () => {
    const { balances, transfers } = assertLedgerInvariants([person('Solo', 50_000)]);
    expect(balances[0]).toMatchObject({ shareMinor: 50_000, balanceMinor: 0 });
    expect(transfers).toEqual([]);
  });

  it('2. two people who paid equal amounts are already square', () => {
    const { transfers } = assertLedgerInvariants([person('A', 25_000), person('B', 25_000)]);
    expect(transfers).toEqual([]);
  });

  it('3. one person paying the entire bill gets paid back by everyone else', () => {
    const { transfers } = assertLedgerInvariants([person('Host', 90_000), person('B', 0), person('C', 0)]);
    expect(describeTransfers(transfers)).toEqual(['B>Host:30000', 'C>Host:30000']);
  });

  it('4. three or more uneven contributions (the README example)', () => {
    const { totals, transfers } = assertLedgerInvariants([
      person('Alice', 90_000),
      person('Bob', 30_000),
      person('Charlie', 0),
    ]);
    expect(totals.totalMinor).toBe(120_000);
    expect(totals.baseShareMinor).toBe(40_000);
    expect(describeTransfers(transfers)).toEqual(['Charlie>Alice:40000', 'Bob>Alice:10000']);
  });

  it('4b. multiple creditors and debtors', () => {
    const { transfers } = assertLedgerInvariants([
      person('Aarav', 240_000),
      person('Priya', 115_000),
      person('Kabir', 0),
      person('Meera', 65_000),
    ]);
    expect(describeTransfers(transfers)).toEqual(['Kabir>Aarav:105000', 'Meera>Aarav:30000', 'Meera>Priya:10000']);
  });

  it('5. participants who paid zero owe their full share', () => {
    const { balances } = assertLedgerInvariants([person('A', 1000), person('B', 0), person('C', 0), person('D', 0)]);
    expect(balances.filter((b) => b.paidMinor === 0).every((b) => b.balanceMinor === -250)).toBe(true);
  });

  it('6. a participant who paid exactly their share is left out of transfers', () => {
    const { balances, transfers } = assertLedgerInvariants([person('A', 600), person('B', 300), person('C', 0)]);
    expect(balances.find((b) => b.name === 'B')?.balanceMinor).toBe(0);
    expect(transfers.some((t) => t.fromId === 'id-B' || t.toId === 'id-B')).toBe(false);
  });

  it('7. decimal amounts are handled in minor units', () => {
    const a = parseAmount('10.05', 'INR');
    const b = parseAmount('0.1', 'INR');
    const c = parseAmount('0.2', 'INR');
    expect([a, b, c].every((r) => r.ok)).toBe(true);
    const minor = [a, b, c].map((r) => (r.ok ? r.minor : NaN));
    expect(minor).toEqual([1005, 10, 20]);

    const { totals, transfers } = assertLedgerInvariants([
      person('A', minor[0]!),
      person('B', minor[1]!),
      person('C', minor[2]!),
    ]);
    expect(totals.totalMinor).toBe(1035);
    expect(totals.baseShareMinor).toBe(345);
    expect(describeTransfers(transfers)).toEqual(['B>A:335', 'C>A:325']);
  });

  it('8. indivisible totals: leftover minor units go to the biggest payers', () => {
    const participants = [person('A', 100), person('B', 0), person('C', 0)];
    const shares = calculateFairShares(participants);
    expect([...shares.entries()]).toEqual([
      ['id-A', 34],
      ['id-B', 33],
      ['id-C', 33],
    ]);
    const { transfers } = assertLedgerInvariants(participants);
    expect(describeTransfers(transfers)).toEqual(['B>A:33', 'C>A:33']);
  });

  it('8b. remainder spreads one unit per person, ties broken by name', () => {
    // 1003 / 4 = 250 remainder 3.
    const participants = [person('Zed', 0), person('Amy', 0), person('Bo', 0), person('Cy', 1003)];
    const shares = calculateFairShares(participants);
    expect(shares.get('id-Cy')).toBe(251);
    expect(shares.get('id-Amy')).toBe(251);
    expect(shares.get('id-Bo')).toBe(251);
    expect(shares.get('id-Zed')).toBe(250);
    assertLedgerInvariants(participants);
  });

  it('9. everyone paid zero', () => {
    const { totals, transfers } = assertLedgerInvariants([person('A', 0), person('B', 0), person('C', 0)]);
    expect(totals.totalMinor).toBe(0);
    expect(totals.topContributor).toBeNull();
    expect(transfers).toEqual([]);
  });

  it('10. large amounts stay exact', () => {
    const participants = Array.from({ length: MAX_PARTICIPANTS }, (_, i) =>
      person(`P${String(i).padStart(3, '0')}`, i % 3 === 0 ? MAX_AMOUNT_MINOR : MAX_AMOUNT_MINOR - i * 7),
    );
    const { totals } = assertLedgerInvariants(participants);
    expect(Number.isSafeInteger(totals.totalMinor)).toBe(true);
  });

  it('11 & 12. randomised groups: no duplicate transfers and exact reconciliation', () => {
    const rand = mulberry32(42);
    for (let round = 0; round < 300; round++) {
      const size = 1 + Math.floor(rand() * 12);
      const participants = Array.from({ length: size }, (_, i) =>
        person(`P${i}`, rand() < 0.25 ? 0 : Math.floor(rand() * 1_000_000)),
      );
      assertLedgerInvariants(participants);
    }
  });

  it('13. results do not depend on participant order', () => {
    const rand = mulberry32(7);
    for (let round = 0; round < 100; round++) {
      const size = 2 + Math.floor(rand() * 8);
      const participants = Array.from({ length: size }, (_, i) =>
        person(`P${i}`, rand() < 0.3 ? 500 : Math.floor(rand() * 50_000)),
      );
      const reference = calculateLedger(participants);
      const shuffled = calculateLedger(shuffle(participants, rand));
      expect(shuffled.transfers).toEqual(reference.transfers);
      expect(new Map(shuffled.balances.map((b) => [b.id, b]))).toEqual(
        new Map(reference.balances.map((b) => [b.id, b])),
      );
    }
  });

  it('rejects an unbalanced ledger instead of producing wrong instructions', () => {
    const balances = calculateBalances([person('A', 100), person('B', 0)]);
    balances[0]!.balanceMinor += 1;
    expect(() => calculateSettlements(balances)).toThrow(/Unbalanced/);
  });
});
