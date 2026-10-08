/** True when the URL is the Siri / deep-link entry that should log one Glass. */
export function urlRequestsAddGlass(url: string | null): boolean {
  if (!url) return false;
  const withoutQuery = url.split('?')[0]?.split('#')[0] ?? '';
  const normalized = withoutQuery.replace(/\/+$/, '');
  if (normalized === 'add-glass' || normalized.endsWith('/add-glass')) return true;
  return /(?:\/\/)add-glass$/.test(normalized);
}

/** Expo Router `+native-intent` rewrite so add-glass opens on Home. */
export function redirectAddGlassSystemPath(path: string): string {
  return urlRequestsAddGlass(path) ? '/' : path;
}

type LogGlass = () => Promise<void>;

/**
 * Dedupes cold-start `getInitialURL` + `url` event for the same link,
 * while still logging again on a later warm open of the same URL.
 */
export function createAddGlassDeepLinkProcessor(logGlass: LogGlass) {
  let initialUrl: string | null | undefined;
  let loggedInitial = false;
  let initialLoggedViaGetInitialURL = false;
  let skippedEventDuplicate = false;

  return {
    async onInitialUrl(url: string | null) {
      initialUrl = url;
      if (!urlRequestsAddGlass(url)) return;
      if (loggedInitial) return;
      loggedInitial = true;
      initialLoggedViaGetInitialURL = true;
      await logGlass();
    },
    async onEventUrl(url: string) {
      if (!urlRequestsAddGlass(url)) return;
      if (initialUrl === undefined) {
        loggedInitial = true;
        initialUrl = url;
        await logGlass();
        return;
      }
      if (initialLoggedViaGetInitialURL && url === initialUrl && !skippedEventDuplicate) {
        skippedEventDuplicate = true;
        return;
      }
      await logGlass();
    },
  };
}
