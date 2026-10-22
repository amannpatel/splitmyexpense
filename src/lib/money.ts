/**
 * Currency helpers. All arithmetic happens on integer minor units (paise, cents, fils…).
 * Conversion to floating point only ever happens at the very edge, for display.
 */

export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', locale: 'en-IE' },
  { code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  { code: 'AED', name: 'UAE Dirham', locale: 'en-AE' },
  { code: 'SGD', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'AUD', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'JPY', name: 'Japanese Yen', locale: 'en-JP' },
  { code: 'KWD', name: 'Kuwaiti Dinar', locale: 'en-KW' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

/** Upper bound for a single contribution, in minor units. Keeps all sums far below Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT_MINOR = 10_000_000_000_000;

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCIES.some((c) => c.code === value);
}

function localeFor(currency: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === currency)?.locale ?? 'en-IN';
}

const precisionCache = new Map<CurrencyCode, number>();

/** Number of minor-unit digits for a currency, derived from Intl (INR → 2, JPY → 0, KWD → 3). */
export function getPrecision(currency: CurrencyCode): number {
  let precision = precisionCache.get(currency);
  if (precision === undefined) {
    precision =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    precisionCache.set(currency, precision);
  }
  return precision;
}

export function getMinorScale(currency: CurrencyCode): number {
  return 10 ** getPrecision(currency);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: CurrencyCode, fractionDigits: number): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeFor(currency), {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** Formats minor units for display. Whole amounts drop the decimals (₹1,200), others keep them (₹1,200.50). */
export function formatMoney(minor: number, currency: CurrencyCode): string {
  const scale = getMinorScale(currency);
  const digits = minor % scale === 0 ? 0 : getPrecision(currency);
  return getFormatter(currency, digits).format(minor / scale);
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  const part = getFormatter(currency, 0)
    .formatToParts(0)
    .find((p) => p.type === 'currency');
  return part?.value ?? currency;
}

export type ParseAmountResult = { ok: true; minor: number } | { ok: false; error: string };

/**
 * Parses user-entered text into integer minor units without going through floating point.
 * Accepts grouping separators ("1,200.50"), a leading currency symbol, and partial decimals (".5", "12.").
 */
export function parseAmount(raw: string, currency: CurrencyCode): ParseAmountResult {
  const cleaned = raw
    .trim()
    .replace(/[\s,_']/g, '')
    .replace(/^[^\p{L}\d.-]+/u, '');

  if (cleaned === '') return { ok: false, error: 'Enter an amount, like 250' };
  if (cleaned.startsWith('-')) return { ok: false, error: "Amounts can't be negative" };

  const match = /^(\d*)(?:\.(\d*))?$/.exec(cleaned);
  const whole = match?.[1] ?? '';
  const fraction = match?.[2] ?? '';
  if (!match || (whole === '' && fraction === '')) {
    return { ok: false, error: "That doesn't look like an amount" };
  }

  const precision = getPrecision(currency);
  if (fraction.length > precision) {
    return {
      ok: false,
      error: precision === 0 ? `${currency} doesn't use decimals` : `Use at most ${precision} decimal places`,
    };
  }

  const wholeDigits = whole.replace(/^0+(?=\d)/, '');
  const maxWholeDigits = String(MAX_AMOUNT_MINOR).length;
  if (wholeDigits.length > maxWholeDigits) return { ok: false, error: tooLargeMessage(currency) };

  const minor = Number(wholeDigits || '0') * 10 ** precision + Number(fraction.padEnd(precision, '0') || '0');
  if (!Number.isSafeInteger(minor) || minor > MAX_AMOUNT_MINOR) {
    return { ok: false, error: tooLargeMessage(currency) };
  }
  return { ok: true, minor };
}

function tooLargeMessage(currency: CurrencyCode): string {
  return `That's a lot! Keep it under ${formatMoney(MAX_AMOUNT_MINOR, currency)}`;
}

/** Converts minor units to an editable plain string ("1200.5" → "1200.50", whole amounts without decimals). */
export function minorToInput(minor: number, currency: CurrencyCode): string {
  const precision = getPrecision(currency);
  const scale = 10 ** precision;
  const whole = Math.floor(minor / scale);
  const fraction = minor - whole * scale;
  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(precision, '0')}`;
}

/** Converts whole major units (e.g. rupees) to minor units. */
export function majorToMinor(major: number, currency: CurrencyCode): number {
  return major * getMinorScale(currency);
}

/**
 * Re-expresses an amount when the currency changes, keeping the number the user typed.
 * When the new currency has fewer decimals, the amount is rounded half-up using integer math.
 */
export function rescaleMinor(minor: number, from: CurrencyCode, to: CurrencyCode): number {
  const diff = getPrecision(to) - getPrecision(from);
  if (diff >= 0) return minor * 10 ** diff;
  const factor = 10 ** -diff;
  const quotient = Math.floor(minor / factor);
  const remainder = minor - quotient * factor;
  return quotient + (remainder * 2 >= factor ? 1 : 0);
}
