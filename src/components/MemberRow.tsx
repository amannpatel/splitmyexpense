import { memo, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Check, CircleAlert, Pencil, Trash2 } from 'lucide-react';
import { AmountInput } from './AmountInput';
import { MemberAvatar } from './MemberAvatar';
import { formatMoney, minorToInput, parseAmount, type CurrencyCode } from '../lib/money';
import { MAX_NAME_LENGTH, validateName } from '../lib/validation';
import type { Participant } from '../lib/types';

export interface MemberRowProps {
  participant: Participant;
  currency: CurrencyCode;
  isNameTaken: (name: string, exceptId: string) => boolean;
  onUpdate: (id: string, name: string, paidMinor: number) => void;
  onRemove: (id: string) => void;
}

export const MemberRow = memo(function MemberRow({
  participant,
  currency,
  isNameTaken,
  onUpdate,
  onRemove,
}: MemberRowProps) {
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);

  const closeEditor = () => {
    returnFocus.current = true;
    setEditing(false);
  };

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -32, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
    >
      {editing ? (
        <EditMemberForm
          participant={participant}
          currency={currency}
          isNameTaken={isNameTaken}
          onCancel={closeEditor}
          onSave={(name, paidMinor) => {
            onUpdate(participant.id, name, paidMinor);
            closeEditor();
          }}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-grape-50/70">
          <MemberAvatar seed={participant.avatarSeed} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{participant.name}</p>
            <p className="text-sm text-muted">
              paid <span className="tabular font-semibold text-ink">{formatMoney(participant.paidMinor, currency)}</span>
            </p>
          </div>
          <button
            ref={editButtonRef}
            type="button"
            className="icon-btn"
            aria-label={`Edit ${participant.name}`}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            className="icon-btn hover:bg-coral-50! hover:text-coral-700!"
            aria-label={`Remove ${participant.name}`}
            onClick={() => onRemove(participant.id)}
          >
            <Trash2 className="size-[18px]" aria-hidden />
          </button>
        </div>
      )}
    </motion.li>
  );
});

interface EditMemberFormProps {
  participant: Participant;
  currency: CurrencyCode;
  isNameTaken: (name: string, exceptId: string) => boolean;
  onSave: (name: string, paidMinor: number) => void;
  onCancel: () => void;
}

function EditMemberForm({ participant, currency, isNameTaken, onSave, onCancel }: EditMemberFormProps) {
  const nameId = useId();
  const amountId = useId();
  const errorId = useId();
  const [name, setName] = useState(participant.name);
  const [amount, setAmount] = useState(minorToInput(participant.paidMinor, currency));
  const [error, setError] = useState<{ field: 'name' | 'amount'; message: string } | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nameError = validateName(name);
    if (nameError) return setError({ field: 'name', message: nameError });
    if (isNameTaken(name, participant.id)) {
      return setError({ field: 'name', message: 'Someone in the group already has that name' });
    }
    const parsed = amount.trim() === '' ? { ok: true as const, minor: 0 } : parseAmount(amount, currency);
    if (!parsed.ok) return setError({ field: 'amount', message: parsed.error });
    onSave(name, parsed.minor);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="rounded-2xl bg-grape-50 p-3 ring-2 ring-grape-200"
    >
      <div className="flex items-start gap-3">
        <MemberAvatar seed={participant.avatarSeed} className="mt-0.5" />
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]">
          <div>
            <label htmlFor={nameId} className="sr-only">
              Name
            </label>
            <input
              id={nameId}
              autoFocus
              className="field h-11 bg-white py-2 font-semibold"
              value={name}
              maxLength={MAX_NAME_LENGTH + 10}
              autoComplete="off"
              aria-invalid={error?.field === 'name'}
              aria-describedby={error?.field === 'name' ? errorId : undefined}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={amountId} className="sr-only">
              Amount paid
            </label>
            <AmountInput
              id={amountId}
              currency={currency}
              className="h-11 bg-white py-2"
              value={amount}
              aria-invalid={error?.field === 'amount'}
              aria-describedby={error?.field === 'amount' ? errorId : undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-coral-700">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error.message}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost h-10 px-4 text-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary h-10 px-5 text-sm">
          <Check className="size-4" aria-hidden />
          Save
        </button>
      </div>
    </form>
  );
}
