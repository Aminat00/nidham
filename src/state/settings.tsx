/**
 * App settings — currently the prayer-time calculation method. Persisted locally so
 * the choice survives reloads. (When signed in, this can also mirror to the profile
 * row's `calc_method` — a small follow-up.)
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_METHOD } from '../data/prayerTimes';

const METHOD_KEY = 'nidham.calcMethod.v1';

interface SettingsValue {
  method: number;
  setMethod: (m: number) => void;
  ready: boolean;
}

const Ctx = createContext<SettingsValue>({ method: DEFAULT_METHOD, setMethod: () => {}, ready: false });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [method, setMethodState] = useState(DEFAULT_METHOD);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(METHOD_KEY).then((v) => {
      const n = v ? Number(v) : NaN;
      if (!Number.isNaN(n)) setMethodState(n);
      setReady(true);
    });
  }, []);

  const setMethod = (m: number) => {
    setMethodState(m);
    AsyncStorage.setItem(METHOD_KEY, String(m)).catch(() => {});
  };

  const value = useMemo<SettingsValue>(() => ({ method, setMethod, ready }), [method, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(Ctx);
}
