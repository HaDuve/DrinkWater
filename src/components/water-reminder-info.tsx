import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { buildNextGlassReminderBody } from '@/features/water/components/next-glass-reminder-copy';
import { useTheme } from '@/hooks/use-theme';
import type { WaterReminderUiState } from '@/lib/notifications';

const DOT_SIZE = 6;
const ACTIVE_DOT = '#22c55e';

type Props = {
  status: WaterReminderUiState;
};

export function WaterReminderInfo({ status }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status.kind !== 'active') return;
    const id = setInterval(() => setTick((tick) => tick + 1), 30_000);
    return () => clearInterval(id);
  }, [status.kind]);

  const reminderBody =
    status.kind === 'active'
      ? buildNextGlassReminderBody(
          status.nextSlot,
          status.slotDay,
          status.nextTriggerMs - Date.now(),
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

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: expectingNext ? ACTIVE_DOT : theme.textSecondary,
            },
          ]}
          accessibilityLabel={
            expectingNext ? t('reminder.a11yScheduled') : t('reminder.a11yNotScheduled')
          }
        />
        <View style={styles.textBlock}>
          <View style={styles.textRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
              {body}
            </ThemedText>
            {showSettingsLink ? (
              <Link href="/settings" asChild>
                <Pressable>
                  <ThemedText type="linkPrimary" style={styles.linkText}>
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
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
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
    marginTop: 6,
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
  },
  linkText: {
    flexShrink: 0,
  },
});
