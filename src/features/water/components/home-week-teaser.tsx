import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { WeekTeaserSummary } from '@/features/water/domain/week-teaser';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  summary: WeekTeaserSummary;
};

export function HomeWeekTeaser({ summary }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const water = useWaterMaterial();

  const body =
    summary.meaningfulDays === 0
      ? t('home.weekTeaserEmpty')
      : t('home.weekTeaserSummary', {
          hitDays: summary.hitDays,
          totalDays: summary.totalDays,
          averageMl: summary.averageMl,
        });
  const title = t('home.weekTeaserTitle');
  const action = t('home.weekTeaserAction');
  const a11yLabel = `${title}. ${body}. ${action}`;

  return (
    <Pressable
      role="link"
      accessibilityRole="link"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t('home.weekTeaserHint')}
      onPress={() => router.push('/history')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: water.surfaceDeep },
        pressed && styles.pressed,
      ]}>
      <View style={styles.copy}>
        <ThemedText type="smallBold" style={{ color: water.ink }} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={[styles.body, { color: water.mist }]} numberOfLines={1}>
          {body}
        </ThemedText>
      </View>
      <SymbolView
        name="chevron.right"
        size={14}
        weight="semibold"
        tintColor={water.mist}
        fallback={
          <ThemedText type="smallBold" style={{ color: water.mist }}>
            ›
          </ThemedText>
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  body: {
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.7,
  },
});
