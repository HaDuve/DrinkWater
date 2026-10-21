import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenLoadingState } from '@/components/screen-loading-state';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import { formatGlassSuccessCueBody } from '@/features/water/components/glass-success-cue-copy';
import { HomeCenterBody } from '@/features/water/components/home-center-body';
import {
  buildGlassSuccessCue,
  type GlassSuccessCue,
} from '@/features/water/domain/glass-success-cue';
import { buildHomeCenterLayoutModel } from '@/features/water/domain/home-center-layout';
import { buildTodayRemainingPreview } from '@/features/water/domain/today-remaining-preview';
import { buildWeekTeaserSummary } from '@/features/water/domain/week-teaser';
import { subscribeIntakeChanged } from '@/features/water/hooks/intake-changed';
import { logGlassAndSyncReminders } from '@/features/water/hooks/log-glass-and-sync-reminders';
import { useWaterMaterial } from '@/hooks/use-water-material';
import { getWaterReminderUiState, syncWaterRemindersFromState, type WaterReminderUiState } from '@/lib/notifications';
import type { DailyHistoryEntry, WaterSettings } from '@/lib/storage';
import { loadDailyHistory, loadWaterState, removeGlassAmount } from '@/lib/storage';

type BusyAction = 'add' | 'undo' | null;

export default function HomeScreen() {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const [state, setState] = useState<WaterSettings | null>(null);
  const [weekHistory, setWeekHistory] = useState<DailyHistoryEntry[] | null>(null);
  const [reminderStatus, setReminderStatus] = useState<WaterReminderUiState | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [successCue, setSuccessCue] = useState<GlassSuccessCue | null>(null);

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

  useEffect(() => subscribeIntakeChanged(refresh), [refresh]);

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

  const runGlassAction = useCallback(
    (action: { type: 'add' } | { type: 'undo'; amount: number }) => {
      if (busyAction || !state) return;
      const previousIntakeMl = state.intakeMl;
      const amountMl = action.type === 'add' ? state.glassMl : action.amount;
      setBusyAction(action.type);
      void (async () => {
        try {
          if (action.type === 'add') {
            await logGlassAndSyncReminders();
          } else {
            await removeGlassAmount(action.amount);
            await syncWaterRemindersFromState();
          }
          const cue = buildGlassSuccessCue({
            action: action.type,
            amountMl,
            previousIntakeMl,
          });
          setSuccessCue(cue);
          refresh();
          AccessibilityInfo.announceForAccessibility(formatGlassSuccessCueBody(cue, t));
        } catch {
          AccessibilityInfo.announceForAccessibility(t('home.glassActionFailed'));
        } finally {
          setBusyAction(null);
        }
      })();
    },
    [busyAction, refresh, state, t],
  );

  if (!state || !weekHistory) {
    return <ScreenLoadingState />;
  }

  const weekTeaser = buildWeekTeaserSummary(weekHistory, state.goalMl);
  const layout = buildHomeCenterLayoutModel({
    intakeMl: state.intakeMl,
    goalMl: state.goalMl,
  });
  const vesselSublabel = layout.goalReached
    ? t('home.goalReached')
    : t('home.percentToGo', { percent: Math.round((1 - layout.progress) * 100) });
  const primaryLabel =
    busyAction === 'add' ? t('home.addGlassBusy') : t('home.addGlass', { ml: state.glassMl });

  return (
    <ThemedView style={[styles.container, { backgroundColor: water.surface }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <HomeCenterBody
          state={state}
          layout={layout}
          weekTeaser={weekTeaser}
          reminderStatus={reminderStatus}
          todayPreview={todayPreview}
          vesselSublabel={vesselSublabel}
          primaryLabel={primaryLabel}
          busyAction={busyAction}
          successCue={successCue}
          onAdd={() => runGlassAction({ type: 'add' })}
          onUndo={() => runGlassAction({ type: 'undo', amount: state.glassMl })}
        />
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
});
