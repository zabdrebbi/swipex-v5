import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

const AXIS_LOCK_PX = 8;
const REVEAL_PX = 10;
const THRESHOLD_PX = 80;
const RESET_MS = 240;
const SWALLOW_CLICK_MS = 200;

export interface CardSwipeOptions {
  /** Dragged right past the threshold (>= 80px): the call action (v4). */
  onSwipeRight: () => void;
  /** Dragged left past the threshold (<= -80px): open Yalidine (v4). */
  onSwipeLeft: () => void;
  disabled?: boolean;
}

interface SwipeState {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  axis: 'none' | 'x' | 'y';
  dx: number;
  /** A threshold was crossed: the next click on the card must be swallowed. */
  swiped: boolean;
}

/**
 * Horizontal swipe gesture for a single card, faithful to v4:
 *  - axis lock after 8px: vertical gestures keep scrolling the page,
 *  - the physical reveal layers appear from 10px,
 *  - the 80px threshold fires onSwipeRight / onSwipeLeft (never a status change),
 *  - the card springs back afterwards.
 *
 * The transform is written imperatively through refs: no React state update per
 * animation frame (AGENTS.md swipe rule).
 */
export function useCardSwipe(options: CardSwipeOptions) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<SwipeState>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: 'none',
    dx: 0,
    swiped: false,
  });
  const resetTimerRef = useRef<number | null>(null);
  const swallowTimerRef = useRef<number | null>(null);

  function clearResetTimer() {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }

  function applyTransform(dx: number) {
    const card = cardRef.current;
    if (card) {
      card.style.transition = 'none';
      card.style.transform = `translateX(${dx}px)`;
    }
    if (leftRef.current) leftRef.current.style.opacity = dx >= REVEAL_PX ? '1' : '0';
    if (rightRef.current) rightRef.current.style.opacity = dx <= -REVEAL_PX ? '1' : '0';
  }

  function release(animate: boolean) {
    const card = cardRef.current;
    if (card) {
      if (animate) {
        clearResetTimer();
        card.style.transition = `transform ${RESET_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        card.style.transform = 'translateX(0px)';
        resetTimerRef.current = window.setTimeout(() => {
          // Drop the transform entirely: a lingering `translateX(0)` would keep
          // the card a containing block and break `position: fixed` modals
          // rendered inside it (e.g. MultiPieceModal).
          card.style.transform = '';
          card.style.transition = '';
          resetTimerRef.current = null;
        }, RESET_MS + 40);
      } else {
        clearResetTimer();
        card.style.transform = '';
        card.style.transition = '';
      }
    }
    if (leftRef.current) leftRef.current.style.opacity = '0';
    if (rightRef.current) rightRef.current.style.opacity = '0';
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (options.disabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.pointerType === 'mouse') event.preventDefault(); // no text selection start
    clearResetTimer();
    if (swallowTimerRef.current !== null) {
      window.clearTimeout(swallowTimerRef.current);
      swallowTimerRef.current = null;
    }
    const st = stateRef.current;
    st.active = true;
    st.pointerId = event.pointerId;
    st.startX = event.clientX;
    st.startY = event.clientY;
    st.axis = 'none';
    st.dx = 0;
    st.swiped = false;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const st = stateRef.current;
    if (!st.active || event.pointerId !== st.pointerId || st.axis === 'y') return;
    const dx = event.clientX - st.startX;
    const dy = event.clientY - st.startY;
    if (st.axis === 'none') {
      if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
        st.axis = 'x';
        // Own the gesture from here on (needed for the mouse; touch is implicit).
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (Math.abs(dy) > AXIS_LOCK_PX) {
        st.axis = 'y';
        return;
      } else {
        return;
      }
    }
    st.dx = dx;
    applyTransform(dx);
  }

  function handleEnd(event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    const st = stateRef.current;
    if (!st.active || event.pointerId !== st.pointerId) return;
    st.active = false;
    const { axis, dx } = st;
    st.axis = 'none';
    st.dx = 0;
    release(true);
    if (cancelled || axis !== 'x') return;
    if (dx >= THRESHOLD_PX) st.swiped = true;
    else if (dx <= -THRESHOLD_PX) st.swiped = true;
    else return;
    if (dx >= 0) options.onSwipeRight();
    else options.onSwipeLeft();
    // The click that follows a completed swipe must not reach the card's buttons.
    if (swallowTimerRef.current !== null) window.clearTimeout(swallowTimerRef.current);
    swallowTimerRef.current = window.setTimeout(() => {
      stateRef.current.swiped = false;
      swallowTimerRef.current = null;
    }, SWALLOW_CLICK_MS);
  }

  function onPointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    const st = stateRef.current;
    // Without capture (axis not locked yet) the pointerup may land elsewhere:
    // cancel instead of leaving a stale gesture armed.
    if (st.active && event.pointerId === st.pointerId && st.axis !== 'x') {
      st.active = false;
      st.axis = 'none';
      st.dx = 0;
    }
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!stateRef.current.swiped) return;
    stateRef.current.swiped = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    cardRef,
    leftRef,
    rightRef,
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => handleEnd(event, false),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => handleEnd(event, true),
    onPointerLeave,
    onClickCapture,
  };
}
