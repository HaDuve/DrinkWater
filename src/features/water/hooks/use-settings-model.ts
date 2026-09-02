import { useCallback, useMemo, useState } from 'react';

import type { ReminderWindow, TimeOfDay } from '@/features/water/domain/glass-schedule';
import { buildReminderWindowPreview } from '@/features/water/domain/reminder-window-preview';
import { loadWaterState, type WaterSettings } from '@/lib/storage';

import {
  saveWaterSettings,
  type SaveWaterSettingsError,
  type SaveWaterSettingsResult,
} from './save-water-settings';

export type SettingsValidationError = SaveWaterSettingsError;

export function useSettingsModel() {
  const [loaded, setLoaded] = useState<WaterSettings | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [glassInput, setGlassInput] = useState('');
  const [reminders, setReminders] = useState(true);
  const [reminderWindow, setReminderWindow] = useState<ReminderWindow | null>(null);

  const refresh = useCallback(() => {
    void loadWaterState().then((state) => {
      setLoaded(state);
      setGoalInput(String(state.goalMl));
      setGlassInput(String(state.glassMl));
      setReminders(state.remindersEnabled);
      setReminderWindow(state.reminderWindow);
    });
  }, []);

  const setWindowStart = useCallback((start: TimeOfDay) => {
    setReminderWindow((current) => {
      if (!current) {
        return { start, end: { hour: 17, minute: 0 } };
      }
      return { ...current, start };
    });
  }, []);

  const setWindowEnd = useCallback((end: TimeOfDay) => {
    setReminderWindow((current) => {
      if (!current) {
        return { start: { hour: 8, minute: 30 }, end };
      }
      return { ...current, end };
    });
  }, []);

  const preview = useMemo(() => {
    if (!reminderWindow) return null;

    const goalMl = Number.parseInt(goalInput, 10);
    const glassMl = Number.parseInt(glassInput, 10);
    if (!Number.isFinite(goalMl) || !Number.isFinite(glassMl)) return null;

    return buildReminderWindowPreview({
      goalMl,
      glassMl,
      window: reminderWindow,
    });
  }, [goalInput, glassInput, reminderWindow]);

  const save = useCallback(async (): Promise<SaveWaterSettingsResult> => {
    if (!reminderWindow) {
      return { ok: false, error: 'goal' };
    }

    const result = await saveWaterSettings({
      goalMl: Number.parseInt(goalInput, 10),
      glassMl: Number.parseInt(glassInput, 10),
      remindersEnabled: reminders,
      reminderWindow,
    });

    if (result.ok) {
      refresh();
    }

    return result;
  }, [goalInput, glassInput, reminders, reminderWindow, refresh]);

  return {
    loaded,
    reminderWindow,
    setWindowStart,
    setWindowEnd,
    preview,
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
