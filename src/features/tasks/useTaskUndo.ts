import { useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';
import type { Task } from '@/domain/task/types';

/** Undo window for destructive task actions (v4 keeps it generous). */
const UNDO_DURATION_MS = 6000;

interface OfferInput {
  /** The task EXACTLY as it was before the action (immutable state snapshot). */
  snapshot: Task;
  /** Toast line, already translated by the caller. */
  message: string;
  /** "Undo" label, already translated by the caller. */
  undoLabel: string;
  /** Restores the snapshot (status/completedAt back to what it was). */
  onUndo: (snapshot: Task) => void;
}

/**
 * One-shot undo: remembers the latest snapshot and shows a 6-second toast
 * whose action restores it. Only the most recent offer is kept — pressing
 * undo after a second action undoes that one (v4 semantics).
 */
export function useTaskUndo(): { offerUndo: (input: OfferInput) => void } {
  const { showToast } = useToast();
  const snapshotRef = useRef<Task | null>(null);

  const offerUndo = useCallback(
    ({ snapshot, message, undoLabel, onUndo }: OfferInput) => {
      snapshotRef.current = snapshot;
      showToast(message, {
        durationMs: UNDO_DURATION_MS,
        action: {
          label: undoLabel,
          onAction: () => {
            const latest = snapshotRef.current;
            snapshotRef.current = null;
            if (latest !== null) onUndo(latest);
          },
        },
      });
    },
    [showToast],
  );

  return { offerUndo };
}
