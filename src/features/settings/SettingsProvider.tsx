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
import { createDefaultSettings } from '@/domain/settings/defaults';
import type { Settings } from '@/domain/settings/types';
import { loadSettings, saveSettingsPatch, type SettingsLoadResult } from '@/lib/firebase/settingsRepo';
import { useUser } from '@/features/auth/AuthProvider';

export type SettingsStatus =
  /** Reading the cloud document (or timed out). */
  | 'loading'
  /** Loaded (existing document or seeded first-run): cloud writes allowed. */
  | 'ready'
  /** Cloud unreachable: display defaults, writes BLOCKED to avoid overwriting. */
  | 'error';

interface SettingsContextValue {
  status: SettingsStatus;
  settings: Settings;
  /** Queues changed fields only; debounced flush once `status === 'ready'`. */
  updateSettings: (patch: Partial<Settings>) => void;
  /** Full replacement used by backup import (still writes changed keys only). */
  replaceSettings: (next: Settings) => void;
  /** Re-runs the initial cloud load after a failure. */
  retryLoad: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const FLUSH_DELAY_MS = 800;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const uid = user.uid;
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [settings, setSettings] = useState<Settings>(() => createDefaultSettings(todayString()));

  /** Changed keys awaiting the next cloud write: never the whole document. */
  const dirtyRef = useRef<Partial<Settings>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SettingsStatus>('loading');
  statusRef.current = status;

  const flush = useCallback(() => {
    const patch = dirtyRef.current;
    if (Object.keys(patch).length === 0) return;
    if (statusRef.current !== 'ready') return; // blocked while loading or after a failed load
    dirtyRef.current = {};
    saveSettingsPatch(uid, patch).catch(() => {
      // Re-queue so the next flush retries what did not reach the cloud.
      dirtyRef.current = { ...patch, ...dirtyRef.current };
    });
  }, [uid]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
  }, [flush]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      dirtyRef.current = { ...dirtyRef.current, ...patch };
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Initial cloud load (one attempt per uid; manual reloads re-run via key).
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    loadSettings(uid, todayString()).then((result: SettingsLoadResult) => {
      if (cancelled) return;
      setSettings(result.settings);
      if (result.status === 'failed') {
        setStatus('error');
        return;
      }
      setStatus('ready');
      if (result.status === 'missing') {
        // Brand-new account: seed the document once (writes are allowed now).
        saveSettingsPatch(uid, result.settings).catch(() => {
          /* offline persistence queues it */
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid, loadAttempt]);

  // Flush any pending patch as soon as the document becomes writable.
  useEffect(() => {
    if (status === 'ready' && Object.keys(dirtyRef.current).length > 0) flush();
  }, [status, flush]);

  // Retry automatically when connectivity returns after a failed load.
  useEffect(() => {
    if (status !== 'error') return;
    const retry = () => setLoadAttempt((n) => n + 1);
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [status]);

  // Never leak the debounce timer across unmounts.
  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const replaceSettings = useCallback(
    (next: Settings) => {
      const patch: Partial<Settings> = {};
      for (const key of Object.keys(next) as (keyof Settings)[]) {
        if (JSON.stringify(next[key]) !== JSON.stringify(settings[key])) {
          (patch as Record<string, unknown>)[key] = next[key];
        }
      }
      setSettings(next);
      dirtyRef.current = { ...dirtyRef.current, ...patch };
      scheduleFlush();
    },
    [settings, scheduleFlush],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ status, settings, updateSettings, replaceSettings, retryLoad: () => setLoadAttempt((n) => n + 1) }),
    [status, settings, updateSettings, replaceSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
