import { urlRequestsAddGlass } from '@/features/water/domain/add-glass-deep-link';

type LogGlass = () => Promise<void>;

/**
 * Dedupes cold-start `getInitialURL` + `url` event for the same link,
 * while still logging again on a later warm open of the same URL.
 * Overlapping logs are serialized so Intake cannot be clobbered.
 */
export function createAddGlassDeepLinkProcessor(logGlass: LogGlass) {
  let initialUrl: string | null | undefined;
  let loggedInitial = false;
  let initialLoggedViaGetInitialURL = false;
  let skippedEventDuplicate = false;
  let logChain: Promise<void> = Promise.resolve();

  const enqueueLog = () => {
    logChain = logChain.then(async () => {
      try {
        await logGlass();
      } catch {
        // Deep-link path has no UI busy/error surface; keep the chain alive.
      }
    });
    return logChain;
  };

  return {
    async onInitialUrl(url: string | null) {
      initialUrl = url;
      if (!urlRequestsAddGlass(url)) return;
      if (loggedInitial) return;
      loggedInitial = true;
      initialLoggedViaGetInitialURL = true;
      await enqueueLog();
    },
    async onEventUrl(url: string) {
      if (!urlRequestsAddGlass(url)) return;
      if (initialUrl === undefined) {
        loggedInitial = true;
        initialUrl = url;
        await enqueueLog();
        return;
      }
      if (initialLoggedViaGetInitialURL && url === initialUrl && !skippedEventDuplicate) {
        skippedEventDuplicate = true;
        return;
      }
      await enqueueLog();
    },
  };
}
