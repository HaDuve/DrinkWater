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

type Props = {
  label: string;
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
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

function parseTimeInput(raw: string): TimeOfDay | null {
  const match = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function TimeOfDayPicker({ label, value, onChange }: Props) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !date) return;
    onChange(dateToTimeOfDay(date));
  };

  const openPicker = () => {
    setShowPicker(true);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <input
          type="time"
          value={formatTimeOfDay(value)}
          onChange={(event) => {
            const next = parseTimeInput(event.currentTarget.value);
            if (next) onChange(next);
          }}
          style={{
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: theme.backgroundElement,
            backgroundColor: theme.backgroundElement,
            borderRadius: Spacing.two,
            padding: Spacing.two,
            fontSize: 16,
            color: theme.text,
            width: '100%',
          }}
        />
      </View>
    );
  }

  const inputStyle = [
    styles.input,
    {
      borderColor: theme.backgroundElement,
      backgroundColor: theme.backgroundElement,
    },
  ];

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [inputStyle, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens time picker"
      >
        <ThemedText>{formatTimeOfDay(value)}</ThemedText>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={timeOfDayToDate(value)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
          accentColor="#208AEF"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
