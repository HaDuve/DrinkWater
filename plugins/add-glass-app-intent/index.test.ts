import withAddGlassAppIntent from './app.plugin';

describe('withAddGlassAppIntent', () => {
  it('registers an ios xcodeproj mod', () => {
    const config = withAddGlassAppIntent({
      name: 'DrinkWater',
      slug: 'DrinkWater',
    });

    expect(config.mods?.ios?.xcodeproj).toEqual(expect.any(Function));
  });
});
