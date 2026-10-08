import { resetAddGlassDeepLinkSubscriptionForTests, subscribeAddGlassDeepLink } from './subscribe-add-glass-deep-link';

beforeEach(() => {
  resetAddGlassDeepLinkSubscriptionForTests();
});

describe('subscribeAddGlassDeepLink', () => {
  it('logs one Glass from the initial URL and skips the duplicate url event', async () => {
    const logGlassAndSyncReminders = jest.fn().mockResolvedValue(undefined);
    const onGlassLogged = jest.fn();
    let urlListener: ((event: { url: string }) => void) | null = null;

    const unsubscribe = subscribeAddGlassDeepLink({
      getInitialURL: async () => 'drinkwater://add-glass',
      addEventListener: (_type, listener) => {
        urlListener = listener;
        return { remove: jest.fn() };
      },
      logGlassAndSyncReminders,
      onGlassLogged,
    });

    await flushMicrotasks();
    urlListener?.({ url: 'drinkwater://add-glass' });
    await flushMicrotasks();

    expect(logGlassAndSyncReminders).toHaveBeenCalledTimes(1);
    expect(onGlassLogged).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not re-log the initial URL when the subscription remounts', async () => {
    const logGlassAndSyncReminders = jest.fn().mockResolvedValue(undefined);
    const getInitialURL = jest.fn(async () => 'drinkwater://add-glass');
    const remove = jest.fn();

    const first = subscribeAddGlassDeepLink({
      getInitialURL,
      addEventListener: () => ({ remove }),
      logGlassAndSyncReminders,
    });
    await flushMicrotasks();
    first();

    const second = subscribeAddGlassDeepLink({
      getInitialURL,
      addEventListener: () => ({ remove }),
      logGlassAndSyncReminders,
    });
    await flushMicrotasks();
    second();

    expect(getInitialURL).toHaveBeenCalledTimes(1);
    expect(logGlassAndSyncReminders).toHaveBeenCalledTimes(1);
  });

  it('logs again on a warm url event after cold-start dedupe', async () => {
    const logGlassAndSyncReminders = jest.fn().mockResolvedValue(undefined);
    let urlListener: ((event: { url: string }) => void) | null = null;

    subscribeAddGlassDeepLink({
      getInitialURL: async () => 'drinkwater://add-glass',
      addEventListener: (_type, listener) => {
        urlListener = listener;
        return { remove: jest.fn() };
      },
      logGlassAndSyncReminders,
    });

    await flushMicrotasks();
    urlListener?.({ url: 'drinkwater://add-glass' });
    await flushMicrotasks();
    urlListener?.({ url: 'drinkwater://add-glass' });
    await flushMicrotasks();

    expect(logGlassAndSyncReminders).toHaveBeenCalledTimes(2);
  });
});

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
