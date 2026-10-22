import { forwardRef, type InputHTMLAttributes } from 'react';
import { getCurrencySymbol, type CurrencyCode } from '../lib/money';

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  currency: CurrencyCode;
}

/** Text input with a numeric keypad on mobile and the currency symbol inset on the left. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { currency, className = '', ...props },
  ref,
) {
  const symbol = getCurrencySymbol(currency);
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-bold text-grape-500"
      >
        {symbol}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        className={`field tabular font-bold ${className}`}
        style={{ paddingLeft: `${1.6 + symbol.length * 0.6}rem` }}
        {...props}
      />
    </div>
  );
});
