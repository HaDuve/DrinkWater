/**
 * PROTOTYPE — three native DateTimePicker layouts for reminder window.
 * Question: which native picker pattern avoids double-time UI and feels right on device?
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  formatTimeOfDay,
  type TimeOfDay,
} from '@/features/water/domain/glass-schedule';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export const TIME_PICKER_PROTOTYPE_VARIANTS = [
  { key: 'A', name: 'Tap opens modal' },
  { key: 'B', name: 'iOS compact inline' },
  { key: 'C', name: 'Spinner wheels' },
] as const;

export type TimePickerPrototypeVariant =
  (typeof TIME_PICKER_PROTOTYPE_VARIANTS)[number]['key'];

export type TimePickerVariantProps = {
  label: string;
  start: TimeOfDay;
  end: TimeOfDay;
  onStartChange: (value: TimeOfDay) => void;
  onEndChange: (value: TimeOfDay) => void;
};

function timeOfDayToDate(time: TimeOfDay): Date {
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

function dateToTimeOfDay(date: Date): TimeOfDay {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

type ActiveField = 'start' | 'end' | null;

function PickerField({
  label,
  value,
  active,
  onPress,
  onChange,
  onDismiss,
  display,
}: {
  label: string;
  value: TimeOfDay;
  active: boolean;
  onPress: () => void;
  onChange: (time: TimeOfDay) => void;
  onDismiss: () => void;
  display: 'default' | 'spinner' | 'compact' | 'clock' | 'inline';
}) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      onDismiss();
    }
    if (event.type === 'dismissed' || !date) return;
    onChange(dateToTimeOfDay(date));
  };

  const inputStyle = [
    styles.input,
    {
      borderColor: active ? '#208AEF' : theme.backgroundElement,
      backgroundColor: theme.backgroundElement,
    },
  ];

  if (display === 'compact' && Platform.OS === 'ios') {
    return (
      <View style={styles.compactField}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <DateTimePicker
          value={timeOfDayToDate(value)}
          mode="time"
          display="compact"
          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
          accentColor="#208AEF"
          onChange={(_, date) => {
            if (date) onChange(dateToTimeOfDay(date));
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.compactField}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [inputStyle, pressed && styles.pressed]}
      >
        <ThemedText>{formatTimeOfDay(value)}</ThemedText>
      </Pressable>
      {active ? (
        <DateTimePicker
          value={timeOfDayToDate(value)}
          mode="time"
          is24Hour
          display={display}
          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
          accentColor="#208AEF"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

/** A — pressable time chips; picker opens as modal/dialog only while active. */
export function VariantA({
  label,
  start,
  end,
  onStartChange,
  onEndChange,
}: TimePickerVariantProps) {
  const [active, setActive] = useState<ActiveField>(null);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <PickerField
          label="Start"
          value={start}
          active={active === 'start'}
          onPress={() => setActive('start')}
          onDismiss={() => setActive(null)}
          onChange={onStartChange}
          display="default"
        />
        <ThemedText style={styles.separator}>--</ThemedText>
        <PickerField
          label="End"
          value={end}
          active={active === 'end'}
          onPress={() => setActive('end')}
          onDismiss={() => setActive(null)}
          onChange={onEndChange}
          display="default"
        />
      </View>
    </View>
  );
}

/** B — iOS compact pickers inline (no extra pressable); Android uses tap-to-dialog. */
export function VariantB({
  label,
  start,
  end,
  onStartChange,
  onEndChange,
}: TimePickerVariantProps) {
  const [active, setActive] = useState<ActiveField>(null);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <PickerField
          label="Start"
          value={start}
          active={active === 'start'}
          onPress={() => setActive('start')}
          onDismiss={() => setActive(null)}
          onChange={onStartChange}
          display="compact"
        />
        <ThemedText style={styles.separator}>--</ThemedText>
        <PickerField
          label="End"
          value={end}
          active={active === 'end'}
          onPress={() => setActive('end')}
          onDismiss={() => setActive(null)}
          onChange={onEndChange}
          display="compact"
        />
      </View>
    </View>
  );
}

/** C — always-visible spinner wheels (iOS) or tap-to-dialog (Android). */
export function VariantC({
  label,
  start,
  end,
  onStartChange,
  onEndChange,
}: TimePickerVariantProps) {
  const [active, setActive] = useState<ActiveField>('start');
  const colorScheme = useColorScheme();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setActive(null);
    }
    if (event.type === 'dismissed' || !date) return;
    if (active === 'start') onStartChange(dateToTimeOfDay(date));
    if (active === 'end') onEndChange(dateToTimeOfDay(date));
  };

  const theme = useTheme();
  const inputStyle = [
    styles.input,
    {
      borderColor: theme.backgroundElement,
      backgroundColor: theme.backgroundElement,
    },
  ];

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.field}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <View style={styles.spinnerBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            Start
          </ThemedText>
          <DateTimePicker
            value={timeOfDayToDate(start)}
            mode="time"
            is24Hour
            display="spinner"
            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
            accentColor="#208AEF"
            onChange={(_, date) => {
              if (date) onStartChange(dateToTimeOfDay(date));
            }}
          />
        </View>
        <View style={styles.spinnerBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            End
          </ThemedText>
          <DateTimePicker
            value={timeOfDayToDate(end)}
            mode="time"
            is24Hour
            display="spinner"
            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
            accentColor="#208AEF"
            onChange={(_, date) => {
              if (date) onEndChange(dateToTimeOfDay(date));
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <Pressable
          onPress={() => setActive('start')}
          style={({ pressed }) => [inputStyle, pressed && styles.pressed]}
        >
          <ThemedText>Start {formatTimeOfDay(start)}</ThemedText>
        </Pressable>
        <ThemedText style={styles.separator}>--</ThemedText>
        <Pressable
          onPress={() => setActive('end')}
          style={({ pressed }) => [inputStyle, pressed && styles.pressed]}
        >
          <ThemedText>End {formatTimeOfDay(end)}</ThemedText>
        </Pressable>
      </View>
      {active ? (
        <DateTimePicker
          value={timeOfDayToDate(active === 'start' ? start : end)}
          mode="time"
          is24Hour
          display="default"
          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
          accentColor="#208AEF"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

export function PrototypeStatePanel({
  start,
  end,
  variant,
}: {
  start: TimeOfDay;
  end: TimeOfDay;
  variant: string;
}) {
  return (
    <View style={styles.statePanel}>
      <ThemedText type="smallBold">PROTOTYPE state</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.mono}>
        {JSON.stringify({ variant, start, end }, null, 2)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  compactField: {
    flex: 1,
    minWidth: 120,
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  separator: {
    alignSelf: 'center',
    fontSize: 16,
    marginTop: Spacing.four,
  },
  spinnerBlock: {
    gap: Spacing.one,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  statePanel: {
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
  },
});
