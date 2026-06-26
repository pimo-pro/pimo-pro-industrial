import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type IndustrialProfile = 'supervisor' | 'operator';

const PROFILE_TOKENS: Record<IndustrialProfile, string> = {
  supervisor: 'pimo-industrial-dev-token',
  operator: 'pimo-industrial-operator-token',
};

type ProfileContextValue = {
  profile: IndustrialProfile;
  token: string;
  setProfile: (p: IndustrialProfile) => void;
  isSupervisor: boolean;
  isOperator: boolean;
};

const STORAGE_KEY = 'pimo-industrial-profile';

const IndustrialProfileContext = createContext<ProfileContextValue | null>(null);

function loadProfile(): IndustrialProfile {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'operator' ? 'operator' : 'supervisor';
}

export function IndustrialProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<IndustrialProfile>(loadProfile);

  const setProfile = (p: IndustrialProfile) => {
    localStorage.setItem(STORAGE_KEY, p);
    setProfileState(p);
  };

  const value = useMemo(
    () => ({
      profile,
      token: PROFILE_TOKENS[profile],
      setProfile,
      isSupervisor: profile === 'supervisor',
      isOperator: profile === 'operator',
    }),
    [profile]
  );

  return <IndustrialProfileContext.Provider value={value}>{children}</IndustrialProfileContext.Provider>;
}

export function useIndustrialProfile(): ProfileContextValue {
  const ctx = useContext(IndustrialProfileContext);
  if (!ctx) throw new Error('useIndustrialProfile fora do provider');
  return ctx;
}

export function getProfileToken(profile: IndustrialProfile): string {
  return PROFILE_TOKENS[profile];
}
