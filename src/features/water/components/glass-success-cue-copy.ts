import type { TFunction } from 'i18next';

import type { GlassSuccessCue } from '@/features/water/domain/glass-success-cue';

/** Localized body for the home Glass success cue. */
export function formatGlassSuccessCueBody(cue: GlassSuccessCue, t: TFunction): string {
  if (cue.kind === 'undone') {
    return t('home.glassUndone', { ml: cue.amountMl });
  }
  if (cue.firstOfDay) {
    return t('home.glassLoggedFirst', { ml: cue.amountMl });
  }
  return t('home.glassLogged', { ml: cue.amountMl });
}
