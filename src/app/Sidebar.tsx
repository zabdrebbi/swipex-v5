import { NavLink } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { NAV_DESKTOP } from './nav';

/** Desktop-only sidebar (lg and up). In RTL it sits on the right automatically. */
export default function Sidebar() {
  const { t } = useI18n();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:flex">
      <div className="mb-6 px-2 text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
        SwiPex Pro
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_DESKTOP.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-2 text-xs text-gray-400">v5</div>
    </aside>
  );
}
