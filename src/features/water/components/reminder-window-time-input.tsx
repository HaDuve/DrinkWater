import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  dateToTimeOfDay,
  formatTimeOfDay,
  parseTimeOfDayInput,
  timeOfDayToDate,
  type TimeOfDay,
} from '@/features/water/domain/glass-schedule';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type ActiveField = 'start' | 'end' | null;

type PickerSlotProps = {
  value: TimeOfDay;
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onDismiss: () => void;
  onChange: (value: TimeOfDay) => void;
};

function PickerSlot({
  value,
  active,
  accessibilityLabel,
  onPress,
  onDismiss,
  onChange,
}: PickerSlotProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      onDismiss();
    }
    if (event.type === 'dismissed' || !date) return;
    onChange(dateToTimeOfDay(date));
  };

  const slotStyle = [
    styles.slot,
    {
      borderColor: active ? '#208AEF' : theme.backgroundElement,
      backgroundColor: theme.backgroundElement,
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={slotStyle}>
        <input
          type="time"
          aria-label={accessibilityLabel}
          value={formatTimeOfDay(value)}
          onChange={(event) => {
            const next = parseTimeOfDayInput(event.currentTarget.value);
            if (next) onChange(next);
          }}
          style={{
            borderWidth: 0,
            backgroundColor: 'transparent',
            fontSize: 16,
            color: theme.text,
            width: '100%',
            textAlign: 'center',
          }}
        />
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={slotStyle} accessibilityLabel={accessibilityLabel}>
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
    <View style={slotStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.androidPressable, pressed && styles.pressed]}
      >
        <ThemedText>{formatTimeOfDay(value)}</ThemedText>
      </Pressable>
      {active ? (
        <DateTimePicker
          value={timeOfDayToDate(value)}
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

type Props = {
  label: string;
  start: TimeOfDay;
  end: TimeOfDay;
  onStartChange: (value: TimeOfDay) => void;
  onEndChange: (value: TimeOfDay) => void;
  startAccessibilityLabel: string;
  endAccessibilityLabel: string;
};

export function ReminderWindowTimeInput({
  label,
  start,
  end,
  onStartChange,
  onEndChange,
  startAccessibilityLabel,
  endAccessibilityLabel,
}: Props) {
  const theme = useTheme();
  const [activeField, setActiveField] = useState<ActiveField>(null);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <PickerSlot
          value={start}
          active={activeField === 'start'}
          accessibilityLabel={startAccessibilityLabel}
          onPress={() => setActiveField('start')}
          onDismiss={() => setActiveField(null)}
          onChange={onStartChange}
        />
        <ThemedText style={[styles.separator, { color: theme.textSecondary }]}>
          --
        </ThemedText>
        <PickerSlot
          value={end}
          active={activeField === 'end'}
          accessibilityLabel={endAccessibilityLabel}
          onPress={() => setActiveField('end')}
          onDismiss={() => setActiveField(null)}
          onChange={onEndChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  slot: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  androidPressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  separator: {
    fontSize: 16,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
