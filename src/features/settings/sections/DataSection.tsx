import { useRef, useState } from 'react';
import { Archive, Database, FileDown, FileUp, Info, Loader2, Trash2, Upload } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useUser } from '@/features/auth/AuthProvider';
import { useSettings } from '../SettingsProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useStatusDisplay } from '@/features/parcels/useStatusDisplay';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import ImportModal from '@/features/import/ImportModal';
import { Group, Panel } from '../ui';
import { exportParcelsFile } from '@/lib/excel/sheetIo';
import { archiveDayParcels } from '@/lib/firebase/archiveRepo';
import { downloadSettingsBackup, loadImportSnapshot, parseSettingsBackup, saveImportSnapshot } from '../backup';
import pkg from '../../../../package.json';

interface ActionButtonProps {
  icon: typeof Database;
  label: string;
  tone?: 'default' | 'warning' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

/** One action row of the data panel (v4 `sx-action` buttons). */
function ActionButton({ icon: Icon, label, tone = 'default', disabled = false, onClick }: ActionButtonProps) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40'
      : tone === 'warning'
        ? 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40'
        : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-sm font-bold transition-colors disabled:opacity-60 ${toneClass}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-start">{label}</span>
    </button>
  );
}

function SubHead({ icon: Icon, label }: { icon: typeof Database; label: string }) {
  return (
    <p className="flex items-center gap-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </p>
  );
}

const TODAY = () => new Date().toISOString().slice(0, 10);

/**
 * Data & app group (v4 group 4): import (shared modal), Excel export,
 * settings backup/restore, manual archiving, the danger zone (ALL parcels —
 * a declared deviation from v4's filtered-only clear) and the app info.
 */
export default function DataSection() {
  const { t } = useI18n();
  const user = useUser();
  const { settings, replaceSettings, updateSettings } = useSettings();
  const { parcels, removeParcels } = useParcels();
  const { statusLabel } = useStatusDisplay();
  const { showToast } = useToast();

  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  async function handleExportExcel() {
    setExporting(true);
    try {
      await exportParcelsFile(parcels, t, statusLabel);
      showToast(t('settings.data_export_done'));
    } catch {
      showToast(t('settings.data_export_failed'));
    } finally {
      setExporting(false);
    }
  }

  function handleBackupImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-picking the same file
    if (file === undefined) return;
    file.text().then((text) => {
      const imported = parseSettingsBackup(text, TODAY());
      if (imported === null) {
        showToast(t('settings.backup_invalid'));
        return;
      }
      if (!window.confirm(t('settings.backup_confirm'))) return;
      saveImportSnapshot(settings); // pre-import snapshot for manual recovery
      replaceSettings(imported);
      showToast(t('settings.backup_imported'));
    });
  }

  function handleRestoreSnapshot() {
    const snapshot = loadImportSnapshot(TODAY());
    if (snapshot === null) {
      showToast(t('settings.recover_none'));
      return;
    }
    if (!window.confirm(t('settings.recover_confirm'))) return;
    replaceSettings(snapshot);
    showToast(t('settings.backup_imported'));
  }

  async function handleArchiveNow() {
    if (parcels.length === 0) {
      showToast(t('settings.data_archive_empty'));
      return;
    }
    const count = parcels.length;
    const today = TODAY();
    setArchiving(true);
    try {
      await archiveDayParcels(user.uid, parcels, today, today);
      updateSettings({ sessionDate: today }); // keep the in-memory marker in sync
      showToast(t('settings.data_archive_done', { count }));
    } catch {
      showToast(t('settings.data_archive_failed'));
    } finally {
      setArchiving(false);
    }
  }

  function handleClearAll() {
    setConfirmClear(false);
    removeParcels(parcels.map((parcel) => parcel.tracking));
  }

  const hasSnapshot = loadImportSnapshot(TODAY()) !== null;

  return (
    <Group title={t('settings.group_data_app')}>
      <Panel className="space-y-4">
        <div className="space-y-2">
          <SubHead icon={FileUp} label={t('settings.data_sub_import')} />
          <ActionButton icon={FileUp} label={t('settings.data_import')} onClick={() => setImportOpen(true)} />
        </div>

        <div className="space-y-2">
          <SubHead icon={FileDown} label={t('settings.data_sub_export')} />
          <ActionButton
            icon={exporting ? Loader2 : FileDown}
            label={t('settings.data_export')}
            disabled={exporting}
            onClick={() => void handleExportExcel()}
          />
        </div>

        <div className="space-y-2">
          <SubHead icon={Database} label={t('settings.data_sub_backup')} />
          <ActionButton
            icon={FileDown}
            label={t('settings.export_settings')}
            onClick={() => {
              downloadSettingsBackup(settings);
              showToast(t('settings.backup_exported'));
            }}
          />
          <ActionButton icon={Upload} label={t('settings.import_settings')} onClick={() => backupInputRef.current?.click()} />
          {hasSnapshot && (
            <ActionButton icon={Archive} label={t('settings.recover_settings')} onClick={handleRestoreSnapshot} />
          )}
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleBackupImport}
          />
        </div>

        <div className="space-y-2">
          <SubHead icon={Archive} label={t('settings.data_sub_maintenance')} />
          <ActionButton
            icon={archiving ? Loader2 : Archive}
            tone="warning"
            label={archiving ? t('settings.data_archiving') : t('settings.data_archive')}
            disabled={archiving}
            onClick={() => void handleArchiveNow()}
          />
        </div>

        <div className="space-y-2">
          <SubHead icon={Trash2} label={t('settings.data_sub_danger')} />
          <ActionButton icon={Trash2} tone="danger" label={t('confirm.clear_data.action')} onClick={() => setConfirmClear(true)} />
        </div>

        <div className="space-y-1 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <Info className="size-3.5" aria-hidden="true" />
            {t('settings.section_info')}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">{t('settings.info_version')}</span>
            <span className="font-bold" dir="ltr">
              v{pkg.version}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">{t('settings.info_parcel_count')}</span>
            <span className="font-bold" dir="ltr">
              {parcels.length}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">{t('settings.info_developer')}</span>
            <span className="font-bold" dir="ltr">
              SwiPex Team
            </span>
          </div>
        </div>
      </Panel>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}

      <ConfirmDialog
        open={confirmClear}
        danger
        title={t('confirm.clear_data.title')}
        description={t('confirm.clear_data.body', { count: parcels.length })}
        confirmLabelKey={'confirm.clear_data.action' as TranslationKey}
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </Group>
  );
}
