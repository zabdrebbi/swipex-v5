import { NavLink } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useTasks } from '@/features/tasks/TasksProvider';
import { NAV_MOBILE } from './nav';

/** Pending-task count for the nav badge, clamped like v4 (99+). */
function useTaskBadge(): string | null {
  const { counts } = useTasks();
  if (counts.pending <= 0) return null;
  return counts.pending > 99 ? '99+' : String(counts.pending);
}

/** Mobile-only bottom bar (below lg). */
export default function BottomNav() {
  const { t } = useI18n();
  const badge = useTaskBadge();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      {NAV_MOBILE.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-bold transition-colors ${
              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
            }`
          }
        >
          <span className="relative">
            <Icon className="size-5" aria-hidden="true" />
            {to === '/tasks' && badge !== null && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -end-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
              >
                {badge}
              </span>
            )}
          </span>
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
