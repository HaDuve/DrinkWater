import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WaterHistoryChart } from '@/components/water-history-chart';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTabBarBottomInset } from '@/hooks/use-tab-bar-bottom-inset';
import { loadDailyHistory, loadWaterState, type DailyHistoryEntry, type WaterSettings } from '@/lib/storage';

function formatDateLabel(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(year || 1970, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const tabBarBottomInset = useTabBarBottomInset();
  const [state, setState] = useState<WaterSettings | null>(null);
  const [history, setHistory] = useState<DailyHistoryEntry[] | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const [nextState, nextHistory] = await Promise.all([loadWaterState(), loadDailyHistory(30)]);
      setState(nextState);
      setHistory(nextHistory);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const chartEntries = useMemo(() => {
    const recent = (history ?? []).slice(0, 7);
    return recent.reverse();
  }, [history]);

  if (!state || !history) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafe} edges={['top', 'left', 'right']}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, { paddingBottom: tabBarBottomInset + Spacing.three }]}
        edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            {t('history.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t('history.subtitle')}
          </ThemedText>

          {chartEntries.length > 0 ? (
            <WaterHistoryChart entries={chartEntries} goalMl={state.goalMl} />
          ) : (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.empty')}
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.list}>
            {history.map((item) => {
              const percent = state.goalMl > 0 ? Math.round((item.intakeMl / state.goalMl) * 100) : 0;
              return (
                <ThemedView key={item.date} type="backgroundElement" style={styles.row}>
                  <View style={styles.rowLeft}>
                    <ThemedText type="smallBold">{formatDateLabel(item.date)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('history.percentOfGoal', { percent })}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold">{t('history.mlValue', { ml: item.intakeMl })}</ThemedText>
                </ThemedView>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingSafe: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: Spacing.two,
  },
  subtitle: {
    marginBottom: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    gap: Spacing.half,
  },
});
