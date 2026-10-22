import { Pencil } from 'lucide-react';
import { CURRENCIES, getCurrencySymbol, type CurrencyCode } from '../lib/money';
import { MAX_TITLE_LENGTH } from '../lib/validation';

interface GroupTitleProps {
  title: string;
  currency: CurrencyCode;
  onTitleChange: (title: string) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function GroupTitle({ title, currency, onTitleChange, onCurrencyChange }: GroupTitleProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="group relative flex min-w-0 flex-1 items-center">
        <span className="sr-only">Name this split</span>
        <input
          className="w-full min-w-0 rounded-xl bg-transparent py-1.5 pr-8 pl-2 font-display text-lg font-extrabold tracking-tight placeholder:font-bold placeholder:text-ink/35 hover:bg-grape-50 focus:bg-grape-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-grape-500"
          placeholder="Name this split (optional)"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          autoComplete="off"
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <Pencil
          aria-hidden
          className="pointer-events-none absolute right-2.5 size-4 text-ink/30 transition-colors group-hover:text-grape-500"
        />
      </label>
      <label className="relative shrink-0">
        <span className="sr-only">Currency</span>
        <select
          className="h-9 cursor-pointer appearance-none rounded-full bg-sunny-100 pr-3 pl-3 text-sm font-bold text-sunny-700 hover:bg-sunny-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-grape-500"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
        >
          {CURRENCIES.map((c) => {
            const symbol = getCurrencySymbol(c.code);
            return (
              <option key={c.code} value={c.code}>
                {symbol === c.code ? c.code : `${symbol} ${c.code}`}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}
