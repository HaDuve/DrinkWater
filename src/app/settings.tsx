import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { syncWaterReminders } from '@/lib/notifications';
import type { WaterSettings } from '@/lib/storage';
import {
  loadWaterState,
  saveGlassMl,
  saveGoalMl,
  saveIntervalHours,
  saveRemindersEnabled,
} from '@/lib/storage';

export default function SettingsScreen() {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<WaterSettings | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [glassInput, setGlassInput] = useState('');
  const [intervalInput, setIntervalInput] = useState('');
  const [reminders, setReminders] = useState(true);

  const refresh = useCallback(() => {
    void loadWaterState().then((s) => {
      setLoaded(s);
      setGoalInput(String(s.goalMl));
      setGlassInput(String(s.glassMl));
      setIntervalInput(String(s.intervalHours));
      setReminders(s.remindersEnabled);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const save = useCallback(async () => {
    const goal = Number.parseInt(goalInput, 10);
    const glass = Number.parseInt(glassInput, 10);
    const interval = Number.parseInt(intervalInput, 10);

    if (!Number.isFinite(goal) || goal < 100) {
      Alert.alert('Invalid goal', 'Daily goal must be at least 100 ml.');
      return;
    }
    if (!Number.isFinite(glass) || glass < 50) {
      Alert.alert('Invalid glass size', 'Glass size must be at least 50 ml.');
      return;
    }
    if (!Number.isFinite(interval) || interval < 1 || interval > 12) {
      Alert.alert('Invalid interval', 'Reminder interval must be between 1 and 12 hours.');
      return;
    }

    await saveGoalMl(goal);
    await saveGlassMl(glass);
    await saveIntervalHours(interval);
    await saveRemindersEnabled(reminders);
    await syncWaterReminders(reminders, interval);

    const hint =
      reminders && Platform.OS !== 'web'
        ? 'Allow notifications if prompted. Test reminders on a physical device.'
        : 'Your settings were updated.';
    Alert.alert('Saved', hint);
    refresh();
  }, [goalInput, glassInput, intervalInput, reminders, refresh]);

  const dismissAndSave = useCallback(() => {
    Keyboard.dismiss();
    void save();
  }, [save]);

  if (!loaded) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.backgroundElement,
      backgroundColor: theme.backgroundElement,
    },
  ];

  const avoidingBehavior = Platform.select<'padding' | 'height' | undefined>({
    ios: 'padding',
    android: 'height',
    default: undefined,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={avoidingBehavior}
          enabled={Platform.OS !== 'web'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? BottomTabInset : 0}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.formInner}>
                <ThemedText type="title" style={styles.screenTitle}>
                  Settings
                </ThemedText>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Daily goal (ml)</ThemedText>
                  <TextInput
                    keyboardType="number-pad"
                    value={goalInput}
                    onChangeText={setGoalInput}
                    style={inputStyle}
                    placeholder="2000"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Glass size (ml)</ThemedText>
                  <TextInput
                    keyboardType="number-pad"
                    value={glassInput}
                    onChangeText={setGlassInput}
                    style={inputStyle}
                    placeholder="250"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Reminder interval (hours)</ThemedText>
                  <TextInput
                    keyboardType="number-pad"
                    value={intervalInput}
                    onChangeText={setIntervalInput}
                    style={inputStyle}
                    placeholder="2"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    Repeating local notification every N hours (1–12). Test on a physical device.
                  </ThemedText>
                </View>

                <View style={styles.row}>
                  <ThemedText type="smallBold">Reminders</ThemedText>
                  <Switch
                    value={reminders}
                    onValueChange={setReminders}
                    trackColor={{ false: theme.backgroundElement, true: '#208AEF' }}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: BottomTabInset + Spacing.three,
                borderTopColor: theme.backgroundElement,
              },
            ]}>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
              onPress={dismissAndSave}>
              <ThemedText type="smallBold" style={styles.saveBtnText}>
                Save settings
              </ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  formInner: {
    flexGrow: 1,
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  saveBtn: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
});
