import type { CurrencyCode } from './money';

export interface Participant {
  id: string;
  name: string;
  /** Stable seed for the generated avatar so it survives renames and refreshes. */
  avatarSeed: string;
  /** Total amount this person paid, in integer minor units. */
  paidMinor: number;
}

export interface GroupSession {
  id: string;
  title: string;
  currency: CurrencyCode;
  participants: Participant[];
  /** Keys of transfers marked as paid. Kept apart from contributions so the ledger is never mutated. */
  settledTransferKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  id: string;
  name: string;
  paidMinor: number;
  shareMinor: number;
  /** paid − share. Positive: receives money. Negative: owes money. */
  balanceMinor: number;
}

export interface Transfer {
  /** Identifies this exact instruction; changes whenever who/whom/how-much changes. */
  key: string;
  fromId: string;
  toId: string;
  amountMinor: number;
}
