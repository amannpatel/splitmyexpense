import { describe, expect, it } from 'vitest';
import { formatMoney, getPrecision, minorToInput, parseAmount, rescaleMinor } from './money';

describe('getPrecision', () => {
  it('derives minor-unit digits per currency', () => {
    expect(getPrecision('INR')).toBe(2);
    expect(getPrecision('JPY')).toBe(0);
    expect(getPrecision('KWD')).toBe(3);
  });
});

describe('parseAmount', () => {
  it.each([
    ['250', 25000],
    ['250.5', 25050],
    ['250.05', 25005],
    ['.5', 50],
    ['12.', 1200],
    ['1,200', 120000],
    ['₹ 1,200.75', 120075],
    ['0', 0],
    ['007', 700],
  ])('parses %s', (input, expected) => {
    expect(parseAmount(input, 'INR')).toEqual({ ok: true, minor: expected });
  });

  it.each(['', '   ', 'abc', '1.2.3', '.', '1e5', 'NaN', 'Infinity'])('rejects %j', (input) => {
    expect(parseAmount(input, 'INR').ok).toBe(false);
  });

  it('rejects negative amounts with a friendly message', () => {
    expect(parseAmount('-5', 'INR')).toEqual({ ok: false, error: "Amounts can't be negative" });
  });

  it('respects currency precision', () => {
    expect(parseAmount('1.234', 'INR').ok).toBe(false);
    expect(parseAmount('1.234', 'KWD')).toEqual({ ok: true, minor: 1234 });
    expect(parseAmount('1.5', 'JPY').ok).toBe(false);
    expect(parseAmount('1500', 'JPY')).toEqual({ ok: true, minor: 1500 });
  });

  it('rejects absurdly large amounts', () => {
    expect(parseAmount('99999999999999999999', 'INR').ok).toBe(false);
  });
});

describe('formatMoney', () => {
  it('uses Indian grouping for INR and drops zero decimals', () => {
    expect(formatMoney(120000, 'INR')).toBe('₹1,200');
    expect(formatMoney(12345678900, 'INR')).toBe('₹12,34,56,789');
    expect(formatMoney(120050, 'INR')).toBe('₹1,200.50');
  });

  it('handles zero-decimal and three-decimal currencies', () => {
    expect(formatMoney(1500, 'JPY')).toMatch(/1,500/);
    expect(formatMoney(1234, 'KWD')).toMatch(/1\.234/);
  });
});

describe('minorToInput / rescaleMinor', () => {
  it('round-trips to an editable string', () => {
    expect(minorToInput(120050, 'INR')).toBe('1200.50');
    expect(minorToInput(5, 'INR')).toBe('0.05');
    expect(minorToInput(120000, 'INR')).toBe('1200');
  });

  it('keeps the typed number when switching currency', () => {
    expect(rescaleMinor(12345, 'INR', 'KWD')).toBe(123450);
    expect(rescaleMinor(12345, 'INR', 'JPY')).toBe(123);
    expect(rescaleMinor(12350, 'INR', 'JPY')).toBe(124);
    expect(rescaleMinor(500, 'JPY', 'INR')).toBe(50000);
  });
});
