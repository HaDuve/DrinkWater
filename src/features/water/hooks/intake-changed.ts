import { DeviceEventEmitter } from 'react-native';

const INTAKE_CHANGED_EVENT = 'drinkwater-intake-changed';

let pendingIntakeChange = false;

/** Test-only: clears sticky pending state between cases. */
export function resetIntakeChangedForTests(): void {
  pendingIntakeChange = false;
}

/** Broadcast after a Glass log that happened outside the Home screen UI. */
export function emitIntakeChanged(): void {
  pendingIntakeChange = true;
  DeviceEventEmitter.emit(INTAKE_CHANGED_EVENT);
}

export function subscribeIntakeChanged(listener: () => void): () => void {
  const subscription = DeviceEventEmitter.addListener(INTAKE_CHANGED_EVENT, () => {
    pendingIntakeChange = false;
    listener();
  });

  if (pendingIntakeChange) {
    pendingIntakeChange = false;
    listener();
  }

  return () => subscription.remove();
}
