import { motion, useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';

const DEMO_SEEDS = ['splitzy-a', 'splitzy-hello', 'splitzy-c'];

const STEPS = ['Add friends', 'Enter what they paid', 'Settle up'];

export function EmptyState({ onTrySample }: { onTrySample: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <section aria-labelledby="empty-heading" className="card px-6 py-9 text-center sm:py-12">
      <div aria-hidden className="mb-5 flex justify-center -space-x-2">
        {DEMO_SEEDS.map((seed, i) => (
          <motion.div
            key={seed}
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
            className="rounded-full ring-4 ring-white"
          >
            <MemberAvatar seed={seed} size="lg" />
          </motion.div>
        ))}
      </div>
      <h2 id="empty-heading" className="font-display text-2xl font-black tracking-tight">
        Your split shows up here
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-muted">
        Add the first friend and what they paid. Totals, fair shares and who pays whom update instantly.
      </p>
      <ol className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-2 text-sm font-semibold">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 ring-1 ring-line">
            <span className="grid size-5 place-items-center rounded-full bg-grape-500 text-xs text-white">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-soft mt-6 h-11 px-5" onClick={onTrySample}>
        <Sparkles className="size-4" aria-hidden />
        Try a sample group
      </button>
    </section>
  );
}
