import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';

interface MultiPieceModalProps {
  parcel: Parcel;
  onClose: () => void;
}

/** Shows every piece of a multi-piece shipment with copy buttons (v4 parity). */
export default function MultiPieceModal({ parcel, onClose }: MultiPieceModalProps) {
  const { t } = useI18n();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  async function copy(text: string, track?: string) {
    try {
      await navigator.clipboard.writeText(text);
      if (track === undefined) {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
      } else {
        setCopiedTracking(track);
        setTimeout(() => setCopiedTracking(null), 1500);
      }
    } catch {
      /* clipboard unavailable */
    }
  }

  const allTrackings = parcel.subTrackings.map((p) => p.tracking).join('\n');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('parcels.pieces.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('parcels.pieces.title')}</h2>
          <button
            type="button"
            onClick={() => copy(allTrackings)}
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-xs font-bold text-white dark:bg-gray-100 dark:text-gray-900"
          >
            {copiedAll ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {t('parcels.pieces.copy_all')}
          </button>
        </div>

        <p className="mt-2 font-mono text-sm text-gray-500 dark:text-gray-400" dir="ltr">
          {parcel.tracking}
        </p>

        <ul className="mt-4 space-y-2">
          {parcel.subTrackings.map((piece, index) => (
            <li
              key={piece.tracking}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold" dir="ltr">
                  {piece.tracking}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('parcels.pieces.piece_of', { index: index + 1, total: parcel.piecesCount })}
                  {piece.pin !== undefined && <span className="ms-2 font-mono">PIN: {piece.pin}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy(piece.tracking, piece.tracking)}
                aria-label={t('parcels.pieces.copy_piece')}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {copiedTracking === piece.tracking ? (
                  <Check className="size-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
