import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DailyHistoryEntry } from '@/lib/storage';

type WaterHistoryChartProps = {
  entries: DailyHistoryEntry[];
  goalMl: number;
};

function shortWeekday(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(year || 1970, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
}

export function WaterHistoryChart({ entries, goalMl }: WaterHistoryChartProps) {
  const theme = useTheme();
  const maxIntake = Math.max(goalMl, ...entries.map((item) => item.intakeMl), 1);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.chartRow}>
        {entries.map((item) => {
          const barRatio = Math.max(0, Math.min(1, item.intakeMl / maxIntake));
          const reachedGoal = goalMl > 0 && item.intakeMl >= goalMl;
          return (
            <View key={item.date} style={styles.column}>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(8, Math.round(barRatio * 100))}%`,
                      backgroundColor: reachedGoal ? '#24A148' : '#208AEF',
                    },
                  ]}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                {shortWeekday(item.date)}
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
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  track: {
    width: '100%',
    height: 110,
    borderRadius: Spacing.two,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: Spacing.two,
    minHeight: 8,
  },
  label: {
    textTransform: 'capitalize',
  },
});
