import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ScreenLoadingState } from "@/components/screen-loading-state";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { ExternalLink } from "@/components/external-link";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PRIVACY_POLICY_URL } from "@/constants/urls";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { ReminderWindowTimeInput } from "@/features/water/components/reminder-window-time-input";
import {
  PrototypeStatePanel,
  TIME_PICKER_PROTOTYPE_VARIANTS,
  VariantA,
  VariantB,
  VariantC,
  type TimePickerPrototypeVariant,
} from "@/features/water/components/prototype/time-picker-variants";
import { resolveSettingsSaveAlert } from "@/features/water/hooks/settings-save-alert";
import { useSettingsModel } from "@/features/water/hooks/use-settings-model";
import { useTabBarBottomInset } from "@/hooks/use-tab-bar-bottom-inset";
import { useTheme } from "@/hooks/use-theme";

/** Fraction of tab-bar core (inset minus home indicator) used as KAV offset; lower = narrower gap above keyboard. */
const IOS_KAV_OFFSET_RATIO = 0.5;
/** Extra nudge after ratio; ±2–4pt on device if needed. */
const IOS_KAV_FINE_TUNE = 0;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [timePickerPrototypeActive, setTimePickerPrototypeActive] = useState(false);
  const [timePickerVariant, setTimePickerVariant] =
    useState<TimePickerPrototypeVariant>("A");
  const isTimePickerPrototype = __DEV__ && timePickerPrototypeActive;
  const tabBarBottomInset = useTabBarBottomInset();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {
    loaded,
    reminderWindow,
    setWindowStart,
    setWindowEnd,
    preview,
    goalInput,
    setGoalInput,
    glassInput,
    setGlassInput,
    reminders,
    setReminders,
    refresh,
    save,
  } = useSettingsModel();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardOpen(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardOpen(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        ? t("settings.alertSavedNotificationsHint")
        : t("settings.alertSavedGeneric");
      Alert.alert(t("settings.alertSavedTitle"), hint);
    });
  }, [save, t]);

  if (!loaded) {
    return <ScreenLoadingState />;
  }

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.backgroundElement,
      backgroundColor: theme.backgroundElement,
    },
  ];

  const footerBottomPad = keyboardOpen
    ? Spacing.three
    : tabBarBottomInset + Spacing.three;

  const avoidingBehavior = Platform.select<"padding" | "height" | undefined>({
    ios: "padding",
    android: "height",
    default: undefined,
  });

  const iosTabBarCore = Math.max(0, tabBarBottomInset - insets.bottom);
  const keyboardVerticalOffset =
    Platform.OS === "ios"
      ? keyboardOpen
        ? 0
        : Math.round(iosTabBarCore * IOS_KAV_OFFSET_RATIO) + IOS_KAV_FINE_TUNE
      : 0;

  const footer = (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: footerBottomPad,
          borderTopColor: theme.backgroundElement,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        onPress={dismissAndSave}
      >
        <ThemedText type="smallBold" style={styles.saveBtnText}>
          {t("settings.save")}
        </ThemedText>
      </Pressable>
    </View>
  );

  const formScrollInner = (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.formInner}>
        <ThemedText type="title" style={styles.screenTitle}>
          {t("settings.title")}
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="smallBold">{t("settings.dailyGoalMl")}</ThemedText>
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
          <ThemedText type="smallBold">{t("settings.glassSizeMl")}</ThemedText>
          <TextInput
            keyboardType="number-pad"
            value={glassInput}
            onChangeText={setGlassInput}
            style={inputStyle}
            placeholder="250"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {reminderWindow ? (
          <>
            {isTimePickerPrototype ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  PROTOTYPE — native time picker variants on Settings
                </ThemedText>
                {timePickerVariant === "A" ? (
                  <VariantA
                    label={t("settings.notifyTime")}
                    start={reminderWindow.start}
                    end={reminderWindow.end}
                    onStartChange={setWindowStart}
                    onEndChange={setWindowEnd}
                  />
                ) : null}
                {timePickerVariant === "B" ? (
                  <VariantB
                    label={t("settings.notifyTime")}
                    start={reminderWindow.start}
                    end={reminderWindow.end}
                    onStartChange={setWindowStart}
                    onEndChange={setWindowEnd}
                  />
                ) : null}
                {timePickerVariant === "C" ? (
                  <VariantC
                    label={t("settings.notifyTime")}
                    start={reminderWindow.start}
                    end={reminderWindow.end}
                    onStartChange={setWindowStart}
                    onEndChange={setWindowEnd}
                  />
                ) : null}
                <PrototypeStatePanel
                  variant={timePickerVariant}
                  start={reminderWindow.start}
                  end={reminderWindow.end}
                />
              </>
            ) : (
              <ReminderWindowTimeInput
                label={t("settings.notifyTime")}
                start={reminderWindow.start}
                end={reminderWindow.end}
                onStartChange={setWindowStart}
                onEndChange={setWindowEnd}
                startAccessibilityLabel={t("settings.reminderWindowStart")}
                endAccessibilityLabel={t("settings.reminderWindowEnd")}
              />
            )}

            {preview ? (
              <ThemedText type="small" themeColor="textSecondary">
                {preview.ok
                  ? t("settings.reminderPlanPreview", {
                      count: preview.glassCount,
                      start: preview.windowStart,
                      end: preview.windowEnd,
                    })
                  : t("settings.reminderPlanInvalid")}
              </ThemedText>
            ) : null}
          </>
        ) : null}

        <View style={styles.row}>
          <ThemedText type="smallBold">{t("settings.reminders")}</ThemedText>
          <Switch
            value={reminders}
            onValueChange={setReminders}
            trackColor={{ false: theme.backgroundElement, true: "#208AEF" }}
          />
        </View>

        <View style={styles.legalSection}>
          <ExternalLink href={PRIVACY_POLICY_URL}>
            <ThemedText type="linkPrimary">{t("settings.privacyPolicy")}</ThemedText>
          </ExternalLink>
        </View>

        {__DEV__ ? (
          <View style={styles.prototypeDevSection}>
            {isTimePickerPrototype ? (
              <Pressable
                onPress={() => setTimePickerPrototypeActive(false)}
                style={({ pressed }) => [
                  styles.prototypeDevButton,
                  styles.prototypeDevButtonExit,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.prototypeDevButtonText}>
                  Exit time picker prototype
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setTimePickerPrototypeActive(true)}
                style={({ pressed }) => [
                  styles.prototypeDevButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.prototypeDevButtonText}>
                  PROTOTYPE: Compare native time pickers
                </ThemedText>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={avoidingBehavior}
          enabled={Platform.OS !== "web"}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
          >
            {formScrollInner}
          </ScrollView>
          {footer}
        </KeyboardAvoidingView>
      </SafeAreaView>
      {isTimePickerPrototype ? (
        <PrototypeSwitcher
          variants={[...TIME_PICKER_PROTOTYPE_VARIANTS]}
          currentKey={timePickerVariant}
          onVariantChange={(key) =>
            setTimePickerVariant(key as TimePickerPrototypeVariant)
          }
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    alignSelf: "stretch",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.two,
  },
  legalSection: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  prototypeDevSection: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  prototypeDevButton: {
    backgroundColor: "#92400E",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  prototypeDevButtonExit: {
    backgroundColor: "#374151",
  },
  prototypeDevButtonText: {
    color: "#FDE68A",
  },
  saveBtn: {
    backgroundColor: "#208AEF",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.85,
  },
});
