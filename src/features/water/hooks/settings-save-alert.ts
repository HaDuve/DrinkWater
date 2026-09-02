import type { SaveWaterSettingsError } from './save-water-settings';

export type SettingsSaveError = SaveWaterSettingsError | 'settings_not_ready';

export type SettingsSaveAlertKeys = {
  titleKey:
    | 'settings.alertInvalidGoalTitle'
    | 'settings.alertInvalidGlassTitle'
    | 'settings.alertInvalidWindowTitle'
    | 'settings.alertSettingsNotReadyTitle';
  messageKey:
    | 'settings.alertInvalidGoalMessage'
    | 'settings.alertInvalidGlassMessage'
    | 'settings.alertInvalidWindowEndBeforeStart'
    | 'settings.alertInvalidWindowOvernight'
    | 'settings.alertInvalidWindowSlotsTooClose'
    | 'settings.alertInvalidWindowGeneric'
    | 'settings.alertSettingsNotReadyMessage';
};

export function resolveSettingsSaveAlert(error: SettingsSaveError): SettingsSaveAlertKeys {
  switch (error) {
    case 'goal':
      return {
        titleKey: 'settings.alertInvalidGoalTitle',
        messageKey: 'settings.alertInvalidGoalMessage',
      };
    case 'glass':
      return {
        titleKey: 'settings.alertInvalidGlassTitle',
        messageKey: 'settings.alertInvalidGlassMessage',
      };
    case 'end_before_or_equal_start':
      return {
        titleKey: 'settings.alertInvalidWindowTitle',
        messageKey: 'settings.alertInvalidWindowEndBeforeStart',
      };
    case 'overnight_window':
      return {
        titleKey: 'settings.alertInvalidWindowTitle',
        messageKey: 'settings.alertInvalidWindowOvernight',
      };
    case 'slots_too_close':
      return {
        titleKey: 'settings.alertInvalidWindowTitle',
        messageKey: 'settings.alertInvalidWindowSlotsTooClose',
      };
    case 'settings_not_ready':
      return {
        titleKey: 'settings.alertSettingsNotReadyTitle',
        messageKey: 'settings.alertSettingsNotReadyMessage',
      };
    case 'invalid_glass_size':
    default:
      return {
        titleKey: 'settings.alertInvalidWindowTitle',
        messageKey: 'settings.alertInvalidWindowGeneric',
      };
  }
}
