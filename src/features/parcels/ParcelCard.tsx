import { useState } from 'react';
import { Check, Copy, Pencil, Phone, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';
import type { StatusRef } from '@/domain/status/types';
import MultiPieceModal from './MultiPieceModal';

interface ParcelCardProps {
  parcel: Parcel;
  /** Label resolver: built-in -> i18n, custom -> the user's three-language name. */
  statusLabel: (ref: StatusRef) => string;
  statusColor: (ref: StatusRef) => string;
  onOpenStatus: (parcel: Parcel) => void;
  onEdit: (parcel: Parcel) => void;
  onDelete: (parcel: Parcel) => void;
}

export default function ParcelCard({
  parcel,
  statusLabel,
  statusColor,
  onOpenStatus,
  onEdit,
  onDelete,
}: ParcelCardProps) {
  const { t, formatCurrency } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showPieces, setShowPieces] = useState(false);

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(parcel.tracking);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const color = statusColor(parcel.status);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => (parcel.isMultiPiece ? setShowPieces(true) : copyTracking())}
          title={parcel.isMultiPiece ? t('parcels.card.pieces') : t('parcels.card.copy_tracking')}
          className="flex items-center gap-1.5 font-mono text-sm font-bold text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
          dir="ltr"
        >
          {parcel.tracking}
          {copied && <Check className="size-4 text-emerald-500" aria-hidden="true" />}
          {!copied && !parcel.isMultiPiece && <Copy className="size-3.5 opacity-60" aria-hidden="true" />}
          {parcel.isMultiPiece && <span className="rounded bg-gray-200 px-1.5 text-xs dark:bg-gray-700">{parcel.piecesCount}×</span>}
        </button>
        <button
          type="button"
          onClick={() => onOpenStatus(parcel)}
          className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          <span className="size-2 rounded-full bg-white/80" aria-hidden="true" />
          {statusLabel(parcel.status)}
        </button>
      </div>

      <div className="mt-3 space-y-1">
        <p className="font-bold">{parcel.receiver || t('parcels.card.unknown_receiver')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {parcel.municipality}
          {parcel.amount > 0 && <span className="ms-2 font-bold text-gray-700 dark:text-gray-200">{formatCurrency(parcel.amount)}</span>}
        </p>
        <div className="flex flex-wrap gap-2 pt-1" dir="ltr">
          {[parcel.phone, parcel.phone2].filter((p): p is string => !!p).map((phone) => (
            <a
              key={phone}
              href={`tel:${phone}`}
              className="flex min-h-9 items-center gap-1 rounded-lg bg-gray-100 px-2.5 text-sm font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {phone}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-1 border-t border-gray-100 pt-2 dark:border-gray-800">
        <button
          type="button"
          onClick={() => onEdit(parcel)}
          aria-label={t('parcels.card.edit')}
          className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(parcel)}
          aria-label={t('parcels.card.delete')}
          className="flex size-11 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {showPieces && <MultiPieceModal parcel={parcel} onClose={() => setShowPieces(false)} />}
    </article>
  );
}
