import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, Profile } from '@/lib/api';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await authApi.me();
      setProfile(me);
      setLoading(false);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const p = await authApi.login(email, password);
      setProfile(p);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const p = await authApi.register(email, password, fullName);
      setProfile(p);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  function signOut() {
    authApi.logout();
    setProfile(null);
  }

  async function refreshProfile() {
    const me = await authApi.me();
    setProfile(me);
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
