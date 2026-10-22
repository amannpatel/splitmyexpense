import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { createId } from '../lib/id';

export interface ToastOptions {
  message: string;
  tone?: 'success' | 'info' | 'error';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

const ToastContext = createContext<(toast: ToastOptions) => void>(() => {});

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert } as const;
const ICON_COLORS = { success: 'text-mint-400', info: 'text-sky-400', error: 'text-coral-400' } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastOptions) => {
      const id = createId();
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      const duration = toast.duration ?? (toast.action ? 6000 : 3200);
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const tone = toast.tone ?? 'success';
            const Icon = ICONS[tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink py-2.5 pr-2 pl-4 text-sm text-white shadow-lift"
              >
                <Icon className={`size-5 shrink-0 ${ICON_COLORS[tone]}`} aria-hidden />
                <p className="min-w-0 flex-1 font-medium">{toast.message}</p>
                {toast.action && (
                  <button
                    type="button"
                    className="btn h-8 shrink-0 bg-white/12 px-3 text-sm text-sunny-300 hover:bg-white/20"
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
