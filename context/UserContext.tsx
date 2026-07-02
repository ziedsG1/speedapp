import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getUserProfile, saveUserProfile, type UserProfile } from '@/lib/storage';

type UserContextType = {
  user: UserProfile | null;
  loading: boolean;
  setUser: (profile: UserProfile) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const profile = await getUserProfile();
    setUserState(profile);
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const setUser = async (profile: UserProfile) => {
    await saveUserProfile(profile);
    setUserState(profile);
  };

  return (
    <UserContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
