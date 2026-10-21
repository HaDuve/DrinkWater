import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatRecentGlassStatusBody } from '@/features/water/components/recent-glass-status-copy';
import type { RecentGlassStatus } from '@/features/water/domain/recent-glass-status';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  status: RecentGlassStatus;
};

/** Always-on home line: if/when glasses were logged today (senior glance). */
export function HomeRecentGlassStatus({ status }: Props) {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const body = formatRecentGlassStatusBody(status, t);
  const emphasize = status.kind === 'justNow';

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.cue, { backgroundColor: water.surfaceDeep }]}
      importantForAccessibility="yes">
      <ThemedText
        type={emphasize ? 'smallBold' : 'small'}
        style={{ color: emphasize ? water.water : water.ink, textAlign: 'center' }}>
        {body}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  cue: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
});
