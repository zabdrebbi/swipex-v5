import { Navigate, Outlet, useLocation } from 'react-router-dom';
import FullScreenLoader from '@/components/FullScreenLoader';
import { ToastProvider } from '@/components/Toast';
import { ParcelsProvider } from '@/features/parcels/ParcelsProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import SettingsSync from '@/features/settings/SettingsSync';
import { TasksProvider } from '@/features/tasks/TasksProvider';
import { useAuth } from './AuthProvider';

/** Layout route: renders its children only for a signed-in user. */
export default function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') return <FullScreenLoader />;
  if (auth.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return (
    <ToastProvider>
      <SettingsProvider>
        <SettingsSync />
        <ParcelsProvider>
          <TasksProvider>
            <Outlet />
          </TasksProvider>
        </ParcelsProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}
