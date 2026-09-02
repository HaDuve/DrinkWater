import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  formatTimeOfDay,
  parseTimeOfDayInput,
  type TimeOfDay,
} from '@/features/water/domain/glass-schedule';
import { useTheme } from '@/hooks/use-theme';

type TimeInputProps = {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
  accessibilityLabel: string;
};

function TimeInput({ value, onChange, accessibilityLabel }: TimeInputProps) {
  const theme = useTheme();
  const [text, setText] = useState(formatTimeOfDay(value));

  useEffect(() => {
    setText(formatTimeOfDay(value));
  }, [value]);

  const commit = () => {
    const parsed = parseTimeOfDayInput(text);
    if (parsed) {
      onChange(parsed);
      setText(formatTimeOfDay(parsed));
      return;
    }
    setText(formatTimeOfDay(value));
  };

  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.timeInput,
        {
          color: theme.text,
          borderColor: theme.backgroundElement,
          backgroundColor: theme.backgroundElement,
        },
      ]}
      placeholder="HH:MM"
      placeholderTextColor={theme.textSecondary}
    />
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

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <TimeInput
          value={start}
          onChange={onStartChange}
          accessibilityLabel={startAccessibilityLabel}
        />
        <ThemedText style={[styles.separator, { color: theme.textSecondary }]}>
          --
        </ThemedText>
        <TimeInput
          value={end}
          onChange={onEndChange}
          accessibilityLabel={endAccessibilityLabel}
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
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlign: 'center',
  },
  separator: {
    fontSize: 16,
  },
});
