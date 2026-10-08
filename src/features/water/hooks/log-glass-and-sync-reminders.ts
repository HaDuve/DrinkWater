import { syncWaterRemindersFromState } from '@/lib/notifications';
import { addGlassAmount, loadWaterState } from '@/lib/storage';

/** Logs one Glass of the configured size and re-syncs reminders (Pacing Event). */
export async function logGlassAndSyncReminders(): Promise<void> {
  const state = await loadWaterState();
  await addGlassAmount(state.glassMl);
  await syncWaterRemindersFromState();
}
