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
import { useWaterMaterial } from '@/hooks/use-water-material';

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
  const water = useWaterMaterial();
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
      borderColor: active ? water.water : water.surfaceDeep,
      backgroundColor: water.surfaceDeep,
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
            color: water.ink,
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
          accentColor={water.water}
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
        role="button"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.androidPressable, pressed && styles.pressed]}>
        <ThemedText style={{ color: water.ink }}>{formatTimeOfDay(value)}</ThemedText>
      </Pressable>
      {active ? (
        <DateTimePicker
          value={timeOfDayToDate(value)}
          mode="time"
          is24Hour
          display="default"
          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
          accentColor={water.water}
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
  const water = useWaterMaterial();
  const [activeField, setActiveField] = useState<ActiveField>(null);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={{ color: water.ink }}>
        {label}
      </ThemedText>
      <View style={styles.row}>
        <PickerSlot
          value={start}
          active={activeField === 'start'}
          accessibilityLabel={startAccessibilityLabel}
          onPress={() => setActiveField('start')}
          onDismiss={() => setActiveField(null)}
          onChange={onStartChange}
        />
        <ThemedText style={[styles.separator, { color: water.mist }]}>--</ThemedText>
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
    minHeight: 48,
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
    minHeight: 48,
  },
  separator: {
    fontSize: 16,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
