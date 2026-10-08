import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackButton } from '@/components/screen-back-button';
import { ScreenLoadingState } from '@/components/screen-loading-state';
import { StrokedText } from '@/components/stroked-text';
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
import { useWaterMaterial } from '@/hooks/use-water-material';
import { loadDailyHistory, loadWaterState, type DailyHistoryEntry, type WaterSettings } from '@/lib/storage';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const isScreenshotDemo = demo === '1';
  const water = useWaterMaterial();
  const [selectedRange, setSelectedRange] = useState<HistoryRange>(7);
  const [state, setState] = useState<WaterSettings | null>(null);
  const [history, setHistory] = useState<DailyHistoryEntry[] | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugHistory, setDebugHistory] = useState<DailyHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!isScreenshotDemo || !state) return;
    setDebugHistory(generateFakeHistory(90, state.goalMl));
    setIsDebugMode(true);
  }, [isScreenshotDemo, state]);

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
    <ThemedView style={[styles.container, { backgroundColor: water.surface }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <ScreenBackButton />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={[styles.title, { color: water.ink }]}>
            {t('history.title')}
          </ThemedText>
          <ThemedText type="small" style={[styles.subtitle, { color: water.mist }]}>
            {t('history.subtitle')}
          </ThemedText>

          <View
            style={[styles.rangeSelector, { backgroundColor: water.surfaceDeep }]}
            accessibilityRole="tablist">
            {([7, 30, 90] as HistoryRange[]).map((range) => {
              const isActive = selectedRange === range;
              const rangeLabel =
                range === 7
                  ? t('history.range7')
                  : range === 30
                    ? t('history.range30')
                    : t('history.range90');
              return (
                <Pressable
                  key={range}
                  role="tab"
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={rangeLabel}
                  onPress={() => {
                    setSelectedRange(range);
                  }}
                  style={({ pressed }) => [
                    styles.rangeButton,
                    isActive && { backgroundColor: water.waterDeep },
                    pressed && styles.pressed,
                  ]}>
                  {isActive ? (
                    <StrokedText
                      type="smallBold"
                      fill={water.onWater}
                      outline="#000000"
                      outlineWidth={1.2}>
                      {rangeLabel}
                    </StrokedText>
                  ) : (
                    <ThemedText type="smallBold" style={{ color: water.mist }}>
                      {rangeLabel}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="small" style={{ color: water.mist }}>
            {selectedRange === 7
              ? t('history.chartModeDaily')
              : selectedRange === 30
                ? t('history.chartModeTwoDayAverage')
                : t('history.chartModeWeeklyAverage')}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: water.surfaceDeep }]}>
            <ThemedText type="smallBold" style={{ color: water.ink }}>
              {t('history.periodSummaryTitle')}
            </ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText type="small" style={{ color: water.mist }}>
                {t('history.hitRate')}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: water.ink }}>
                {t('history.hitRateValue', periodSummary)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" style={{ color: water.mist }}>
                {t('history.averagePerDay')}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: water.ink }}>
                {t('history.mlValue', { ml: periodSummary.averageMl })}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" style={{ color: water.mist }}>
                {t('history.totalIntake')}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: water.ink }}>
                {t('history.mlValue', { ml: periodSummary.totalMl })}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: water.surfaceDeep }]}>
            <ThemedText type="smallBold" style={{ color: water.ink }}>
              {t('history.today')}
            </ThemedText>
            <ThemedText type="small" style={{ color: water.mist }}>
              {todayEntry.intakeMl >= state.goalMl && state.goalMl > 0
                ? t('history.statusAchieved')
                : t('history.statusInProgress')}
            </ThemedText>
            <View style={styles.todayMetrics}>
              <ThemedText type="smallBold" style={{ color: water.ink }}>
                {t('history.mlValue', { ml: todayEntry.intakeMl })}
              </ThemedText>
              <ThemedText type="small" style={{ color: water.mist }}>
                {todayEntry.intakeMl > state.goalMl && state.goalMl > 0
                  ? t('history.overGoal', { ml: todayEntry.intakeMl - state.goalMl })
                  : t('history.remainingToGoal', {
                      ml: Math.max(0, state.goalMl - todayEntry.intakeMl),
                    })}
              </ThemedText>
            </View>
          </View>

          {chartEntries.length > 0 && <WaterHistoryChart entries={chartEntries} goalMl={state.goalMl} />}

          {meaningfulDays === 0 && (
            <View style={[styles.card, { backgroundColor: water.surfaceDeep }]}>
              <ThemedText type="smallBold" style={{ color: water.ink }}>
                {t('history.emptyTitle')}
              </ThemedText>
              <ThemedText type="small" style={{ color: water.mist }}>
                {t('history.empty')}
              </ThemedText>
              <ThemedText type="small" style={{ color: water.mist }}>
                {t('history.emptyHint')}
              </ThemedText>
            </View>
          )}

          {meaningfulDays > 0 && meaningfulDays < 3 && (
            <View style={[styles.card, { backgroundColor: water.surfaceDeep }]}>
              <ThemedText type="small" style={{ color: water.mist }}>
                {t('history.lowHistoryHint')}
              </ThemedText>
            </View>
          )}

          <View style={styles.list}>
            <ThemedText type="smallBold" style={{ color: water.ink }}>
              {t('history.previousDays')}
            </ThemedText>
            {weeklyPastGroups.map((group) => (
              <View key={group.weekStart} style={styles.weekGroup}>
                <View style={styles.weekHeader}>
                  <ThemedText type="smallBold" style={{ color: water.mist }}>
                    {formatWeekRangeLabel(group.weekStart)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: water.mist }}>
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
                    <View
                      key={item.date}
                      style={[styles.row, { backgroundColor: water.surfaceDeep }]}>
                      <View style={styles.rowLeft}>
                        <ThemedText type="smallBold" style={{ color: water.ink }}>
                          {formatDateLabel(item.date)}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          style={{ color: water.mist }}
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {status} -{' '}
                          {item.intakeMl > state.goalMl && state.goalMl > 0
                            ? t('history.overGoal', { ml: item.intakeMl - state.goalMl })
                            : t('history.percentOfGoal', { percent })}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold" style={[styles.rowRightValue, { color: water.ink }]}>
                        {t('history.mlValue', { ml: item.intakeMl })}
                      </ThemedText>
                    </View>
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
  header: {
    paddingHorizontal: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginBottom: Spacing.one,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Spacing.three,
  },
  rangeButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
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
