import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

/**
 * App shell:
 *  - mobile (< 1024px): content + bottom bar (current design)
 *  - desktop (>= 1024px): fixed sidebar + comfortable content width
 */
export default function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-5xl p-4 pb-24 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
