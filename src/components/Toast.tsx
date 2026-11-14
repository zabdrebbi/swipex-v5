import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  /** Optional action button (e.g. "Undo"); clicking it dismisses first. */
  action?: ToastAction;
  /** Auto-dismiss delay; 6000 for undo toasts (v4). */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

/**
 * Global toast host: one toast at a time (the newest replaces the previous),
 * rendered above the focus overlay (z-45) and below modals (z-50).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Leaving the app mid-toast must not fire a stale state update.
  useEffect(() => clearTimer, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      clearTimer();
      nextIdRef.current += 1;
      setToast({ id: nextIdRef.current, message, action: options?.action });
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, options?.durationMs ?? DEFAULT_DURATION_MS);
    },
    [clearTimer],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast !== null && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[46] flex justify-center px-4 lg:bottom-6"
        >
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md items-center gap-4 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-gray-900"
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  const action = toast.action;
                  dismiss();
                  action?.onAction();
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-blue-400 hover:bg-white/10 dark:text-blue-600 dark:hover:bg-black/10"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
