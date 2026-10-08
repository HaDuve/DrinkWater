import { useFocusEffect } from '@react-navigation/native';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeSettingsButton } from '@/components/home-settings-button';
import { HomeWeekTeaser } from '@/components/home-week-teaser';
import { ScreenLoadingState } from '@/components/screen-loading-state';
import { StrokedText } from '@/components/stroked-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WaterLiquidVessel } from '@/components/water-liquid-vessel';
import { WaterProgressRing } from '@/components/water-progress-ring';
import { WaterReminderInfo } from '@/components/water-reminder-info';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { pickHomeVesselKind } from '@/features/water/domain/home-vessel-kind';
import { buildTodayRemainingPreview } from '@/features/water/domain/today-remaining-preview';
import { buildWeekTeaserSummary } from '@/features/water/domain/week-teaser';
import { useWaterMaterial } from '@/hooks/use-water-material';
import { getWaterReminderUiState, syncWaterRemindersFromState, type WaterReminderUiState } from '@/lib/notifications';
import type { DailyHistoryEntry, WaterSettings } from '@/lib/storage';
import { addGlassAmount, loadDailyHistory, loadWaterState, removeGlassAmount } from '@/lib/storage';

type BusyAction = 'add' | 'undo' | null;

export default function HomeScreen() {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const [state, setState] = useState<WaterSettings | null>(null);
  const [weekHistory, setWeekHistory] = useState<DailyHistoryEntry[] | null>(null);
  const [reminderStatus, setReminderStatus] = useState<WaterReminderUiState | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const [s, history] = await Promise.all([loadWaterState(), loadDailyHistory(7)]);
      const reminder = await getWaterReminderUiState(s.remindersEnabled, {
        goalMl: s.goalMl,
        glassMl: s.glassMl,
        intakeMl: s.intakeMl,
        window: s.reminderWindow,
      });
      setState(s);
      setWeekHistory(history);
      setReminderStatus(reminder);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const todayPreview = useMemo(() => {
    if (!state) return null;
    return buildTodayRemainingPreview({
      goalMl: state.goalMl,
      glassMl: state.glassMl,
      intakeMl: state.intakeMl,
      window: state.reminderWindow,
      now: new Date(),
    });
  }, [state]);

  const weekTeaser = useMemo(() => {
    if (!state || !weekHistory) return null;
    return buildWeekTeaserSummary(weekHistory, state.goalMl);
  }, [state, weekHistory]);

  const runGlassAction = useCallback(
    (action: 'add' | 'undo', amount: number) => {
      if (busyAction) return;
      setBusyAction(action);
      void (async () => {
        try {
          if (action === 'add') {
            await addGlassAmount(amount);
          } else {
            await removeGlassAmount(amount);
          }
          await syncWaterRemindersFromState();
          refresh();
          AccessibilityInfo.announceForAccessibility(
            action === 'add' ? t('home.addGlassDone') : t('home.undoGlassDone'),
          );
        } finally {
          setBusyAction(null);
        }
      })();
    },
    [busyAction, refresh, t],
  );

  if (!state || !weekHistory || !weekTeaser) {
    return <ScreenLoadingState />;
  }

  const progress = state.goalMl > 0 ? state.intakeMl / state.goalMl : 0;
  const vesselSublabel =
    progress >= 1
      ? t('home.goalReached')
      : t('home.percentToGo', { percent: Math.round((1 - progress) * 100) });
  const addBusy = busyAction === 'add';
  const undoBusy = busyAction === 'undo';
  const canUndo = state.intakeMl > 0;
  const primaryLabel = addBusy ? t('home.addGlassBusy') : t('home.addGlass', { ml: state.glassMl });

  return (
    <ThemedView style={[styles.container, { backgroundColor: water.surface }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <HomeSettingsButton />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          bounces>
          <View style={styles.hero}>
            {pickHomeVesselKind(state.animationsEnabled) === 'liquid' ? (
              <WaterLiquidVessel
                intakeMl={state.intakeMl}
                goalMl={state.goalMl}
                busyAction={busyAction}
                size={260}
                intakeLine={t('home.intakeGoalTop', { intake: state.intakeMl })}
                goalLine={t('home.intakeGoalBottom', { goal: state.goalMl })}
                sublabel={vesselSublabel}
              />
            ) : (
              <WaterProgressRing
                progress={progress}
                size={260}
                centerLabel={t('home.intakeGoal', {
                  intake: state.intakeMl,
                  goal: state.goalMl,
                })}
                sublabel={vesselSublabel}
              />
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              accessibilityState={{ disabled: Boolean(busyAction), busy: addBusy }}
              disabled={Boolean(busyAction)}
              style={({ pressed }) => [
                styles.primaryBtn,
                canUndo && styles.primaryBtnWithUndo,
                { backgroundColor: water.waterDeep },
                pressed && !busyAction && styles.pressed,
                busyAction && styles.disabled,
              ]}
              onPress={() => runGlassAction('add', state.glassMl)}>
              <StrokedText
                type="smallBold"
                fill={water.onWater}
                outline="#000000"
                outlineWidth={1.5}
                style={styles.primaryBtnLabel}>
                {primaryLabel}
              </StrokedText>
            </Pressable>

            {canUndo ? (
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={t('home.undoGlass')}
                accessibilityState={{ disabled: Boolean(busyAction), busy: undoBusy }}
                disabled={Boolean(busyAction)}
                style={({ pressed }) => [
                  styles.undoBtn,
                  { backgroundColor: water.danger },
                  pressed && !busyAction && styles.pressed,
                  busyAction && styles.disabled,
                ]}
                onPress={() => runGlassAction('undo', state.glassMl)}>
                <SymbolView
                  name="arrow.uturn.backward"
                  size={20}
                  weight="semibold"
                  tintColor={water.onWater}
                  fallback={
                    <ThemedText type="smallBold" style={{ color: water.onWater }}>
                      ↩
                    </ThemedText>
                  }
                />
              </Pressable>
            ) : null}
          </View>

          <HomeWeekTeaser summary={weekTeaser} />

          {reminderStatus ? (
            <WaterReminderInfo status={reminderStatus} todayPreview={todayPreview} />
          ) : null}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.two,
  },
  topBarSpacer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    overflow: 'visible',
  },
  /** Undo ≈ 20% of primary width → 5:1 flex. */
  primaryBtnWithUndo: {
    flex: 5,
  },
  primaryBtnLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  undoBtn: {
    flex: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
