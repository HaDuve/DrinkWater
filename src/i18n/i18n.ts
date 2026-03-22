import * as Localization from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { de } from './locales/de';
import { en } from './locales/en';

export const supportedLngs = ['en', 'de'] as const;
export type SupportedLng = (typeof supportedLngs)[number];

export function resolveLng(
  locales: { languageCode?: string | null }[],
): SupportedLng {
  const code = locales[0]?.languageCode ?? 'en';
  if (code === 'de' || code.startsWith('de')) return 'de';
  return 'en';
}

const resources = {
  en: { translation: en },
  de: { translation: de },
} as const;

// eslint-disable-next-line import/no-named-as-default-member -- i18next fluent `.use()`, not React `use`
void i18next.use(initReactI18next).init({
  resources,
  lng: resolveLng(Localization.getLocales()),
  fallbackLng: 'en',
  supportedLngs: [...supportedLngs],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18next;
