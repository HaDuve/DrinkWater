import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { syncWaterReminders } from '@/lib/notifications';
import {
  loadWaterState,
  saveGlassMl,
  saveGoalMl,
  saveIntervalHours,
  saveRemindersEnabled,
  type WaterSettings,
} from '@/lib/storage';

type ValidationError = 'goal' | 'glass' | 'interval';

export function useSettingsModel() {
  const [loaded, setLoaded] = useState<WaterSettings | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [glassInput, setGlassInput] = useState('');
  const [intervalInput, setIntervalInput] = useState('');
  const [reminders, setReminders] = useState(true);

  const refresh = useCallback(() => {
    void loadWaterState().then((state) => {
      setLoaded(state);
      setGoalInput(String(state.goalMl));
      setGlassInput(String(state.glassMl));
      setIntervalInput(String(state.intervalHours));
      setReminders(state.remindersEnabled);
    });
  }, []);

  const save = useCallback(async (): Promise<{ ok: true; notificationsHint: boolean } | { ok: false; error: ValidationError }> => {
    const goal = Number.parseInt(goalInput, 10);
    const glass = Number.parseInt(glassInput, 10);
    const interval = Number.parseInt(intervalInput, 10);

    if (!Number.isFinite(goal) || goal < 100) return { ok: false, error: 'goal' };
    if (!Number.isFinite(glass) || glass < 50) return { ok: false, error: 'glass' };
    if (!Number.isFinite(interval) || interval < 1 || interval > 12) {
      return { ok: false, error: 'interval' };
    }

    await saveGoalMl(goal);
    await saveGlassMl(glass);
    await saveIntervalHours(interval);
    await saveRemindersEnabled(reminders);
    await syncWaterReminders(reminders, interval);
    refresh();

    return { ok: true, notificationsHint: reminders && Platform.OS !== 'web' };
  }, [goalInput, glassInput, intervalInput, reminders, refresh]);

  return {
    loaded,
    goalInput,
    setGoalInput,
    glassInput,
    setGlassInput,
    intervalInput,
    setIntervalInput,
    reminders,
    setReminders,
    refresh,
    save,
  };
}
