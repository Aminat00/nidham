/**
 * Loads real prayer times once (device location → Aladhan) for the given date and
 * exposes them app-wide. Falls back to null — meaning "use the pinned demo values" —
 * whenever location or the network is unavailable, so the app always renders.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Coords, DEFAULT_COORDS, fetchPrayerTimes, LivePrayerData } from './prayerTimes';
import { useSettings } from '../state/settings';

interface PrayerTimesValue {
  live: LivePrayerData | null;
  coords: Coords;
  loading: boolean;
}

const Ctx = createContext<PrayerTimesValue>({ live: null, coords: DEFAULT_COORDS, loading: true });

/** Resolve device coordinates, or fall back to the default city. */
async function resolveCoords(): Promise<Coords> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return DEFAULT_COORDS;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return DEFAULT_COORDS;
  }
}

/** Never let a hanging permission prompt / GPS fix stall startup. */
function coordsWithTimeout(ms: number): Promise<Coords> {
  return Promise.race([
    resolveCoords(),
    new Promise<Coords>((resolve) => setTimeout(() => resolve(DEFAULT_COORDS), ms)),
  ]);
}

export function PrayerTimesProvider({ date, children }: { date: string; children: React.ReactNode }) {
  const { method, ready } = useSettings();
  const [value, setValue] = useState<PrayerTimesValue>({ live: null, coords: DEFAULT_COORDS, loading: true });

  useEffect(() => {
    if (!ready) return; // wait for the persisted method before fetching
    let alive = true;
    (async () => {
      const coords = await coordsWithTimeout(3000);
      const live = await fetchPrayerTimes(coords, date, method);
      if (alive) setValue({ live, coords, loading: false });
    })();
    return () => {
      alive = false;
    };
  }, [date, method, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrayerTimes(): PrayerTimesValue {
  return useContext(Ctx);
}
