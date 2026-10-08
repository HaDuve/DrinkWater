import { createAddGlassDeepLinkProcessor } from './add-glass-deep-link-processor';

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

  it('serializes overlapping log calls so the second waits for the first', async () => {
    let resolveFirst!: () => void;
    const firstLog = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const callOrder: string[] = [];
    const logGlass = jest.fn().mockImplementation(async () => {
      const n = logGlass.mock.calls.length;
      callOrder.push(`start-${n}`);
      if (n === 1) await firstLog;
      callOrder.push(`end-${n}`);
    });
    const processor = createAddGlassDeepLinkProcessor(logGlass);
    const url = 'drinkwater://add-glass';

    await processor.onInitialUrl(null);
    const first = processor.onEventUrl(url);
    const second = processor.onEventUrl(url);

    await Promise.resolve();
    expect(callOrder).toEqual(['start-1']);
    resolveFirst();
    await Promise.all([first, second]);

    expect(callOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
    expect(logGlass).toHaveBeenCalledTimes(2);
  });
});
