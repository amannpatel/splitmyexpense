import { formatMoney, type CurrencyCode } from './money';
import type { Ledger } from './settlement';
import type { Participant } from './types';

interface ShareTextInput {
  title: string;
  currency: CurrencyCode;
  participants: readonly Participant[];
  ledger: Ledger;
  settledKeys: readonly string[];
}

/** Plain-text summary for pasting into a group chat. */
export function buildSettlementText({ title, currency, participants, ledger, settledKeys }: ShareTextInput): string {
  const { totals, transfers } = ledger;
  const nameOf = (id: string) => participants.find((p) => p.id === id)?.name ?? 'Someone';
  const fmt = (minor: number) => formatMoney(minor, currency);
  const settled = new Set(settledKeys);

  const share =
    totals.remainderMinor === 0 ? fmt(totals.baseShareMinor) : `~${fmt(totals.baseShareMinor)}`;

  const lines = [
    title.trim() || 'Group expenses',
    `Total: ${fmt(totals.totalMinor)}`,
    `People: ${totals.count}`,
    `Share: ${share} each`,
    '',
  ];

  if (transfers.length === 0) {
    lines.push("Everyone's square. Nobody owes anything!");
  } else {
    for (const t of transfers) {
      const mark = settled.has(t.key) ? ' (paid)' : '';
      lines.push(`${nameOf(t.fromId)} pays ${nameOf(t.toId)}: ${fmt(t.amountMinor)}${mark}`);
    }
  }
  return lines.join('\n');
}
