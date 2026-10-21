import type { TFunction } from 'i18next';

import type { RecentGlassStatus } from '@/features/water/domain/recent-glass-status';

/** Localized body for the always-on home recent-glass status line. */
export function formatRecentGlassStatusBody(status: RecentGlassStatus, t: TFunction): string {
  if (status.kind === 'empty') {
    return t('home.recentGlassEmpty');
  }
  if (status.kind === 'justNow') {
    return t('home.recentGlassJustNow', { ml: status.amountMl });
  }
  const key = status.glassCount === 1 ? 'home.recentGlassTodayOne' : 'home.recentGlassTodayOther';
  return t(key, {
    count: status.glassCount,
    clockTime: status.lastClockTime,
  });
}
