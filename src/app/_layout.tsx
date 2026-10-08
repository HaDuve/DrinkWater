import '@/i18n/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ScreenshotBootstrap } from '@/components/screenshot-bootstrap';
import { AddGlassDeepLinkBootstrap } from '@/features/water/components/add-glass-deep-link-bootstrap';
import { LocaleSync } from '@/i18n/locale-sync';
import { syncWaterRemindersFromState } from '@/lib/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void syncWaterRemindersFromState();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LocaleSync>
        <ScreenshotBootstrap />
        <AddGlassDeepLinkBootstrap />
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="history" />
          <Stack.Screen name="settings" />
        </Stack>
      </LocaleSync>
    </ThemeProvider>
  );
}
