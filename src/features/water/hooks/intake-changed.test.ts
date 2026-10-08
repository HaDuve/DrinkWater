import { emitIntakeChanged, resetIntakeChangedForTests, subscribeIntakeChanged } from './intake-changed';

beforeEach(() => {
  resetIntakeChangedForTests();
});

describe('intake-changed', () => {
  it('delivers a pending change to a subscriber that mounts after emit', () => {
    const listener = jest.fn();

    emitIntakeChanged();
    const unsubscribe = subscribeIntakeChanged(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not re-deliver the same pending change to a later subscriber', () => {
    emitIntakeChanged();
    const first = jest.fn();
    const second = jest.fn();

    const unsubFirst = subscribeIntakeChanged(first);
    unsubFirst();
    const unsubSecond = subscribeIntakeChanged(second);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    unsubSecond();
  });
});
