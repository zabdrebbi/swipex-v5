import { useCallback, useEffect, useState } from 'react';
import type { Parcel } from '@/domain/parcel/types';

export interface FocusModeState {
  /** Index inside the current (filtered) list, always in range. */
  index: number;
  current: Parcel | null;
  /** Wrap-around navigation — never auto-advances on its own. */
  goPrev: () => void;
  goNext: () => void;
}

/**
 * Index over the filtered list while focus mode is open: wraps around at both
 * ends, clamps when the list shrinks, and asks the host to close as soon as
 * the list is empty.
 */
export function useFocusMode(parcels: readonly Parcel[], enabled: boolean, onClose: () => void): FocusModeState {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIndex(0);
      return;
    }
    if (parcels.length === 0) {
      onClose();
      return;
    }
    if (index >= parcels.length) setIndex(parcels.length - 1);
  }, [enabled, parcels.length, index, onClose]);

  const goPrev = useCallback(() => {
    const length = Math.max(1, parcels.length); // never NaN on an empty list
    setIndex((current) => (current - 1 + length) % length);
  }, [parcels.length]);

  const goNext = useCallback(() => {
    const length = Math.max(1, parcels.length);
    setIndex((current) => (current + 1) % length);
  }, [parcels.length]);

  const safeIndex = parcels.length > 0 ? Math.min(index, parcels.length - 1) : 0;
  const current = enabled && parcels.length > 0 ? parcels[safeIndex] : null;

  return { index: safeIndex, current, goPrev, goNext };
}
