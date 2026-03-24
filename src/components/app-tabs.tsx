import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { APP_TABS, type AppTabId } from './tab-config';

function tabIcon(tabId: AppTabId) {
  if (tabId === 'home') return require('@/assets/images/tabIcons/home.png');
  return require('@/assets/images/tabIcons/explore.png');
}

export default function AppTabs() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {APP_TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.id} name={tab.nativeName}>
          <Label>{t(tab.i18nKey)}</Label>
          <Icon src={tabIcon(tab.id)} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
