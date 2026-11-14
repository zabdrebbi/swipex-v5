import type { ReactNode } from 'react';
import { Globe, Phone } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useCardSwipe } from './useCardSwipe';

interface SwipeableCardProps {
  children: ReactNode;
  /** Swipe right: call the receiver (or pick between two numbers). */
  onSwipeRight: () => void;
  /** Swipe left: open the parcel on Yalidine. */
  onSwipeLeft: () => void;
  /**
   * Content revealed on the physical LEFT edge (swipe right). Defaults to the
   * blue call action. Focus mode passes its "previous" affordance instead.
   */
  leftReveal?: ReactNode;
  /** Content revealed on the physical RIGHT edge (swipe left). Defaults to Yalidine. */
  rightReveal?: ReactNode;
  disabled?: boolean;
}

/**
 * Card wrapper providing the swipe gesture plus the two reveal layers behind
 * the content. The layers sit on PHYSICAL sides (left = call, right = Yalidine)
 * in both writing directions, hence `dir="ltr"` on the layers themselves.
 */
export default function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  leftReveal,
  rightReveal,
  disabled = false,
}: SwipeableCardProps) {
  const { t } = useI18n();
  const swipe = useCardSwipe({ onSwipeRight, onSwipeLeft, disabled });

  return (
    <div className="relative">
      <div
        ref={swipe.leftRef}
        dir="ltr"
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-start gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white opacity-0 transition-opacity duration-200"
      >
        {leftReveal ?? (
          <>
            <Phone className="size-5" />
            <span>{t('swipe.call')}</span>
          </>
        )}
      </div>
      <div
        ref={swipe.rightRef}
        dir="ltr"
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-end gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white opacity-0 transition-opacity duration-200"
      >
        {rightReveal ?? (
          <>
            <Globe className="size-5" />
            <span>{t('swipe.yalidine')}</span>
          </>
        )}
      </div>
      <div
        ref={swipe.cardRef}
        className="relative touch-pan-y"
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        onPointerLeave={swipe.onPointerLeave}
        onClickCapture={swipe.onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
