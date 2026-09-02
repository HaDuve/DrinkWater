import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import type { ReminderWindow } from '@/features/water/domain/glass-schedule';
import { LEGACY_NOTIFICATION_INTERVAL_HOURS, syncWaterReminders } from '@/lib/notifications';
import {
  loadWaterState,
  saveGlassMl,
  saveGoalMl,
  saveRemindersEnabled,
  type WaterSettings,
} from '@/lib/storage';

type ValidationError = 'goal' | 'glass';

export function useSettingsModel() {
  const [loaded, setLoaded] = useState<WaterSettings | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [glassInput, setGlassInput] = useState('');
  const [reminders, setReminders] = useState(true);

  const refresh = useCallback(() => {
    void loadWaterState().then((state) => {
      setLoaded(state);
      setGoalInput(String(state.goalMl));
      setGlassInput(String(state.glassMl));
      setReminders(state.remindersEnabled);
    });
  }, []);

  const save = useCallback(async (): Promise<{ ok: true; notificationsHint: boolean } | { ok: false; error: ValidationError }> => {
    const goal = Number.parseInt(goalInput, 10);
    const glass = Number.parseInt(glassInput, 10);

    if (!Number.isFinite(goal) || goal < 100) return { ok: false, error: 'goal' };
    if (!Number.isFinite(glass) || glass < 50) return { ok: false, error: 'glass' };

    await saveGoalMl(goal);
    await saveGlassMl(glass);
    await saveRemindersEnabled(reminders);
    await syncWaterReminders(reminders, LEGACY_NOTIFICATION_INTERVAL_HOURS);
    refresh();

    return { ok: true, notificationsHint: reminders && Platform.OS !== 'web' };
  }, [goalInput, glassInput, reminders, refresh]);

  const reminderWindow: ReminderWindow | null = loaded?.reminderWindow ?? null;

  return {
    loaded,
    reminderWindow,
    goalInput,
    setGoalInput,
    glassInput,
    setGlassInput,
    reminders,
    setReminders,
    refresh,
    save,
  };
}
