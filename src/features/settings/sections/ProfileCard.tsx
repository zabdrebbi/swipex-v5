import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { useUser } from '@/features/auth/AuthProvider';
import { useParcels } from '@/features/parcels/ParcelsProvider';
import { useSettings } from '../SettingsProvider';
import { computeDailySummary, sumAmount } from '@/domain/list/dailySummary';

interface StatProps {
  value: number;
  label: string;
  highlight?: boolean;
}

function Stat({ value, label, highlight = false }: StatProps) {
  const { formatNumber } = useI18n();
  return (
    <div className="min-w-0 flex-1 text-center">
      <p
        className={`text-lg font-extrabold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}
        dir="ltr"
      >
        {formatNumber(value)}
      </p>
      <p className="truncate text-[10px] font-bold text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}

/**
 * Profile card (v4's header card): photo/identity, the day's four counters
 * and the cash total of delivered parcels. No Yalidine link (step 11 plan).
 */
export default function ProfileCard() {
  const { t, formatCurrency } = useI18n();
  const user = useUser();
  const { settings } = useSettings();
  const { parcels } = useParcels();

  const summary = useMemo(
    () => computeDailySummary(parcels, settings.statusOrder),
    [parcels, settings.statusOrder],
  );
  const cash = useMemo(
    () => sumAmount(parcels.filter((parcel) => parcel.status === 'delivered')),
    [parcels],
  );

  const name = user.displayName || t('settings.user_title');
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
          ) : (
            <span className="text-xl font-bold" aria-hidden="true">
              {initial}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900 dark:text-white">{name}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400" dir="ltr">
            {user.email ?? ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Stat value={summary.total} label={t('settings.stat_total')} />
        <Stat value={summary.delivered} label={t('summary.delivered')} highlight />
        <Stat value={summary.remaining} label={t('settings.stat_remaining')} />
        {summary.cancelled > 0 && <Stat value={summary.cancelled} label={t('status.cancelled')} />}
      </div>

      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
          {formatCurrency(cash)}
        </p>
        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{t('settings.stat_cash')}</p>
      </div>
    </div>
  );
}
