import { syncWaterReminders } from '@/lib/notifications';
import { loadWaterState, setIntakeMl } from '@/lib/storage';

/** Logs one Glass of the configured size and re-syncs reminders (Pacing Event). */
export async function logGlassAndSyncReminders(): Promise<void> {
  const state = await loadWaterState();
  const intakeMl = state.intakeMl + state.glassMl;
  await setIntakeMl(intakeMl);
  await syncWaterReminders(state.remindersEnabled, {
    goalMl: state.goalMl,
    glassMl: state.glassMl,
    intakeMl,
    window: state.reminderWindow,
  });
}
