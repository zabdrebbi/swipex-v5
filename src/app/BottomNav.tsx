import { NavLink } from 'react-router-dom';
import { NAV_MOBILE } from './nav';

/** شريط سفلي للهاتف والأجهزة اللوحية الصغيرة فقط (أقل من lg). */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      {NAV_MOBILE.map(({ to, label, icon: Icon, end }) => (
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
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
