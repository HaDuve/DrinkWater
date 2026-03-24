import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ScreenLoadingState } from '@/components/screen-loading-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WaterHistoryChart } from '@/components/water-history-chart';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  formatDateLabel,
  formatWeekRangeLabel,
  generateFakeHistory,
  type HistoryRange,
} from '@/features/water/domain/history';
import { useHistoryScreenModel } from '@/features/water/hooks/use-history-screen-model';
import { useTabBarBottomInset } from '@/hooks/use-tab-bar-bottom-inset';
import { useTheme } from '@/hooks/use-theme';
import { loadDailyHistory, loadWaterState, type DailyHistoryEntry, type WaterSettings } from '@/lib/storage';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tabBarBottomInset = useTabBarBottomInset();
  const [selectedRange, setSelectedRange] = useState<HistoryRange>(7);
  const [state, setState] = useState<WaterSettings | null>(null);
  const [history, setHistory] = useState<DailyHistoryEntry[] | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugHistory, setDebugHistory] = useState<DailyHistoryEntry[] | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const [nextState, nextHistory] = await Promise.all([
        loadWaterState(),
        loadDailyHistory(selectedRange),
      ]);
      setState(nextState);
      setHistory(nextHistory);
    })();
  }, [selectedRange]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const { todayEntry, weeklyPastGroups, chartEntries, periodSummary, meaningfulDays } =
    useHistoryScreenModel(selectedRange, state, history, isDebugMode, debugHistory);

  if (!state || !history) {
    return <ScreenLoadingState />;
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

          <View style={styles.rangeSelector}>
            {([7, 30, 90] as HistoryRange[]).map((range) => {
              const isActive = selectedRange === range;
              return (
                <Pressable
                  key={range}
                  onPress={() => {
                    setSelectedRange(range as HistoryRange);
                  }}
                  style={[
                    styles.rangeButton,
                    isActive && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="smallBold" themeColor={isActive ? 'text' : 'textSecondary'}>
                    {range === 7
                      ? t('history.range7')
                      : range === 30
                        ? t('history.range30')
                        : t('history.range90')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => {
              if (!state) return;
              if (isDebugMode) {
                setIsDebugMode(false);
                return;
              }
              setDebugHistory(generateFakeHistory(90, state.goalMl));
              setIsDebugMode(true);
            }}
            style={[
              styles.debugButton,
              { backgroundColor: isDebugMode ? '#24A148' : theme.backgroundSelected },
            ]}>
            <ThemedText type="smallBold" themeColor={isDebugMode ? 'background' : 'textSecondary'}>
              {isDebugMode ? t('history.debugModeOn') : t('history.debugModeOff')}
            </ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary">
            {selectedRange === 7
              ? t('history.chartModeDaily')
              : selectedRange === 30
                ? t('history.chartModeTwoDayAverage')
                : t('history.chartModeWeeklyAverage')}
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            <ThemedText type="smallBold">{t('history.periodSummaryTitle')}</ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.hitRate')}
              </ThemedText>
              <ThemedText type="smallBold">{t('history.hitRateValue', periodSummary)}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.averagePerDay')}
              </ThemedText>
              <ThemedText type="smallBold">{t('history.mlValue', { ml: periodSummary.averageMl })}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.totalIntake')}
              </ThemedText>
              <ThemedText type="smallBold">{t('history.mlValue', { ml: periodSummary.totalMl })}</ThemedText>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.todayCard}>
            <ThemedText type="smallBold">{t('history.today')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {todayEntry.intakeMl >= state.goalMl && state.goalMl > 0
                ? t('history.statusAchieved')
                : t('history.statusInProgress')}
            </ThemedText>
            <View style={styles.todayMetrics}>
              <ThemedText type="smallBold">{t('history.mlValue', { ml: todayEntry.intakeMl })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {todayEntry.intakeMl > state.goalMl && state.goalMl > 0
                  ? t('history.overGoal', { ml: todayEntry.intakeMl - state.goalMl })
                  : t('history.remainingToGoal', {
                      ml: Math.max(0, state.goalMl - todayEntry.intakeMl),
                    })}
              </ThemedText>
            </View>
          </ThemedView>

          {chartEntries.length > 0 && <WaterHistoryChart entries={chartEntries} goalMl={state.goalMl} />}

          {meaningfulDays === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">{t('history.emptyTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.empty')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.emptyHint')}
              </ThemedText>
            </ThemedView>
          )}

          {meaningfulDays > 0 && meaningfulDays < 3 && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.lowHistoryHint')}
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.list}>
            <ThemedText type="smallBold">{t('history.previousDays')}</ThemedText>
            {weeklyPastGroups.map((group) => (
              <View key={group.weekStart} style={styles.weekGroup}>
                <View style={styles.weekHeader}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {formatWeekRangeLabel(group.weekStart)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('history.percentOfGoal', { percent: group.weeklyPercent })}
                  </ThemedText>
                </View>
                {group.entries.map((item) => {
                  const percent = state.goalMl > 0 ? Math.round((item.intakeMl / state.goalMl) * 100) : 0;
                  const status =
                    item.intakeMl >= state.goalMl && state.goalMl > 0
                      ? t('history.statusAchieved')
                      : t('history.statusMissed');
                  return (
                    <ThemedView key={item.date} type="backgroundElement" style={styles.row}>
                      <View style={styles.rowLeft}>
                        <ThemedText type="smallBold">{formatDateLabel(item.date)}</ThemedText>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {status} -{' '}
                          {item.intakeMl > state.goalMl && state.goalMl > 0
                            ? t('history.overGoal', { ml: item.intakeMl - state.goalMl })
                            : t('history.percentOfGoal', { percent })}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold" style={styles.rowRightValue}>
                        {t('history.mlValue', { ml: item.intakeMl })}
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </View>
            ))}
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
    gap: Spacing.one,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  rangeButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  debugButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  todayMetrics: {
    marginTop: Spacing.one,
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.two,
  },
  weekGroup: {
    gap: Spacing.one,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
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
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  rowRightValue: {
    flexShrink: 0,
    marginLeft: Spacing.one,
  },
});
