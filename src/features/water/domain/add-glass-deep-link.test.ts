import {
  createAddGlassDeepLinkProcessor,
  redirectAddGlassSystemPath,
  urlRequestsAddGlass,
} from './add-glass-deep-link';

describe('urlRequestsAddGlass', () => {
  it('recognizes drinkwater://add-glass', () => {
    expect(urlRequestsAddGlass('drinkwater://add-glass')).toBe(true);
  });

  it('recognizes /add-glass path forms', () => {
    expect(urlRequestsAddGlass('/add-glass')).toBe(true);
    expect(urlRequestsAddGlass('add-glass')).toBe(true);
  });
});

describe('redirectAddGlassSystemPath', () => {
  it('rewrites add-glass deep links to the home route', () => {
    expect(redirectAddGlassSystemPath('drinkwater://add-glass')).toBe('/');
    expect(redirectAddGlassSystemPath('/add-glass')).toBe('/');
  });

  it('leaves unrelated paths unchanged', () => {
    expect(redirectAddGlassSystemPath('/?screenshot=1')).toBe('/?screenshot=1');
    expect(redirectAddGlassSystemPath('/settings')).toBe('/settings');
  });
});

describe('createAddGlassDeepLinkProcessor', () => {
  it('logs exactly one Glass when cold start delivers the same URL via initial and event', async () => {
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const processor = createAddGlassDeepLinkProcessor(logGlass);
    const url = 'drinkwater://add-glass';

    await processor.onInitialUrl(url);
    await processor.onEventUrl(url);

    expect(logGlass).toHaveBeenCalledTimes(1);
  });

  it('logs again when the same link opens while the app is already running', async () => {
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const processor = createAddGlassDeepLinkProcessor(logGlass);
    const url = 'drinkwater://add-glass';

    await processor.onInitialUrl(url);
    await processor.onEventUrl(url);
    await processor.onEventUrl(url);

    expect(logGlass).toHaveBeenCalledTimes(2);
  });

  it('logs exactly one Glass when the url event arrives before getInitialURL resolves', async () => {
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const processor = createAddGlassDeepLinkProcessor(logGlass);
    const url = 'drinkwater://add-glass';

    await processor.onEventUrl(url);
    await processor.onInitialUrl(url);

    expect(logGlass).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated deep links', async () => {
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const processor = createAddGlassDeepLinkProcessor(logGlass);

    await processor.onInitialUrl('drinkwater://?screenshot=1');
    await processor.onEventUrl('drinkwater://settings');

    expect(logGlass).not.toHaveBeenCalled();
  });
});
