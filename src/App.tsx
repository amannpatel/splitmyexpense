import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { EmptyState } from './components/EmptyState';
import { GroupSummary } from './components/GroupSummary';
import { GroupTitle } from './components/GroupTitle';
import { Header } from './components/Header';
import { MemberEntryForm } from './components/MemberEntryForm';
import { MemberList } from './components/MemberList';
import { SettlementList } from './components/SettlementList';
import { useToast } from './components/Toast';
import { useSplitSession } from './hooks/useSplitSession';
import { copyText } from './lib/clipboard';
import { CURRENCIES, type CurrencyCode } from './lib/money';
import { buildSampleParticipants } from './lib/session';
import { calculateLedger } from './lib/settlement';
import { buildSettlementText } from './lib/shareText';
import { createSession } from './lib/storage';
import { findByName } from './lib/validation';

export default function App() {
  const { session, actions, loadStatus, saved } = useSplitSession();
  const toast = useToast();
  const [confirmNew, setConfirmNew] = useState(false);
  const { participants, currency } = session;
  const ledger = useMemo(() => calculateLedger(participants), [participants]);

  // Lets stable callbacks (passed to memoised rows) read the latest session without re-creating.
  const latest = useRef(session);
  useEffect(() => {
    latest.current = session;
  }, [session]);

  const announcedLoad = useRef(false);
  useEffect(() => {
    if (announcedLoad.current) return;
    announcedLoad.current = true;
    if (loadStatus === 'repaired') {
      toast({ tone: 'info', message: 'Some saved entries looked broken, so we skipped them.' });
    } else if (loadStatus === 'unreadable') {
      toast({ tone: 'info', message: "We couldn't read your last split, so here's a fresh one." });
    }
  }, [loadStatus, toast]);

  const isNameTaken = useCallback(
    (name: string, exceptId: string) => Boolean(findByName(latest.current.participants, name, exceptId)),
    [],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const index = latest.current.participants.findIndex((p) => p.id === id);
      const removed = latest.current.participants[index];
      if (!removed) return;
      actions.remove(id);
      toast({
        tone: 'info',
        message: `${removed.name} removed`,
        action: { label: 'Undo', onClick: () => actions.insert(removed, index) },
      });
    },
    [actions, toast],
  );

  const startFresh = useCallback(() => {
    const previous = latest.current;
    actions.replace(createSession(previous.currency));
    setConfirmNew(false);
    if (previous.participants.length > 0) {
      toast({ message: 'Fresh split started', action: { label: 'Undo', onClick: () => actions.replace(previous) } });
    }
  }, [actions, toast]);

  const handleNewSplit = () => {
    if (participants.length > 0) setConfirmNew(true);
    else startFresh();
  };

  const handleCurrency = (next: CurrencyCode) => {
    actions.setCurrency(next);
    if (participants.length > 0) {
      const name = CURRENCIES.find((c) => c.code === next)?.name ?? next;
      toast({ tone: 'info', message: `Switched to ${name}. Amounts kept as typed.` });
    }
  };

  const loadSample = () => {
    actions.replace({
      ...session,
      title: session.title || 'Weekend in Goa',
      participants: buildSampleParticipants(currency),
      settledTransferKeys: [],
      updatedAt: new Date().toISOString(),
    });
    toast({ message: 'Sample group loaded. Edit or remove anyone.' });
  };

  const handleCopy = useCallback(async () => {
    const current = latest.current;
    const text = buildSettlementText({
      title: current.title,
      currency: current.currency,
      participants: current.participants,
      ledger: calculateLedger(current.participants),
      settledKeys: current.settledTransferKeys,
    });
    const ok = await copyText(text);
    toast(
      ok
        ? { message: 'Copied! Paste it in your group chat.' }
        : { tone: 'error', message: "Couldn't copy. Your browser blocked the clipboard." },
    );
    return ok;
  }, [toast]);

  const hasPeople = participants.length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh pb-24">
        <Header saved={saved} onNewSplit={handleNewSplit} />

        <main className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="pt-6 pb-5 sm:pt-10 sm:pb-7">
            <h1 className="font-display text-[2.1rem] leading-[1.05] font-black tracking-tight sm:text-5xl">
              Who owes{' '}
              <span className="relative inline-block">
                <span className="relative z-10">who?</span>
                <span
                  aria-hidden
                  className="absolute inset-x-[-0.15em] bottom-[0.08em] h-[0.38em] -rotate-2 rounded-full bg-sunny-300"
                />
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-muted sm:text-lg">
              Add your friends, enter what they paid, and let us do the math.
            </p>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-7">
            <div className="space-y-5">
              <section aria-label="Add a friend" className="card p-4 sm:p-6">
                <GroupTitle
                  title={session.title}
                  currency={currency}
                  onTitleChange={actions.setTitle}
                  onCurrencyChange={handleCurrency}
                />
                <div className="my-4 h-px bg-line" />
                <MemberEntryForm
                  currency={currency}
                  participants={participants}
                  onAdd={actions.add}
                  onAddToExisting={actions.addToExisting}
                />
              </section>

              {hasPeople && (
                <MemberList
                  participants={participants}
                  currency={currency}
                  isNameTaken={isNameTaken}
                  onUpdate={actions.update}
                  onRemove={handleRemove}
                />
              )}
            </div>

            <div className="space-y-5 lg:sticky lg:top-20">
              <AnimatePresence mode="wait" initial={false}>
                {hasPeople ? (
                  <motion.div
                    key="results"
                    className="space-y-5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <GroupSummary ledger={ledger} participants={participants} currency={currency} />
                    <SettlementList
                      ledger={ledger}
                      participants={participants}
                      currency={currency}
                      settledKeys={session.settledTransferKeys}
                      onToggle={actions.toggleSettled}
                      onResetSettled={actions.resetSettled}
                      onCopy={handleCopy}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <EmptyState onTrySample={loadSample} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <footer className="mt-12 flex flex-col items-center gap-4 text-center text-xs text-muted">
            <p>Saved only in this browser. Nothing is uploaded, and friends won't see your changes.</p>
            <a
              href="https://my-portfolio-1ct0c5aqn-amanpatels-projects-728f8482.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-line transition-transform duration-300 hover:-rotate-2 hover:scale-105 hover:ring-grape-200"
            >
              <span aria-hidden>🧾</span>
              Made with
              <span aria-hidden className="inline-block motion-safe:animate-heartbeat">
                ❤️
              </span>
              <span className="sr-only">love</span>
              by
              <span className="bg-linear-90 from-grape-500 to-coral-500 bg-clip-text font-display text-base font-black tracking-tight text-transparent">
                Aman
              </span>
              <span aria-hidden className="inline-block transition-transform duration-500 group-hover:rotate-180">
                ✨
              </span>
              <span className="sr-only">(opens Aman's portfolio in a new tab)</span>
            </a>
          </footer>
        </main>

        <ConfirmDialog
          open={confirmNew}
          emoji="🧾"
          title="Start a new split?"
          description="This clears everyone in the current group. You can undo right after."
          confirmLabel="Start fresh"
          onConfirm={startFresh}
          onCancel={() => setConfirmNew(false)}
        />
      </div>
    </MotionConfig>
  );
}
