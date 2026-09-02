import '@/i18n/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ScreenshotBootstrap } from '@/components/screenshot-bootstrap';
import { LocaleSync } from '@/i18n/locale-sync';
import { syncWaterReminders } from '@/lib/notifications';
import { loadWaterState } from '@/lib/storage';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void (async () => {
      const s = await loadWaterState();
      await syncWaterReminders(s.remindersEnabled, {
        goalMl: s.goalMl,
        glassMl: s.glassMl,
        window: s.reminderWindow,
      });
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LocaleSync>
        <ScreenshotBootstrap />
        <AnimatedSplashOverlay />
        <AppTabs />
      </LocaleSync>
    </ThemeProvider>
  );
}
