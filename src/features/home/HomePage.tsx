import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, FileUp, Loader2, PackagePlus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useStatusDisplay } from '@/features/parcels/useStatusDisplay';
import { useNewDayArchive } from '@/features/archive/useNewDayArchive';
import { useListFilters } from '@/features/parcels/useListFilters';
import { useDragReorder } from '@/features/parcels/reorder/useDragReorder';
import ParcelCard from '@/features/parcels/ParcelCard';
import AddParcelModal from '@/features/parcels/AddParcelModal';
import EditParcelModal from '@/features/parcels/EditParcelModal';
import StatusChangeModal from '@/features/parcels/StatusChangeModal';
import ImportModal from '@/features/import/ImportModal';
import SearchBar from '@/features/parcels/SearchBar';
import FilterBar from '@/features/parcels/FilterBar';
import SwipeableCard from '@/features/parcels/swipe/SwipeableCard';
import PhonePickDialog from '@/features/parcels/PhonePickDialog';
import DailySummary from '@/features/home/DailySummary';
import FocusMode from '@/features/focus/FocusMode';
import { exportParcelsFile } from '@/lib/excel/sheetIo';
import ConfirmDialog from '@/components/ConfirmDialog';
import { computeDailySummary, sumAmount } from '@/domain/list/dailySummary';
import { filterParcels, statusCounts, usedMunicipalities, usedTags, type FilterContext } from '@/domain/list/query';
import { telLink, yalidineLink } from '@/domain/contact/links';
import type { Parcel } from '@/domain/parcel/types';

type ModalState =
  | { kind: 'add' }
  | { kind: 'import' }
  | { kind: 'edit'; parcel: Parcel }
  | { kind: 'status'; parcel: Parcel }
  | { kind: 'delete'; parcel: Parcel }
  | null;

/** Excel export feedback: `working` shows a spinner, the rest an inline alert. */
type ExportState = 'idle' | 'working' | 'empty' | 'failed';

