import { createAddGlassDeepLinkProcessor } from '@/features/water/hooks/add-glass-deep-link-processor';

type UrlSubscription = { remove: () => void };

export type AddGlassDeepLinkDeps = {
  getInitialURL: () => Promise<string | null>;
  addEventListener: (type: 'url', listener: (event: { url: string }) => void) => UrlSubscription;
  logGlassAndSyncReminders: () => Promise<void>;
  onGlassLogged?: () => void;
};

type Processor = ReturnType<typeof createAddGlassDeepLinkProcessor>;

let sharedProcessor: Processor | null = null;
let initialFetchStarted = false;
let linkingSubscription: UrlSubscription | null = null;
let linkingSubscriberCount = 0;
let activeDeps: AddGlassDeepLinkDeps | null = null;

/** Test-only: clears module singleton state between cases. */
export function resetAddGlassDeepLinkSubscriptionForTests(): void {
  sharedProcessor = null;
  initialFetchStarted = false;
  linkingSubscription = null;
  linkingSubscriberCount = 0;
  activeDeps = null;
}

function ensureProcessor(deps: AddGlassDeepLinkDeps): Processor {
  activeDeps = deps;
  if (!sharedProcessor) {
    sharedProcessor = createAddGlassDeepLinkProcessor(async () => {
      await activeDeps!.logGlassAndSyncReminders();
      activeDeps!.onGlassLogged?.();
    });
  }
  return sharedProcessor;
}

/** Subscribes to Linking and logs one Glass per add-glass open (Pacing Event). */
export function subscribeAddGlassDeepLink(deps: AddGlassDeepLinkDeps): () => void {
  const processor = ensureProcessor(deps);

  if (!initialFetchStarted) {
    initialFetchStarted = true;
    void deps.getInitialURL().then((url) => {
      void processor.onInitialUrl(url);
    });
  }

  linkingSubscriberCount += 1;
  if (!linkingSubscription) {
    linkingSubscription = deps.addEventListener('url', ({ url }) => {
      void processor.onEventUrl(url);
    });
  }

  return () => {
    linkingSubscriberCount -= 1;
    if (linkingSubscriberCount > 0) return;
    linkingSubscription?.remove();
    linkingSubscription = null;
    linkingSubscriberCount = 0;
  };
}
