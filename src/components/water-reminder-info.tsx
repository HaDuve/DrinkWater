import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { buildHomeReminderBody } from '@/features/water/components/next-glass-reminder-copy';
import type { TodayRemainingPreview } from '@/features/water/domain/today-remaining-preview';
import { useWaterMaterial } from '@/hooks/use-water-material';
import type { WaterReminderUiState } from '@/lib/notifications';

const DOT_SIZE = 5;

type Props = {
  status: WaterReminderUiState;
  todayPreview?: TodayRemainingPreview | null;
};

export function WaterReminderInfo({ status, todayPreview }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const water = useWaterMaterial();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status.kind !== 'active') return;
    const id = setInterval(() => setTick((tick) => tick + 1), 30_000);
    return () => clearInterval(id);
  }, [status.kind]);

  const reminderBody =
    status.kind === 'active'
      ? buildHomeReminderBody(
          status.nextSlot,
          status.slotDay,
          status.nextTriggerMs - Date.now(),
          todayPreview,
          t,
        )
      : null;

  const expectingNext = status.kind === 'active';

  let body: string;
  let actionLabel = t('home.openSettings');
  switch (status.kind) {
    case 'web':
      body = t('reminder.web');
      actionLabel = t('reminder.linkSettings');
      break;
    case 'app_off':
      body = t('reminder.appOff');
      actionLabel = t('reminder.linkTurnOn');
      break;
    case 'no_permission':
      body = t('reminder.noPermission');
      actionLabel = t('reminder.linkSetup');
      break;
    case 'inactive':
      body = t('reminder.inactive');
      actionLabel = t('reminder.linkSetup');
      break;
    case 'active':
      body = reminderBody ?? t('reminder.inactive');
      break;
  }

  const statusLabel = expectingNext
    ? t('reminder.a11yScheduled')
    : t('reminder.a11yNotScheduled');
  const a11yLabel = `${statusLabel}. ${body}. ${actionLabel}`;

  return (
    <Pressable
      role="link"
      accessibilityRole="link"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t('home.reminderBarHint')}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: water.surfaceDeep },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.dot,
          { backgroundColor: expectingNext ? water.caustic : water.mist },
        ]}
        accessible={false}
        importantForAccessibility="no"
      />
      <ThemedText type="small" style={[styles.body, { color: water.mist }]}>
        {body}
      </ThemedText>
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
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    opacity: 0.85,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
