import { File, Paths } from 'expo-file-system';

import {
  PENDING_ADD_GLASS_DEEP_LINK_FILENAME,
} from '@/features/water/domain/pending-add-glass-deep-link';

function pendingFile() {
  return new File(Paths.document, PENDING_ADD_GLASS_DEEP_LINK_FILENAME);
}

/** Reads and deletes the Intent handoff file; returns null if absent. */
export async function consumePendingAddGlassDeepLink(): Promise<string | null> {
  try {
    const file = pendingFile();
    if (!file.exists) return null;
    const url = (await file.text()).trim();
    file.delete();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

/** Drops a stale handoff without returning it (Linking already delivered the URL). */
export async function clearPendingAddGlassDeepLink(): Promise<void> {
  try {
    const file = pendingFile();
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup.
  }
}
