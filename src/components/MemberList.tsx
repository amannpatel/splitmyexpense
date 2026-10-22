import { AnimatePresence } from 'motion/react';
import { MemberRow, type MemberRowProps } from './MemberRow';
import type { CurrencyCode } from '../lib/money';
import type { Participant } from '../lib/types';

interface MemberListProps extends Pick<MemberRowProps, 'isNameTaken' | 'onUpdate' | 'onRemove'> {
  participants: readonly Participant[];
  currency: CurrencyCode;
}

export function MemberList({ participants, currency, ...handlers }: MemberListProps) {
  return (
    <section aria-labelledby="crew-heading" className="card p-3 sm:p-4">
      <h2 id="crew-heading" className="flex items-center gap-2 px-2 pt-1 pb-2 font-display text-lg font-extrabold">
        The crew
        <span className="rounded-full bg-grape-100 px-2.5 py-0.5 text-sm font-bold text-grape-700">
          {participants.length}
        </span>
      </h2>
      <ul className="space-y-1">
        <AnimatePresence initial={false}>
          {participants.map((p) => (
            <MemberRow key={p.id} participant={p} currency={currency} {...handlers} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
