import { Navigate, Outlet, useLocation } from 'react-router-dom';
import FullScreenLoader from '@/components/FullScreenLoader';
import { ParcelsProvider } from '@/features/parcels/ParcelsProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import SettingsSync from '@/features/settings/SettingsSync';
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
    <SettingsProvider>
      <SettingsSync />
      <ParcelsProvider>
        <Outlet />
      </ParcelsProvider>
    </SettingsProvider>
  );
}
