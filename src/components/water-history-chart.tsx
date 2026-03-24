import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type WaterHistoryChartEntry = {
  id: string;
  intakeMl: number;
  label: string;
  showLabel: boolean;
  labelAlign: 'left' | 'center' | 'right';
};

type WaterHistoryChartProps = {
  entries: WaterHistoryChartEntry[];
  goalMl: number;
};

export function WaterHistoryChart({ entries, goalMl }: WaterHistoryChartProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const maxPercent = Math.max(
    120,
    ...entries.map((item) => {
      if (goalMl <= 0) return 0;
      return Math.round((item.intakeMl / goalMl) * 100);
    }),
  );
  const normalizedMaxPercent = Math.ceil(maxPercent / 20) * 20;
  const goalLineBottomPercent = Math.max(
    0,
    Math.min(100, Math.round((100 / normalizedMaxPercent) * 100)),
  );

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.goalRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('history.goalLineLabel')}
        </ThemedText>
      </View>
      <View style={styles.chartRow}>
        {entries.map((item) => {
          const percent = goalMl > 0 ? (item.intakeMl / goalMl) * 100 : 0;
          const barRatio = Math.max(0, Math.min(1, percent / normalizedMaxPercent));
          const reachedGoal = goalMl > 0 && item.intakeMl >= goalMl;
          return (
            <View key={item.id} style={styles.column}>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.goalLine, { bottom: `${goalLineBottomPercent}%` }]} />
                <View
                  style={[
                    styles.bar,
                    {
                      height: item.intakeMl > 0 ? `${Math.max(8, Math.round(barRatio * 100))}%` : '0%',
                      backgroundColor: reachedGoal ? '#24A148' : '#208AEF',
                    },
                  ]}
                />
              </View>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={[
                  styles.label,
                  item.labelAlign === 'center'
                    ? styles.labelCenter
                    : item.labelAlign === 'right'
                      ? styles.labelRight
                      : styles.labelLeft,
                ]}
                numberOfLines={1}
                ellipsizeMode="clip">
                {item.showLabel ? item.label : ' '}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 140,
  },
  goalRow: {
    marginBottom: Spacing.one,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    overflow: 'visible',
  },
  track: {
    width: '100%',
    height: 110,
    borderRadius: Spacing.two,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#FF9F1C',
    opacity: 0.9,
  },
  bar: {
    width: '100%',
    borderRadius: Spacing.two,
    minHeight: 8,
  },
  label: {
    textTransform: 'capitalize',
    width: 64,
    overflow: 'visible',
  },
  labelLeft: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  labelCenter: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  labelRight: {
    textAlign: 'right',
    alignSelf: 'flex-end',
  },
});
