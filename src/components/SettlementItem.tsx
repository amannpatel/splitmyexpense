import { memo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import { formatMoney, type CurrencyCode } from '../lib/money';
import type { Participant, Transfer } from '../lib/types';

interface SettlementItemProps {
  transfer: Transfer;
  from: Participant;
  to: Participant;
  currency: CurrencyCode;
  paid: boolean;
  index: number;
  onToggle: (key: string) => void;
}

export const SettlementItem = memo(function SettlementItem({
  transfer,
  from,
  to,
  currency,
  paid,
  index,
  onToggle,
}: SettlementItemProps) {
  const amount = formatMoney(transfer.amountMinor, currency);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index, 6) * 0.04, type: 'spring', stiffness: 420, damping: 32 }}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-2 p-3 transition-colors sm:flex-nowrap ${
        paid ? 'border-mint-100 bg-mint-50/70' : 'border-line bg-white'
      }`}
    >
      <p className="sr-only">
        {from.name} pays {to.name} {amount}
        {paid ? ', marked as paid' : ''}
      </p>
      <div aria-hidden className={`flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-auto ${paid ? 'opacity-60' : ''}`}>
        <MemberAvatar seed={from.avatarSeed} size="sm" />
        <span className="min-w-0 truncate font-bold">{from.name}</span>
        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-grape-50 px-2 py-0.5 text-xs font-bold text-grape-700">
          pays
          <ArrowRight className="size-3.5" />
        </span>
        <MemberAvatar seed={to.avatarSeed} size="sm" />
        <span className="min-w-0 truncate font-bold">{to.name}</span>
      </div>
      <span
        aria-hidden
        className={`mr-auto font-display text-xl font-black tabular sm:mr-0 ${paid ? 'text-muted line-through decoration-2' : ''}`}
      >
        {amount}
      </span>
      <button
        type="button"
        aria-pressed={paid}
        aria-label={paid ? `Paid: ${from.name} to ${to.name}` : `Mark paid: ${from.name} to ${to.name}`}
        className={`btn h-9 shrink-0 px-3 text-sm ${paid ? 'bg-mint-500 text-white hover:bg-mint-700' : 'btn-soft'}`}
        onClick={() => onToggle(transfer.key)}
      >
        <Check className="size-4" aria-hidden />
        {paid ? 'Paid' : 'Mark paid'}
      </button>
    </motion.li>
  );
});
