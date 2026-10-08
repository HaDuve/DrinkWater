import { redirectAddGlassSystemPath, urlRequestsAddGlass } from './add-glass-deep-link';

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
