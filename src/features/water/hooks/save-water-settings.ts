import { Platform } from 'react-native';

import type { GlassScheduleError, ReminderWindow } from '@/features/water/domain/glass-schedule';
import { syncWaterReminders } from '@/lib/notifications';
import {
  saveGlassMl,
  saveGoalMl,
  saveReminderWindow,
  saveRemindersEnabled,
} from '@/lib/storage';

export type SaveWaterSettingsInput = {
  goalMl: number;
  glassMl: number;
  remindersEnabled: boolean;
  reminderWindow: ReminderWindow;
};

export type SaveWaterSettingsError = 'goal' | 'glass' | GlassScheduleError;

export type SaveWaterSettingsResult =
  | { ok: true; notificationsHint: boolean }
  | { ok: false; error: SaveWaterSettingsError };

export async function saveWaterSettings(
  input: SaveWaterSettingsInput,
): Promise<SaveWaterSettingsResult> {
  const { goalMl, glassMl, remindersEnabled, reminderWindow } = input;

  if (!Number.isFinite(goalMl) || goalMl < 100) {
    return { ok: false, error: 'goal' };
  }
  if (!Number.isFinite(glassMl) || glassMl < 50) {
    return { ok: false, error: 'glass' };
  }

  const windowResult = await saveReminderWindow(reminderWindow, { goalMl, glassMl });
  if (!windowResult.ok) {
    return windowResult;
  }

  await saveGoalMl(goalMl);
  await saveGlassMl(glassMl);
  await saveRemindersEnabled(remindersEnabled);
  await syncWaterReminders(remindersEnabled, {
    goalMl,
    glassMl,
    window: reminderWindow,
  });

  return {
    ok: true,
    notificationsHint: remindersEnabled && Platform.OS !== 'web',
  };
}
