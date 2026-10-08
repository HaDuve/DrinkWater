import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const LINK_MIN_HEIGHT = 48;
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
  let showSettingsLink = false;
  switch (status.kind) {
    case 'web':
      body = t('reminder.web');
      showSettingsLink = true;
      break;
    case 'app_off':
      body = t('reminder.appOff');
      showSettingsLink = true;
      break;
    case 'no_permission':
      body = t('reminder.noPermission');
      showSettingsLink = true;
      break;
    case 'inactive':
      body = t('reminder.inactive');
      showSettingsLink = true;
      break;
    case 'active':
      body = reminderBody ?? t('reminder.inactive');
      break;
  }

  const linkLabel =
    status.kind === 'web'
      ? t('reminder.linkSettings')
      : status.kind === 'app_off'
        ? t('reminder.linkTurnOn')
        : t('reminder.linkSetup');

  const statusLabel = expectingNext
    ? t('reminder.a11yScheduled')
    : t('reminder.a11yNotScheduled');

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: water.surfaceDeep,
        },
      ]}>
      <View style={styles.row}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: expectingNext ? water.caustic : water.mist,
            },
          ]}
          accessible={false}
          importantForAccessibility="no"
        />
        <View style={styles.textBlock}>
          <View style={styles.textRow}>
            <ThemedText
              type="small"
              style={[styles.bodyText, { color: water.mist }]}
              accessibilityLabel={`${statusLabel}. ${body}`}>
              {body}
            </ThemedText>
            {showSettingsLink ? (
              <Link href="/settings" asChild>
                <Pressable
                  role="link"
                  accessibilityRole="link"
                  accessibilityLabel={linkLabel}
                  hitSlop={Spacing.two}
                  style={({ pressed }) => [
                    styles.linkHit,
                    pressed && styles.linkPressed,
                  ]}>
                  <ThemedText type="small" style={[styles.linkText, { color: water.water }]}>
                    {linkLabel}
                  </ThemedText>
                </Pressable>
              </Link>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginTop: 7,
    opacity: 0.85,
  },
  textBlock: {
    flex: 1,
    maxWidth: '100%',
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  bodyText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  linkText: {
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  linkHit: {
    minHeight: LINK_MIN_HEIGHT,
    justifyContent: 'center',
  },
  linkPressed: {
    opacity: 0.7,
  },
});
