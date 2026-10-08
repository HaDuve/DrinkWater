import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenLoadingState } from '@/components/screen-loading-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WaterLiquidVessel } from '@/components/water-liquid-vessel';
import { WaterReminderInfo } from '@/components/water-reminder-info';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { buildTodayRemainingPreview } from '@/features/water/domain/today-remaining-preview';
import { useTabBarBottomInset } from '@/hooks/use-tab-bar-bottom-inset';
import { useWaterMaterial } from '@/hooks/use-water-material';
import { getWaterReminderUiState, syncWaterRemindersFromState, type WaterReminderUiState } from '@/lib/notifications';
import type { WaterSettings } from '@/lib/storage';
import { addGlassAmount, loadWaterState, removeGlassAmount } from '@/lib/storage';

type BusyAction = 'add' | 'undo' | null;

export default function HomeScreen() {
  const { t } = useTranslation();
  const tabBarBottomInset = useTabBarBottomInset();
  const water = useWaterMaterial();
  const [state, setState] = useState<WaterSettings | null>(null);
  const [reminderStatus, setReminderStatus] = useState<WaterReminderUiState | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const s = await loadWaterState();
      const reminder = await getWaterReminderUiState(s.remindersEnabled, {
        goalMl: s.goalMl,
        glassMl: s.glassMl,
        intakeMl: s.intakeMl,
        window: s.reminderWindow,
      });
      setState(s);
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

  if (!state) {
    return <ScreenLoadingState />;
  }

  const progress = state.goalMl > 0 ? state.intakeMl / state.goalMl : 0;
  const addBusy = busyAction === 'add';
  const undoBusy = busyAction === 'undo';

  return (
    <ThemedView style={[styles.container, { backgroundColor: water.surface }]}>
      <SafeAreaView
        style={[styles.safeArea, { paddingBottom: tabBarBottomInset + Spacing.three }]}
        edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces>
          <View style={styles.hero}>
            <WaterLiquidVessel
              intakeMl={state.intakeMl}
              goalMl={state.goalMl}
              busyAction={busyAction}
              size={260}
              intakeLine={t('home.intakeGoalTop', { intake: state.intakeMl })}
              goalLine={t('home.intakeGoalBottom', { goal: state.goalMl })}
              sublabel={
                progress >= 1
                  ? t('home.goalReached')
                  : t('home.percentToGo', {
                      percent: Math.round((1 - progress) * 100),
                    })
              }
            />
          </View>

          {reminderStatus ? (
            <WaterReminderInfo status={reminderStatus} todayPreview={todayPreview} />
          ) : null}

          <View style={styles.actions}>
            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityState={{ disabled: Boolean(busyAction), busy: addBusy }}
              disabled={Boolean(busyAction)}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: water.water },
                pressed && !busyAction && styles.pressed,
                busyAction && styles.disabled,
              ]}
              onPress={() => runGlassAction('add', state.glassMl)}>
              <ThemedText type="smallBold" style={[styles.btnLightText, { color: water.foam }]}>
                {addBusy ? t('home.addGlassBusy') : t('home.addGlass', { ml: state.glassMl })}
              </ThemedText>
            </Pressable>

            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityState={{ disabled: Boolean(busyAction), busy: undoBusy }}
              disabled={Boolean(busyAction)}
              hitSlop={Spacing.two}
              style={({ pressed }) => [
                styles.tertiaryHit,
                pressed && !busyAction && styles.pressed,
                busyAction && styles.disabled,
              ]}
              onPress={() => runGlassAction('undo', state.glassMl)}>
              <ThemedText type="linkPrimary">
                {undoBusy ? t('home.undoGlassBusy') : t('home.undoGlass')}
              </ThemedText>
            </Pressable>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.four,
  },
  actions: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  tertiaryHit: {
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLightText: {},
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
