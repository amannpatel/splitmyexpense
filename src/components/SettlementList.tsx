import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, PartyPopper, RotateCcw } from 'lucide-react';
import { SettlementItem } from './SettlementItem';
import type { CurrencyCode } from '../lib/money';
import type { Ledger } from '../lib/settlement';
import type { Participant } from '../lib/types';

interface SettlementListProps {
  ledger: Ledger;
  participants: readonly Participant[];
  currency: CurrencyCode;
  settledKeys: readonly string[];
  onToggle: (key: string) => void;
  onResetSettled: () => void;
  onCopy: () => Promise<boolean>;
}

function Notice({ emoji, title, children }: { emoji: string; title: string; children: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-grape-50 p-4">
      <span aria-hidden className="text-4xl">
        {emoji}
      </span>
      <div>
        <p className="font-display font-extrabold">{title}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}

export function SettlementList({
  ledger,
  participants,
  currency,
  settledKeys,
  onToggle,
  onResetSettled,
  onCopy,
}: SettlementListProps) {
  const [copied, setCopied] = useState(false);
  const { totals, transfers } = ledger;
  const byId = new Map(participants.map((p) => [p.id, p]));
  const settled = new Set(settledKeys);
  const paidCount = transfers.filter((t) => settled.has(t.key)).length;
  const allPaid = transfers.length > 0 && paidCount === transfers.length;
  const canCopy = totals.count > 1 && totals.totalMinor > 0;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  let body;
  if (totals.count < 2) {
    body = (
      <Notice emoji="👯" title="Add one more friend">
        You need at least two people to split anything.
      </Notice>
    );
  } else if (totals.totalMinor === 0) {
    body = (
      <Notice emoji="🪙" title="Nobody's paid yet">
        Enter what each person paid and the payments show up here.
      </Notice>
    );
  } else if (transfers.length === 0) {
    body = (
      <Notice emoji="🎉" title="Everyone's square!">
        Each person paid exactly their share. Nothing to settle.
      </Notice>
    );
  } else {
    body = (
      <>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {transfers.map((t, index) => {
              const from = byId.get(t.fromId);
              const to = byId.get(t.toId);
              if (!from || !to) return null;
              return (
                <SettlementItem
                  key={`${t.fromId}>${t.toId}`}
                  transfer={t}
                  from={from}
                  to={to}
                  currency={currency}
                  paid={settled.has(t.key)}
                  index={index}
                  onToggle={onToggle}
                />
              );
            })}
          </AnimatePresence>
        </ul>

        <AnimatePresence initial={false}>
          {paidCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 ${allPaid ? 'bg-mint-50 text-mint-700' : 'bg-cream'}`}
              >
                {allPaid ? (
                  <PartyPopper className="size-5 shrink-0" aria-hidden />
                ) : (
                  <div
                    aria-hidden
                    className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-line"
                  >
                    <div
                      className="h-full rounded-full bg-mint-500 transition-[width] duration-500"
                      style={{ width: `${(paidCount / transfers.length) * 100}%` }}
                    />
                  </div>
                )}
                <p className="min-w-0 flex-1 text-sm font-bold">
                  {allPaid ? 'All settled up. Nice work!' : `${paidCount} of ${transfers.length} paid`}
                </p>
                <button type="button" className="btn btn-ghost h-8 px-3 text-xs" onClick={onResetSettled}>
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <section aria-labelledby="settle-heading" className="card p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <h2 id="settle-heading" className="font-display text-xl font-black tracking-tight">
            Who pays whom?
          </h2>
          {transfers.length > 0 && (
            <p className="text-sm text-muted">
              {transfers.length === 1 ? 'One payment settles everything' : `${transfers.length} payments settle everything`}
            </p>
          )}
        </div>
        {canCopy && (
          <button
            type="button"
            className="btn btn-soft h-10 shrink-0 px-4 text-sm"
            onClick={async () => {
              if (await onCopy()) setCopied(true);
            }}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      {body}
    </section>
  );
}
