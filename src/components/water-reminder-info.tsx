import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WaterReminderUiState } from '@/lib/notifications';

const DOT_SIZE = 6;
const ACTIVE_DOT = '#22c55e';

function formatReminderIn(msFromNow: number): string {
  if (!Number.isFinite(msFromNow) || msFromNow <= 0) return 'soon';
  if (msFromNow < 60_000) return 'less than 1 min';
  const mins = Math.round(msFromNow / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  if (Math.abs(h - Math.round(h)) < 0.06) return `${Math.round(h)} h`;
  return `${h.toFixed(1)} h`;
}

type Props = {
  status: WaterReminderUiState;
};

export function WaterReminderInfo({ status }: Props) {
  const theme = useTheme();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status.kind !== 'active') return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [status.kind]);

  const nextIn =
    status.kind === 'active'
      ? formatReminderIn(status.nextTriggerMs - Date.now())
      : null;

  const expectingNext = status.kind === 'active';

  let body: string;
  let showSettingsLink = false;
  switch (status.kind) {
    case 'web':
      body = 'Reminders are available on iOS and Android.';
      showSettingsLink = true;
      break;
    case 'app_off':
      body = 'Reminders off.';
      showSettingsLink = true;
      break;
    case 'no_permission':
      body = 'Notifications disabled.';
      showSettingsLink = true;
      break;
    case 'inactive':
      body = 'Reminder not scheduled.';
      showSettingsLink = true;
      break;
    case 'active':
      body = `Next reminder in ${nextIn}.`;
      break;
  }

  const linkLabel =
    status.kind === 'web'
      ? 'Settings'
      : status.kind === 'app_off'
        ? 'Turn on in Settings'
        : 'Set up in Settings';

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
          accessibilityLabel={expectingNext ? 'Reminder scheduled' : 'No reminder scheduled'}
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
