import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { WaterReminderInfo } from '@/components/water-reminder-info';
import { Spacing } from '@/constants/theme';
import { HomeGlassActions } from '@/features/water/components/home-glass-actions';
import { HomeVessel } from '@/features/water/components/home-vessel';
import { HomeWeekTeaser } from '@/features/water/components/home-week-teaser';
import type {
  HomeBusyAction,
  HomeCenterLayoutModel,
} from '@/features/water/domain/home-center-layout';
import type { TodayRemainingPreview } from '@/features/water/domain/today-remaining-preview';
import type { WeekTeaserSummary } from '@/features/water/domain/week-teaser';
import type { WaterReminderUiState } from '@/lib/notifications';
import type { WaterSettings } from '@/lib/storage';

type Props = {
  state: WaterSettings;
  layout: HomeCenterLayoutModel;
  weekTeaser: WeekTeaserSummary;
  reminderStatus: WaterReminderUiState | null;
  todayPreview: TodayRemainingPreview | null;
  vesselSublabel: string;
  primaryLabel: string;
  busyAction: HomeBusyAction;
  onAdd: () => void;
  onUndo: () => void;
};

/**
 * Center-stage home: vessel + CTA vertically centered; week/reminder as footer.
 * ScrollView + flexGrow keeps the stage centered when content fits, and scrolls
 * when Dynamic Type / small heights overflow.
 */
export function HomeCenterBody({
  state,
  layout,
  weekTeaser,
  reminderStatus,
  todayPreview,
  vesselSublabel,
  primaryLabel,
  busyAction,
  onAdd,
  onUndo,
}: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      bounces
      keyboardShouldPersistTaps="handled">
      <View style={styles.stage}>
        <HomeVessel
          state={state}
          progress={layout.progress}
          vesselSublabel={vesselSublabel}
          busyAction={busyAction}
          size={layout.vesselSize}
        />
        <HomeGlassActions
          primaryLabel={primaryLabel}
          busyAction={busyAction}
          canUndo={layout.canUndo}
          onAdd={onAdd}
          onUndo={onUndo}
        />
      </View>

      <View style={styles.footer}>
        <HomeWeekTeaser summary={weekTeaser} />
        {reminderStatus ? (
          <WaterReminderInfo status={reminderStatus} todayPreview={todayPreview} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
  },
  stage: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.three,
  },
  footer: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
