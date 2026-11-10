import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebase } from '@/lib/firebase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, (user) =>
      setState(user ? { status: 'signedIn', user } : { status: 'signedOut' }),
    );
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens rendered under <RequireAuth>: the signed-in user is guaranteed. */
export function useUser(): User {
  const state = useAuth();
  if (state.status !== 'signedIn') throw new Error('useUser must be used under <RequireAuth>');
  return state.user;
}
