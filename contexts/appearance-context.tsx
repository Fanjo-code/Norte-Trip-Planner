import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
const Context = createContext({ scheme: 'light' as 'light' | 'dark', toggle: () => {} });
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<'light' | 'dark' | null>(null);
  const scheme = preference ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const changed = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('norte.appearance.v1')
      .then((value) => {
        if (active && !changed.current && (value === 'light' || value === 'dark'))
          setPreference(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <Context.Provider
      value={{
        scheme,
        toggle: () => {
          changed.current = true;
          const next = scheme === 'light' ? 'dark' : 'light';
          setPreference(next);
          void AsyncStorage.setItem('norte.appearance.v1', next).catch(() => {});
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAppearance() {
  return useContext(Context);
}
