import { resolveSettingsSaveAlert } from './settings-save-alert';

describe('resolveSettingsSaveAlert', () => {
  it('maps goal validation to goal alert copy', () => {
    expect(resolveSettingsSaveAlert('goal')).toEqual({
      titleKey: 'settings.alertInvalidGoalTitle',
      messageKey: 'settings.alertInvalidGoalMessage',
    });
  });

  it('maps invalid_glass_size to generic window alert copy', () => {
    expect(resolveSettingsSaveAlert('invalid_glass_size')).toEqual({
      titleKey: 'settings.alertInvalidWindowTitle',
      messageKey: 'settings.alertInvalidWindowGeneric',
    });
  });

  it('falls back to generic window alert copy for unknown schedule errors', () => {
    expect(resolveSettingsSaveAlert('unknown_error' as 'goal')).toEqual({
      titleKey: 'settings.alertInvalidWindowTitle',
      messageKey: 'settings.alertInvalidWindowGeneric',
    });
  });

  it('maps settings_not_ready to not-ready alert copy', () => {
    expect(resolveSettingsSaveAlert('settings_not_ready')).toEqual({
      titleKey: 'settings.alertSettingsNotReadyTitle',
      messageKey: 'settings.alertSettingsNotReadyMessage',
    });
  });
});
