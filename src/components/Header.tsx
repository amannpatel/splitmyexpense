import { CloudOff, HardDrive, Plus } from 'lucide-react';

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" fill="var(--color-grape-500)" />
      <path d="M30 14a18 18 0 0 0 0 36z" fill="var(--color-coral-500)" />
      <path d="M34 14a18 18 0 0 1 0 36z" fill="var(--color-mint-500)" />
      <circle cx="32" cy="32" r="6" fill="var(--color-sunny-400)" />
    </svg>
  );
}

interface HeaderProps {
  saved: boolean;
  onNewSplit: () => void;
}

export function Header({ saved, onNewSplit }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo className="size-9 -rotate-6 transition-transform duration-300 hover:rotate-6" />
          <span className="font-display text-xl font-black tracking-tight">Splitzy</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {saved ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1.5 text-xs font-semibold text-mint-700"
              title="Your split is saved in this browser only"
            >
              <HardDrive className="size-3.5" aria-hidden />
              <span className="sm:hidden">Saved</span>
              <span className="hidden sm:inline">Saved on this device</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-700"
              title="This browser is blocking storage, so your split will be lost on refresh"
            >
              <CloudOff className="size-3.5" aria-hidden />
              Not saved
            </span>
          )}
          <button type="button" className="btn btn-soft h-10 px-3.5 text-sm sm:px-4" onClick={onNewSplit}>
            <Plus className="size-4" aria-hidden />
            New split
          </button>
        </div>
      </div>
    </header>
  );
}
