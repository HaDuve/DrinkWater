import { useLocales } from 'expo-localization';
import React, { useEffect } from 'react';

import i18next, { resolveLng } from './i18n';

type Props = {
  children: React.ReactNode;
};

export function LocaleSync({ children }: Props) {
  const [locale] = useLocales();

  useEffect(() => {
    void i18next.changeLanguage(resolveLng([locale]));
  }, [locale]);

  return <>{children}</>;
}
