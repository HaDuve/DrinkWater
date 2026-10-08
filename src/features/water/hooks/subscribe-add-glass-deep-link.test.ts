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

    await Promise.resolve();
    await Promise.resolve();
    urlListener?.({ url: 'drinkwater://add-glass' });
    await Promise.resolve();
    await Promise.resolve();

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
    await Promise.resolve();
    await Promise.resolve();
    first();

    const second = subscribeAddGlassDeepLink({
      getInitialURL,
      addEventListener: () => ({ remove }),
      logGlassAndSyncReminders,
    });
    await Promise.resolve();
    await Promise.resolve();
    second();

    expect(getInitialURL).toHaveBeenCalledTimes(1);
    expect(logGlassAndSyncReminders).toHaveBeenCalledTimes(1);
  });
});
