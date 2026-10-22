import type { Balance, Participant, Transfer } from './types';

/**
 * Settlement engine. Pure functions over integer minor units — no floating point, no rendering concerns.
 */

export type Contribution = Pick<Participant, 'id' | 'name' | 'paidMinor'>;

export interface GroupTotals {
  totalMinor: number;
  count: number;
  /** Equal share before remainder distribution (floor of total / count). */
  baseShareMinor: number;
  /** Minor units left over after the equal split; that many people carry one extra minor unit. */
  remainderMinor: number;
  /** Person who paid the most, or null if nobody paid anything. */
  topContributor: Contribution | null;
}

export interface Ledger {
  totals: GroupTotals;
  balances: Balance[];
  transfers: Transfer[];
}

/** Deterministic tie-breaker that does not depend on input order or the runtime locale. */
function compareIdentity(a: Contribution, b: Contribution): number {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

function byPaidDesc(a: Contribution, b: Contribution): number {
  return b.paidMinor - a.paidMinor || compareIdentity(a, b);
}

export function calculateGroupTotals(participants: readonly Contribution[]): GroupTotals {
  const count = participants.length;
  const totalMinor = participants.reduce((sum, p) => sum + p.paidMinor, 0);
  const baseShareMinor = count > 0 ? Math.floor(totalMinor / count) : 0;
  const remainderMinor = count > 0 ? totalMinor - baseShareMinor * count : 0;
  const top = [...participants].sort(byPaidDesc)[0];
  return {
    totalMinor,
    count,
    baseShareMinor,
    remainderMinor,
    topContributor: top && top.paidMinor > 0 ? top : null,
  };
}

/**
 * Rounding policy: everyone's share is floor(total / n). The r = total mod n leftover minor units
 * are given one each to the r biggest payers (ties broken by name, then id). The biggest payers are
 * owed money anyway, so they absorb the rounding and nobody who owes money pays an extra paisa.
 * Shares therefore differ by at most one minor unit and always sum to the total exactly.
 */
export function calculateFairShares(participants: readonly Contribution[]): Map<string, number> {
  const { baseShareMinor, remainderMinor } = calculateGroupTotals(participants);
  const shares = new Map<string, number>();
  [...participants].sort(byPaidDesc).forEach((p, index) => {
    shares.set(p.id, baseShareMinor + (index < remainderMinor ? 1 : 0));
  });
  return shares;
}

export function calculateBalances(participants: readonly Contribution[]): Balance[] {
  const shares = calculateFairShares(participants);
  return participants.map((p) => {
    const shareMinor = shares.get(p.id) ?? 0;
    return { id: p.id, name: p.name, paidMinor: p.paidMinor, shareMinor, balanceMinor: p.paidMinor - shareMinor };
  });
}

interface Open {
  id: string;
  name: string;
  paidMinor: number;
  amount: number;
}

function byOpenAmountDesc(a: Open, b: Open): number {
  return b.amount - a.amount || compareIdentity(a, b);
}

export function transferKey(fromId: string, toId: string, amountMinor: number): string {
  return `${fromId}>${toId}:${amountMinor}`;
}

/**
 * Greedy settlement: repeatedly match the largest debtor with the largest creditor and transfer the
 * smaller of the two amounts. Each step fully settles at least one person, so there are at most n − 1
 * transfers, a pair never repeats, and nobody ever pays themselves.
 */
export function calculateSettlements(balances: readonly Balance[]): Transfer[] {
  const toOpen = (b: Balance, amount: number): Open => ({ id: b.id, name: b.name, paidMinor: b.paidMinor, amount });
  const creditors = balances.filter((b) => b.balanceMinor > 0).map((b) => toOpen(b, b.balanceMinor));
  const debtors = balances.filter((b) => b.balanceMinor < 0).map((b) => toOpen(b, -b.balanceMinor));

  const owed = creditors.reduce((s, c) => s + c.amount, 0);
  const owing = debtors.reduce((s, d) => s + d.amount, 0);
  if (owed !== owing) {
    throw new Error(`Unbalanced ledger: ${owed} owed vs ${owing} owing`);
  }

  const transfers: Transfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(byOpenAmountDesc);
    debtors.sort(byOpenAmountDesc);
    const creditor = creditors[0]!;
    const debtor = debtors[0]!;
    const amountMinor = Math.min(creditor.amount, debtor.amount);

    transfers.push({ key: transferKey(debtor.id, creditor.id, amountMinor), fromId: debtor.id, toId: creditor.id, amountMinor });
    creditor.amount -= amountMinor;
    debtor.amount -= amountMinor;
    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }
  return transfers;
}

export function calculateLedger(participants: readonly Contribution[]): Ledger {
  const totals = calculateGroupTotals(participants);
  const balances = calculateBalances(participants);
  const transfers = calculateSettlements(balances);
  return { totals, balances, transfers };
}
