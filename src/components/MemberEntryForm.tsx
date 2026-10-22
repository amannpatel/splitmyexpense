import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, CircleCheck, UserPlus } from 'lucide-react';
import { AmountInput } from './AmountInput';
import { MemberAvatar } from './MemberAvatar';
import { formatMoney, MAX_AMOUNT_MINOR, parseAmount, type CurrencyCode } from '../lib/money';
import { cleanName, findByName, MAX_NAME_LENGTH, MAX_PARTICIPANTS, validateName } from '../lib/validation';
import type { Participant } from '../lib/types';

interface MemberEntryFormProps {
  currency: CurrencyCode;
  participants: readonly Participant[];
  onAdd: (name: string, paidMinor: number) => void;
  onAddToExisting: (id: string, amountMinor: number) => void;
}

type FieldError = { field: 'name' | 'amount'; message: string } | null;

interface PendingDuplicate {
  participant: Participant;
  amountMinor: number;
}

export function MemberEntryForm({ currency, participants, onAdd, onAddToExisting }: MemberEntryFormProps) {
  const nameId = useId();
  const amountId = useId();
  const errorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<FieldError>(null);
  const [duplicate, setDuplicate] = useState<PendingDuplicate | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fmt = (minor: number) => formatMoney(minor, currency);

  useEffect(() => {
    // Only autofocus with a mouse/trackpad so phones don't pop the keyboard over the page on load.
    if (window.matchMedia?.('(pointer: fine)').matches) nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (duplicate) mergeRef.current?.focus();
  }, [duplicate]);

  function fail(field: 'name' | 'amount', message: string) {
    setError({ field, message });
    (field === 'name' ? nameRef : amountRef).current?.focus();
  }

  function finish(message: string) {
    setName('');
    setAmount('');
    setError(null);
    setDuplicate(null);
    setFeedback(message);
    nameRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nameError = validateName(name);
    if (nameError) return fail('name', nameError);

    const rawAmount = amount.trim();
    // Enter in the name field with no amount yet just moves along, drive-through style.
    if (rawAmount === '' && document.activeElement === nameRef.current) {
      amountRef.current?.focus();
      return;
    }

    let amountMinor = 0;
    if (rawAmount !== '') {
      const parsed = parseAmount(rawAmount, currency);
      if (!parsed.ok) return fail('amount', parsed.error);
      amountMinor = parsed.minor;
    }

    const existing = findByName(participants, name);
    if (existing) {
      if (amountMinor === 0) return fail('name', `${existing.name} is already in the group`);
      if (existing.paidMinor + amountMinor > MAX_AMOUNT_MINOR) {
        return fail('amount', `That would put ${existing.name} over ${fmt(MAX_AMOUNT_MINOR)}`);
      }
      setError(null);
      setDuplicate({ participant: existing, amountMinor });
      return;
    }

    if (participants.length >= MAX_PARTICIPANTS) {
      return fail('name', `A split can have up to ${MAX_PARTICIPANTS} people`);
    }

    const cleaned = cleanName(name);
    onAdd(cleaned, amountMinor);
    finish(`${cleaned} added. Who's next?`);
  }

  function confirmDuplicate() {
    if (!duplicate) return;
    onAddToExisting(duplicate.participant.id, duplicate.amountMinor);
    finish(`Added ${fmt(duplicate.amountMinor)} to ${duplicate.participant.name}.`);
  }

  function cancelDuplicate() {
    setDuplicate(null);
    nameRef.current?.focus();
    nameRef.current?.select();
  }

  const nameInvalid = error?.field === 'name';
  const amountInvalid = error?.field === 'amount';

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && duplicate) cancelDuplicate();
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
        <div>
          <label htmlFor={nameId} className="mb-1.5 block px-1 text-sm font-bold text-muted">
            Friend
          </label>
          <input
            ref={nameRef}
            id={nameId}
            className="field h-14 text-lg font-semibold"
            placeholder="Who's paying?"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={MAX_NAME_LENGTH + 10}
            value={name}
            aria-invalid={nameInvalid}
            aria-describedby={nameInvalid ? errorId : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setDuplicate(null);
              if (nameInvalid) setError(null);
            }}
          />
        </div>
        <div>
          <label htmlFor={amountId} className="mb-1.5 block px-1 text-sm font-bold text-muted">
            Amount paid
          </label>
          <AmountInput
            ref={amountRef}
            id={amountId}
            currency={currency}
            className="h-14 text-lg"
            placeholder="Amount paid"
            enterKeyHint="done"
            value={amount}
            aria-invalid={amountInvalid}
            aria-describedby={amountInvalid ? errorId : undefined}
            onChange={(e) => {
              setAmount(e.target.value);
              setDuplicate(null);
              if (amountInvalid) setError(null);
            }}
          />
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 px-1 text-sm font-semibold text-coral-700">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error.message}
        </p>
      )}

      <AnimatePresence initial={false}>
        {duplicate && (
          <motion.div
            key="duplicate"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div role="alert" className="flex gap-3 rounded-2xl bg-sunny-100 p-3.5">
              <MemberAvatar seed={duplicate.participant.avatarSeed} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <strong>{duplicate.participant.name}</strong> is already in the group with{' '}
                  {fmt(duplicate.participant.paidMinor)}. Add {fmt(duplicate.amountMinor)} to make it{' '}
                  <strong>{fmt(duplicate.participant.paidMinor + duplicate.amountMinor)}</strong>?
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button ref={mergeRef} type="button" className="btn btn-primary h-9 px-4 text-sm" onClick={confirmDuplicate}>
                    Add to {duplicate.participant.name}
                  </button>
                  <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={cancelDuplicate}>
                    Use another name
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="submit" className="btn btn-primary h-14 w-full text-lg">
        <UserPlus className="size-5" aria-hidden />
        Add friend
      </button>

      <p aria-live="polite" className="min-h-5 px-1 text-sm text-muted">
        {feedback ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-mint-700">
            <CircleCheck className="size-4" aria-hidden />
            {feedback}
          </span>
        ) : (
          <span>
            <span className="hidden md:inline">Press Enter to jump to the amount, Enter again to add. </span>
            Leave the amount empty if they paid nothing.
          </span>
        )}
      </p>
    </form>
  );
}
