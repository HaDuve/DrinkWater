import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

import { ExternalLink } from '@/components/external-link';
import { ScreenBackButton } from '@/components/screen-back-button';
import { ScreenLoadingState } from '@/components/screen-loading-state';
import { StrokedText } from '@/components/stroked-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { PRIVACY_POLICY_URL } from '@/constants/urls';
import { formatTodayRemainingPreviewBody } from '@/features/water/components/next-glass-reminder-copy';
import { ReminderWindowTimeInput } from '@/features/water/components/reminder-window-time-input';
import { resolveSettingsSaveAlert } from '@/features/water/hooks/settings-save-alert';
import { useSettingsModel } from '@/features/water/hooks/use-settings-model';
import { useWaterMaterial } from '@/hooks/use-water-material';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const {
    loaded,
    reminderWindow,
    setWindowStart,
    setWindowEnd,
    preview,
    todayPreview,
    goalInput,
    setGoalInput,
    glassInput,
    setGlassInput,
    reminders,
    setReminders,
    animations,
    setAnimations,
    refresh,
    save,
  } = useSettingsModel();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const dismissAndSave = useCallback(() => {
    Keyboard.dismiss();
    void save().then((result) => {
      if (!result.ok) {
        const alertKeys = resolveSettingsSaveAlert(result.error);
        Alert.alert(t(alertKeys.titleKey), t(alertKeys.messageKey));
        return;
      }

      const hint = result.notificationsHint
        ? t('settings.alertSavedNotificationsHint')
        : t('settings.alertSavedGeneric');
      Alert.alert(t('settings.alertSavedTitle'), hint);
    });
  }, [save, t]);

  if (!loaded) {
    return <ScreenLoadingState />;
  }

  const inputStyle = [
    styles.input,
    {
      color: water.ink,
      borderColor: water.surfaceDeep,
      backgroundColor: water.surfaceDeep,
    },
  ];

  const avoidingBehavior = Platform.select<'padding' | 'height' | undefined>({
    ios: 'padding',
    android: 'height',
    default: undefined,
  });

  const footer = (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: Spacing.three,
          borderTopColor: water.surfaceDeep,
        },
      ]}>
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityLabel={t('settings.save')}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: water.waterDeep },
          pressed && styles.pressed,
        ]}
        onPress={dismissAndSave}>
        <StrokedText
          type="smallBold"
          fill={water.onWater}
          outline={water.strokeOutline}
          outlineWidth={1.5}
          style={styles.saveBtnLabel}>
          {t('settings.save')}
        </StrokedText>
      </Pressable>
    </View>
  );

  const formScrollInner = (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.formInner}>
        <ThemedText type="title" style={[styles.screenTitle, { color: water.ink }]}>
          {t('settings.title')}
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="smallBold" style={{ color: water.ink }}>
            {t('settings.dailyGoalMl')}
          </ThemedText>
          <TextInput
            keyboardType="number-pad"
            value={goalInput}
            onChangeText={setGoalInput}
            style={inputStyle}
            placeholder="2000"
            placeholderTextColor={water.mist}
            accessibilityLabel={t('settings.dailyGoalMl')}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold" style={{ color: water.ink }}>
            {t('settings.glassSizeMl')}
          </ThemedText>
          <TextInput
            keyboardType="number-pad"
            value={glassInput}
            onChangeText={setGlassInput}
            style={inputStyle}
            placeholder="250"
            placeholderTextColor={water.mist}
            accessibilityLabel={t('settings.glassSizeMl')}
          />
        </View>

        {reminderWindow ? (
          <>
            <ReminderWindowTimeInput
              label={t('settings.notifyTime')}
              start={reminderWindow.start}
              end={reminderWindow.end}
              onStartChange={setWindowStart}
              onEndChange={setWindowEnd}
              startAccessibilityLabel={t('settings.reminderWindowStart')}
              endAccessibilityLabel={t('settings.reminderWindowEnd')}
            />

            {preview ? (
              <ThemedText type="small" style={{ color: water.mist }}>
                {preview.ok
                  ? t('settings.reminderPlanPreview', {
                      count: preview.glassCount,
                      start: preview.windowStart,
                      end: preview.windowEnd,
                    })
                  : t('settings.reminderPlanInvalid')}
              </ThemedText>
            ) : null}
          </>
        ) : null}

        <View style={[styles.row, { backgroundColor: water.surfaceDeep }]}>
          <ThemedText type="smallBold" style={{ color: water.ink }}>
            {t('settings.reminders')}
          </ThemedText>
          <Switch
            value={reminders}
            onValueChange={setReminders}
            accessibilityLabel={t('settings.reminders')}
            trackColor={{ false: water.mist, true: water.water }}
          />
        </View>

        <View style={[styles.row, { backgroundColor: water.surfaceDeep }]}>
          <ThemedText type="smallBold" style={{ color: water.ink }}>
            {t('settings.animations')}
          </ThemedText>
          <Switch
            value={animations}
            onValueChange={setAnimations}
            accessibilityLabel={t('settings.animations')}
            trackColor={{ false: water.mist, true: water.water }}
          />
        </View>

        {todayPreview && todayPreview.kind !== 'hidden' ? (
          <View style={[styles.todaySection, { backgroundColor: water.surfaceDeep }]}>
            <ThemedText type="smallBold" style={{ color: water.ink }}>
              {t('settings.todaySectionTitle')}
            </ThemedText>
            <ThemedText type="small" style={{ color: water.mist }}>
              {formatTodayRemainingPreviewBody(todayPreview, t)}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.legalSection}>
          <ExternalLink href={PRIVACY_POLICY_URL}>
            <ThemedText type="linkPrimary" style={{ color: water.water }}>
              {t('settings.privacyPolicy')}
            </ThemedText>
          </ExternalLink>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: water.surface }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <ScreenBackButton />
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={avoidingBehavior}
          enabled={Platform.OS !== 'web'}
          keyboardVerticalOffset={0}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.formContent}
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}>
            {formScrollInner}
          </ScrollView>
          {footer}
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
  safeArea: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
  },
  header: {
    paddingHorizontal: Spacing.two,
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
    paddingTop: Spacing.two,
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
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    borderRadius: Spacing.three,
  },
  todaySection: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  legalSection: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  saveBtn: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    overflow: 'visible',
  },
  saveBtnLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});

