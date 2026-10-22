import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { formatMoney, type CurrencyCode } from '../lib/money';

interface AnimatedMoneyProps {
  minor: number;
  currency: CurrencyCode;
  className?: string;
}

/** Counts up/down to the new value. Screen readers get the final value only. */
export function AnimatedMoney({ minor, currency, className }: AnimatedMoneyProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(minor);
  const current = useRef(minor);

  useEffect(() => {
    if (reduceMotion || current.current === minor) {
      current.current = minor;
      setShown(minor);
      return;
    }
    const controls = animate(current.current, minor, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        current.current = Math.round(value);
        setShown(current.current);
      },
    });
    return () => controls.stop();
  }, [minor, reduceMotion]);

  return (
    <span className={className}>
      <span aria-hidden>{formatMoney(shown, currency)}</span>
      <span className="sr-only">{formatMoney(minor, currency)}</span>
    </span>
  );
}
