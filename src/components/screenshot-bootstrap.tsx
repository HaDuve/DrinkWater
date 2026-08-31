import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import i18next, { type SupportedLng, supportedLngs } from '@/i18n/i18n';
import { applyScreenshotDemoState } from '@/lib/screenshot-demo';

function parseLang(url: string | null): SupportedLng | null {
  if (!url) return null;
  const { queryParams } = Linking.parse(url);
  const raw = queryParams?.lang;
  const lang = Array.isArray(raw) ? raw[0] : raw;
  if (typeof lang !== 'string') return null;
  return supportedLngs.includes(lang as SupportedLng) ? (lang as SupportedLng) : null;
}

function urlRequestsScreenshotDemo(url: string | null): boolean {
  if (!url) return false;
  return url.includes('screenshot=1');
}

export function ScreenshotBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = (url: string | null) => {
      const lang = parseLang(url);
      if (lang) {
        void i18next.changeLanguage(lang);
      }
      if (urlRequestsScreenshotDemo(url)) {
        void applyScreenshotDemoState();
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  return null;
}
