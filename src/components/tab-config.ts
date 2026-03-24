export type AppTabId = 'home' | 'history' | 'settings';

export const APP_TABS: {
  id: AppTabId;
  nativeName: 'index' | 'history' | 'settings';
  href: '/' | '/history' | '/settings';
  i18nKey: 'tabs.home' | 'tabs.history' | 'tabs.settings';
}[] = [
  { id: 'home', nativeName: 'index', href: '/', i18nKey: 'tabs.home' },
  { id: 'history', nativeName: 'history', href: '/history', i18nKey: 'tabs.history' },
  { id: 'settings', nativeName: 'settings', href: '/settings', i18nKey: 'tabs.settings' },
];
