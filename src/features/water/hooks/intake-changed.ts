import { DeviceEventEmitter } from 'react-native';

const INTAKE_CHANGED_EVENT = 'drinkwater-intake-changed';

/** Broadcast after a Glass log that happened outside the Home screen UI. */
export function emitIntakeChanged(): void {
  DeviceEventEmitter.emit(INTAKE_CHANGED_EVENT);
}

export function subscribeIntakeChanged(listener: () => void): () => void {
  const subscription = DeviceEventEmitter.addListener(INTAKE_CHANGED_EVENT, listener);
  return () => subscription.remove();
}
