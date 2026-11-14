import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface DragReorderOptions {
  /** Trackings of the visible (filtered) list, in display order. */
  visibleTrackings: readonly string[];
  /** Trackings of the full provider list, in display order. */
  fullTrackings: readonly string[];
  /** Drop callback with the destination index in the FULL list. */
  onReorder: (tracking: string, toFullIndex: number) => void;
}

/**
 * Maps a drop target expressed in the VISIBLE list to an index in the FULL
 * list: the parcel lands right before the visible anchor, or right after the
 * last visible parcel when dropped at the end.
 *
 * `moveParcel` splices the parcel OUT first, so full-list indices after the
 * origin shift down by one — hence `shift`.
 */
function visibleToFullIndex(
  visible: readonly string[],
  full: readonly string[],
  tracking: string,
  visibleTarget: number,
): number | null {
  const from = full.indexOf(tracking);
  if (from === -1) return null;
  const target = Math.max(0, Math.min(visible.length, visibleTarget));
  const origin = visible.indexOf(tracking);
  if (target === origin) return null;

  const shift = (index: number) => (index > from ? index - 1 : index);

  if (target === visible.length) {
    const last = visible[visible.length - 1];
    if (last === undefined || last === tracking) return null;
    const lastFull = full.indexOf(last);
    if (lastFull === -1) return null;
    return Math.min(full.length - 1, shift(lastFull) + 1);
  }

  const anchor = full.indexOf(visible[target]);
  if (anchor === -1) return null;
  return shift(anchor);
}

interface DragSession {
  pointerId: number;
  startY: number;
  dragged: HTMLElement;
  items: HTMLElement[];
  rects: DOMRect[];
  /** Insertion index in the VISIBLE list (items.length = after the last one). */
  target: number;
  outlined: number | null;
}

/**
 * Pointer-driven drag-reorder over the visible list. Geometry is captured once
 * at drag start and the DOM is moved/annotated directly (no React state per
 * frame); only the final drop goes through `onReorder` with a FULL-list index.
 *
 * The handle element must call `event.stopPropagation()` on pointerdown so the
 * card swipe never claims the gesture, and needs `touch-action: none`.
 */
export function useDragReorder(options: DragReorderOptions) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const optionsRef = useRef(options);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  });

  // Unmounting mid-drag must not leave window listeners behind.
  useEffect(() => () => cleanupRef.current?.(), []);

  const startDrag = useCallback((event: ReactPointerEvent<HTMLElement>, tracking: string) => {
    const list = listRef.current;
    if (!list) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-tracking]'));
    const dragged = items.find((item) => item.dataset.tracking === tracking);
    if (!dragged) return;

    const pointerId = event.pointerId;
    const startY = event.clientY;
    const rects = items.map((item) => item.getBoundingClientRect());
    const session: DragSession = {
      pointerId,
      startY,
      dragged,
      items,
      rects,
      target: items.indexOf(dragged),
      outlined: null,
    };

    const element = event.currentTarget;
    try {
      element.setPointerCapture(pointerId);
    } catch {
      /* capture unsupported: window listeners still receive the events */
    }

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    function setOutline(index: number | null) {
      if (session.outlined !== null) {
        const previous = session.items[session.outlined];
        if (previous) {
          previous.style.outline = '';
          previous.style.outlineOffset = '';
        }
      }
      session.outlined = index !== null && index < session.items.length ? index : null;
      if (session.outlined !== null) {
        const target = session.items[session.outlined];
        target.style.outline = '2px solid #2563eb';
        target.style.outlineOffset = '-2px';
      }
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      document.body.style.userSelect = previousUserSelect;
      session.dragged.style.transform = '';
      session.dragged.style.position = '';
      session.dragged.style.zIndex = '';
      setOutline(null);
      cleanupRef.current = null;
    }

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== session.pointerId) return;
      const dy = moveEvent.clientY - session.startY;
      session.dragged.style.transform = `translateY(${dy}px)`;
      session.dragged.style.position = 'relative';
      session.dragged.style.zIndex = '10';
      let next = session.items.length; // default: after the last visible item
      for (let i = 0; i < session.rects.length; i += 1) {
        const rect = session.rects[i];
        if (moveEvent.clientY < rect.top + rect.height / 2) {
          next = i;
          break;
        }
      }
      if (next !== session.target) {
        session.target = next;
        setOutline(next < session.items.length ? next : null);
      }
    }

    function finish(endEvent: PointerEvent, dropped: boolean) {
      if (endEvent.pointerId !== session.pointerId) return;
      cleanup();
      if (!dropped) return;
      const { visibleTrackings, fullTrackings, onReorder } = optionsRef.current;
      const toIndex = visibleToFullIndex(visibleTrackings, fullTrackings, tracking, session.target);
      if (toIndex !== null) onReorder(tracking, toIndex);
    }

    function onUp(upEvent: PointerEvent) {
      finish(upEvent, true);
    }

    function onCancel(cancelEvent: PointerEvent) {
      finish(cancelEvent, false);
    }

    cleanupRef.current = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }, []);

  return { listRef, startDrag };
}
