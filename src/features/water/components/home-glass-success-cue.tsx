import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatGlassSuccessCueBody } from '@/features/water/components/glass-success-cue-copy';
import type { GlassSuccessCue } from '@/features/water/domain/glass-success-cue';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  cue: GlassSuccessCue;
};

/** Transient home line confirming a Glass was logged or undone. */
export function HomeGlassSuccessCue({ cue }: Props) {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const body = formatGlassSuccessCueBody(cue, t);
  const emphasize = cue.kind === 'added' && cue.firstOfDay;

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
