import { memo } from 'react';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import { getAvatarStyle } from '../lib/avatar';
import { formatMoney, type CurrencyCode } from '../lib/money';
import type { Balance, Participant } from '../lib/types';

interface ContributionBreakdownProps {
  balances: readonly Balance[];
  participants: readonly Participant[];
  currency: CurrencyCode;
}

export function BalanceTag({ balanceMinor, currency }: { balanceMinor: number; currency: CurrencyCode }) {
  const amount = formatMoney(Math.abs(balanceMinor), currency);
  if (balanceMinor > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-xs font-bold text-mint-700">
        <ArrowDownLeft className="size-3.5" aria-hidden />
        gets back <span className="tabular">{amount}</span>
      </span>
    );
  }
  if (balanceMinor < 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coral-50 px-2 py-0.5 text-xs font-bold text-coral-700">
        <ArrowUpRight className="size-3.5" aria-hidden />
        owes <span className="tabular">{amount}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
      <Check className="size-3.5" aria-hidden />
      all square
    </span>
  );
}

export const ContributionBreakdown = memo(function ContributionBreakdown({
  balances,
  participants,
  currency,
}: ContributionBreakdownProps) {
  const scale = Math.max(1, ...balances.map((b) => Math.max(b.paidMinor, b.shareMinor)));
  const seedOf = new Map(participants.map((p) => [p.id, p.avatarSeed]));

  return (
    <div className="px-5 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-muted">Paid vs. fair share</h3>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden className="h-3 w-0.5 rounded bg-ink/70" />
          fair share
        </span>
      </div>
      <ul className="space-y-3">
        {balances.map((b) => {
          const seed = seedOf.get(b.id) ?? b.id;
          const avatar = getAvatarStyle(seed);
          const paidPct = (b.paidMinor / scale) * 100;
          const sharePct = (b.shareMinor / scale) * 100;
          return (
            <li key={b.id} className="flex items-center gap-3">
              <MemberAvatar seed={seed} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold">{b.name}</span>
                  <BalanceTag balanceMinor={b.balanceMinor} currency={currency} />
                </div>
                <div aria-hidden className="relative mt-1.5 h-2.5 rounded-full bg-grape-50">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundImage: `linear-gradient(90deg, ${avatar.from}, ${avatar.to})` }}
                    initial={false}
                    animate={{ width: `${paidPct}%` }}
                    transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                  />
                  <span
                    className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded bg-ink/70"
                    style={{ left: `${sharePct}%` }}
                  />
                </div>
                <p className="sr-only">
                  {b.name} paid {formatMoney(b.paidMinor, currency)}, fair share {formatMoney(b.shareMinor, currency)}.
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
