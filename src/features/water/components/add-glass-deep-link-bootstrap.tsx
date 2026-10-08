import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { emitIntakeChanged } from '@/features/water/hooks/intake-changed';
import { logGlassAndSyncReminders } from '@/features/water/hooks/log-glass-and-sync-reminders';
import { subscribeAddGlassDeepLink } from '@/features/water/hooks/subscribe-add-glass-deep-link';
import {
  clearPendingAddGlassDeepLink,
  consumePendingAddGlassDeepLink,
} from '@/lib/pending-add-glass-deep-link';

export function AddGlassDeepLinkBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    return subscribeAddGlassDeepLink({
      getInitialURL: () => Linking.getInitialURL(),
      addEventListener: (type, listener) => Linking.addEventListener(type, listener),
      consumePendingAddGlassDeepLink,
      clearPendingAddGlassDeepLink,
      logGlassAndSyncReminders,
      onGlassLogged: emitIntakeChanged,
    });
  }, []);

  return null;
}
