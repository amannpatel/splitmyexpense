import type { ReactNode } from 'react';
import { Crown, Scale, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatedMoney } from './AnimatedMoney';
import { ContributionBreakdown } from './ContributionBreakdown';
import { MemberAvatar } from './MemberAvatar';
import { formatMoney, type CurrencyCode } from '../lib/money';
import type { Ledger } from '../lib/settlement';
import type { Participant } from '../lib/types';

interface GroupSummaryProps {
  ledger: Ledger;
  participants: readonly Participant[];
  currency: CurrencyCode;
}

function Stat({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/12 px-3 py-2.5 ring-1 ring-white/15">
      <dt className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-white/75 uppercase">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-tight font-extrabold [overflow-wrap:anywhere] sm:text-base">{children}</dd>
    </div>
  );
}

export function GroupSummary({ ledger, participants, currency }: GroupSummaryProps) {
  const { totals, balances } = ledger;
  const top = totals.topContributor ? participants.find((p) => p.id === totals.topContributor?.id) : undefined;
  const extra = totals.remainderMinor;

  return (
    <section aria-labelledby="summary-heading" className="card overflow-hidden">
      <div className="relative overflow-hidden bg-linear-135 from-grape-500 to-[#4c2bd0] px-5 pt-5 pb-5 text-white sm:px-6">
        <div aria-hidden className="absolute -top-10 -right-10 size-36 rounded-full bg-white/10" />
        <div aria-hidden className="absolute top-10 right-16 size-5 rounded-full bg-sunny-400/90" />
        <div aria-hidden className="absolute top-5 right-24 size-2.5 rounded-full bg-coral-400" />

        <h2 id="summary-heading" className="relative text-sm font-bold text-white/80">
          Total spent
        </h2>
        <p className="relative font-display text-4xl font-black tracking-tight sm:text-5xl">
          <AnimatedMoney minor={totals.totalMinor} currency={currency} className="tabular" />
        </p>

        <dl className="relative mt-4 grid grid-cols-3 gap-2">
          <Stat icon={Users} label="People">
            {totals.count}
          </Stat>
          <Stat icon={Scale} label="Fair share">
            <AnimatedMoney minor={totals.baseShareMinor} currency={currency} className="tabular" />
          </Stat>
          <Stat icon={Crown} label="Top payer">
            {top ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <MemberAvatar seed={top.avatarSeed} size="sm" className="size-5! text-xs!" />
                <span className="truncate">{top.name}</span>
              </span>
            ) : (
              <span className="text-white/70">Nobody yet</span>
            )}
          </Stat>
        </dl>
      </div>

      {extra > 0 && (
        <p className="border-b border-line bg-sunny-100 px-5 py-2 text-xs text-sunny-700 sm:px-6">
          {formatMoney(totals.totalMinor, currency)} doesn't split evenly, so the {extra === 1 ? 'top payer covers' : `${extra} top payers each cover`} an
          extra {formatMoney(1, currency)} to keep the math exact.
        </p>
      )}

      {totals.count > 1 && <ContributionBreakdown balances={balances} participants={participants} currency={currency} />}
    </section>
  );
}
