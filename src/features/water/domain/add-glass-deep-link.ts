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
