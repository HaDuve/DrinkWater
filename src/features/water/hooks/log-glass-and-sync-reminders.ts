import { syncWaterReminders } from '@/lib/notifications';
import { addGlassAmount, loadWaterState } from '@/lib/storage';

/** Logs one Glass of the configured size and re-syncs reminders (Pacing Event). */
export async function logGlassAndSyncReminders(): Promise<void> {
  const state = await loadWaterState();
  await addGlassAmount(state.glassMl);
  const next = await loadWaterState();
  await syncWaterReminders(state.remindersEnabled, {
    goalMl: state.goalMl,
    glassMl: state.glassMl,
    intakeMl: next.intakeMl,
    window: state.reminderWindow,
  });
}