export default function HomePage() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { status, parcels, addParcel, updateParcel, removeParcels, changeStatus, reorder } = useParcels();
  const { statusLabel, statusColor } = useStatusDisplay();
  const [modal, setModal] = useState<ModalState>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [pickedPhones, setPickedPhones] = useState<string[] | null>(null);

  const { filters, ...filterApi } = useListFilters();

  // A new calendar day archives yesterday's list before anything renders it.
  useNewDayArchive();

  const favouritePhones = useMemo<ReadonlySet<string>>(
    () => new Set(settings.favoritePhones.map((favourite) => favourite.phone)),
    [settings.favoritePhones],
  );
  const filterCtx = useMemo<FilterContext>(() => ({ favouritePhones }), [favouritePhones]);

  const filtered = useMemo(() => filterParcels(parcels, filters, filterCtx), [parcels, filters, filterCtx]);
  const counts = useMemo(() => statusCounts(parcels, filters, filterCtx), [parcels, filters, filterCtx]);
  const municipalities = useMemo(() => usedMunicipalities(parcels), [parcels]);
  const tags = useMemo(() => {
    const order = new Map<string, number>(settings.tagOrder.map((name, index) => [name, index]));
    return usedTags(parcels).sort(
      (a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [parcels, settings.tagOrder]);
  const summary = useMemo(() => computeDailySummary(parcels, settings.statusOrder), [parcels, settings.statusOrder]);
  const visibleAmount = useMemo(() => sumAmount(filtered), [filtered]);

  const { listRef, startDrag } = useDragReorder({
    visibleTrackings: filtered.map((parcel) => parcel.tracking),
    fullTrackings: parcels.map((parcel) => parcel.tracking),
    onReorder: (tracking, toIndex) => reorder(tracking, toIndex),
  });

  const closeFocus = useCallback(() => setFocusOpen(false), []);
  function findTracking(tracking: string) {
    setFocusOpen(false);
    setSearchOpen(true);
    filterApi.setSearch(tracking);
  }

  function swipeToCall(parcel: Parcel) {
    const phones = [parcel.phone, parcel.phone2].filter((phone): phone is string => !!phone);
    if (phones.length > 1) setPickedPhones(phones);
    else if (phones.length === 1) window.location.href = telLink(phones[0]);
  }

  function swipeToYalidine(parcel: Parcel) {
    const url = yalidineLink(parcel.tracking);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  const isTrackingFree = (tracking: string, except: string) =>
    !parcels.some((p) => p.tracking === tracking && p.tracking !== except);

  async function handleExport() {
    if (parcels.length === 0) {
      setExportState('empty');
      return;
    }
    setExportState('working');
    try {
      await exportParcelsFile(parcels, t, statusLabel);
      setExportState('idle');
    } catch {
      setExportState('failed');
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        <span className="text-sm font-bold">{t('parcels.loading')}</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="size-8 text-red-500" aria-hidden="true" />
        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('parcels.load_error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('nav.home')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ kind: 'import' })}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <FileUp className="size-4" aria-hidden="true" />
            {t('import.button')}
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            aria-label={t('export.button')}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {exportState === 'working' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="size-4" aria-hidden="true" />
            )}
            {t('export.button')}
          </button>
        </div>
      </div>

      {exportState === 'working' && (
        <p role="status" className="text-xs font-bold text-gray-500 dark:text-gray-400">
          {t('export.working')}
        </p>
      )}

      {(exportState === 'empty' || exportState === 'failed') && (
        <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
          {exportState === 'empty' ? t('export.empty') : t('export.error')}
        </p>
      )}

      {parcels.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
          <p className="font-bold text-gray-600 dark:text-gray-300">{t('parcels.empty_title')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('parcels.empty_body')}</p>
        </div>
      ) : (
        <>
          <DailySummary
            summary={summary}
            statusLabel={statusLabel}
            statusColor={statusColor}
            visibleCount={filtered.length}
            visibleAmount={visibleAmount}
            focusEnabled={filtered.length > 0}
            onFocus={() => setFocusOpen(true)}
          />

          {/* Plain wrapper: the sticky bar must NOT carry the space-y margin
              (an unpainted margin band would let the list show through above
              it while stuck). Its own padding provides the visual gap. */}
          <div>
            <SearchBar
              value={filters.search}
              open={searchOpen}
              onToggleOpen={() => setSearchOpen((value) => !value)}
              onChange={filterApi.setSearch}
            />

            <FilterBar
              filters={filters}
              api={filterApi}
              searchOpen={searchOpen}
              counts={counts}
              municipalities={municipalities}
              tags={tags}
              statusOrder={settings.statusOrder}
              tagsEnabled={settings.tagsEnabled}
              favoriteEnabled={settings.favoritePhonesEnabled && settings.favoritePhones.length > 0}
              statusLabel={statusLabel}
              statusColor={statusColor}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
              <p className="font-bold text-gray-600 dark:text-gray-300">{t('list.no_results')}</p>
              <button
                type="button"
                onClick={filterApi.clearAll}
                className="flex min-h-11 items-center rounded-xl border border-gray-300 px-4 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {t('list.clear_filters')}
              </button>
            </div>
          ) : (
            <ul ref={listRef} className="space-y-3">
              {filtered.map((parcel) => (
                <li key={parcel.tracking} data-tracking={parcel.tracking}>
                  <SwipeableCard
                    onSwipeRight={() => swipeToCall(parcel)}
                    onSwipeLeft={() => swipeToYalidine(parcel)}
                  >
                    <ParcelCard
                      parcel={parcel}
                      statusLabel={statusLabel}
                      statusColor={statusColor}
                      onOpenStatus={(p) => setModal({ kind: 'status', parcel: p })}
                      onEdit={(p) => setModal({ kind: 'edit', parcel: p })}
                      onDelete={(p) => setModal({ kind: 'delete', parcel: p })}
                      onReorderStart={startDrag}
                    />
                  </SwipeableCard>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setModal({ kind: 'add' })}
        aria-label={t('parcels.add_title')}
        className="fixed bottom-20 end-4 z-40 flex size-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl hover:bg-gray-700 lg:bottom-6 dark:bg-gray-100 dark:text-gray-900"
      >
        <PackagePlus className="size-6" aria-hidden="true" />
      </button>

      {pickedPhones && (
        <PhonePickDialog
          phones={pickedPhones}
          onPick={(phone) => {
            window.location.href = telLink(phone);
            setPickedPhones(null);
          }}
          onClose={() => setPickedPhones(null)}
        />
      )}

      {focusOpen && (
        <FocusMode
          parcels={filtered}
          statusLabel={statusLabel}
          statusColor={statusColor}
          onExit={closeFocus}
          onFindTracking={findTracking}
        />
      )}

      {modal?.kind === 'import' && <ImportModal onClose={() => setModal(null)} />}

      {modal?.kind === 'add' && (
        <AddParcelModal municipalities={municipalities} onAdd={addParcel} onClose={() => setModal(null)} />
      )}

      {modal?.kind === 'edit' && (
        <EditParcelModal
          parcel={modal.parcel}
          municipalities={municipalities}
          isTrackingFree={isTrackingFree}
          onSave={updateParcel}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'status' && (
        <StatusChangeModal
          parcel={modal.parcel}
          settings={settings}
          statusLabel={statusLabel}
          onApply={changeStatus}
          onSmsSent={(tracking, target) =>
            updateParcel(tracking, target === 'sender' ? { senderSmsSent: true } : { smsSent: true })
          }
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'delete' && (
        <ConfirmDialog
          open
          danger
          title={t('parcels.delete_confirm_title')}
          description={
            <>
              <span className="font-mono" dir="ltr">
                {modal.parcel.tracking}
              </span>
              {' — '}
              {modal.parcel.receiver}
            </>
          }
          onConfirm={() => {
            removeParcels([modal.parcel.tracking]);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
