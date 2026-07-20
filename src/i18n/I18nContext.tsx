/**
 * Language + direction context. Exposes the active `lang`, its `strings`, an
 * `isRTL` flag, and a setter that flips the whole app (copy + layout direction)
 * instantly — no reload.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { Lang, Strings, UI, isRTL as computeRTL } from './strings';

interface I18nValue {
  lang: Lang;
  strings: Strings;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  initial = 'en',
  onLangChange,
  children,
}: {
  initial?: Lang;
  onLangChange?: (lang: Lang) => void;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = (next: Lang) => {
    setLangState(next);
    onLangChange?.(next);
  };

  const value = useMemo<I18nValue>(
    () => ({ lang, strings: UI[lang], isRTL: computeRTL(lang), setLang }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
