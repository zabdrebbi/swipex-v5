import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AtSign, Check, Copy, GripVertical, Pencil, Phone, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { Parcel } from '@/domain/parcel/types';
import type { StatusRef } from '@/domain/status/types';
import type { TagDef } from '@/domain/settings/types';
import MultiPieceModal from './MultiPieceModal';
import TagPickerModal from './TagPickerModal';

interface ParcelCardProps {
  parcel: Parcel;
  /** Label resolver: built-in -> i18n, custom -> the user's three-language name. */
  statusLabel: (ref: StatusRef) => string;
  statusColor: (ref: StatusRef) => string;
  onOpenStatus: (parcel: Parcel) => void;
  onEdit: (parcel: Parcel) => void;
  onDelete: (parcel: Parcel) => void;
  /** Drag-reorder handle wiring (step 9); omitted = handle hidden. */
  onReorderStart?: (event: ReactPointerEvent<HTMLElement>, tracking: string) => void;
  /**
   * The parcel's ACTIVE tag definition (settings ∩ stored name): the badge
   * only renders when the tag still exists, so a deleted tag stays hidden
   * without rewriting the parcel.
   */
  tagDef?: TagDef;
  /** Other parcels sharing a phone (0/omitted = no badge, v4 duplicates alert). */
  duplicateCount?: number;
  /** Present = the "@" button is shown and opens this picker. */
  tagPicker?: {
    /** Active tag definitions for the picker (municipality filtering inside). */
    defs: readonly TagDef[];
    /** `null` clears the stored tag (no other parcel is touched). */
    onPick: (tag: string | null) => void;
  };
}

export default function ParcelCard({
  parcel,
  statusLabel,
  statusColor,
  onOpenStatus,
  onEdit,
  onDelete,
  onReorderStart,
  tagDef,
  duplicateCount = 0,
  tagPicker,
}: ParcelCardProps) {
  const { t, formatCurrency } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showPieces, setShowPieces] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

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
    <article
      id={`parcel-card-${parcel.tracking}`}
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => (parcel.isMultiPiece ? setShowPieces(true) : copyTracking())}
            title={parcel.isMultiPiece ? t('parcels.card.pieces') : t('parcels.card.copy_tracking')}
            className="flex min-w-0 items-center gap-1.5 font-mono text-sm font-bold text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
            dir="ltr"
          >
            {parcel.tracking}
            {copied && <Check className="size-4 text-emerald-500" aria-hidden="true" />}
            {!copied && !parcel.isMultiPiece && <Copy className="size-3.5 opacity-60" aria-hidden="true" />}
            {parcel.isMultiPiece && <span className="rounded bg-gray-200 px-1.5 text-xs dark:bg-gray-700">{parcel.piecesCount}×</span>}
          </button>
          {duplicateCount > 0 && (
            <span
              title={t('parcels.card.duplicate_hint', { count: duplicateCount })}
              dir="ltr"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600 dark:bg-red-950/60 dark:text-red-400"
            >
              {duplicateCount}
            </span>
          )}
        </div>
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
        {tagDef !== undefined && (
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold"
            style={{ borderColor: tagDef.color, color: tagDef.color }}
            dir="ltr"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: tagDef.color }} aria-hidden="true" />
            @{tagDef.name}
          </span>
        )}
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

      <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2 dark:border-gray-800">
        {onReorderStart && (
          <button
            type="button"
            aria-label={t('reorder.handle')}
            title={t('reorder.handle')}
            // The swipe gesture must never claim a drag started on the handle.
            onPointerDown={(event) => {
              event.stopPropagation();
              onReorderStart(event, parcel.tracking);
            }}
            className="flex size-11 touch-none items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}
        <div className="ms-auto flex gap-1">
          {tagPicker !== undefined && (
            <button
              type="button"
              onClick={() => setShowTagPicker(true)}
              aria-label={t('tagpicker.title')}
              title={t('tagpicker.title')}
              className={`flex size-11 items-center justify-center rounded-xl ${
                tagDef !== undefined
                  ? 'text-white'
                  : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800'
              }`}
              style={tagDef !== undefined ? { backgroundColor: tagDef.color } : undefined}
            >
              <AtSign className="size-4" aria-hidden="true" />
            </button>
          )}
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
      </div>

      {showPieces && <MultiPieceModal parcel={parcel} onClose={() => setShowPieces(false)} />}

      {showTagPicker && tagPicker !== undefined && (
        <TagPickerModal
          parcel={parcel}
          tags={tagPicker.defs}
          onPick={tagPicker.onPick}
          onClose={() => setShowTagPicker(false)}
        />
      )}
    </article>
  );
}
