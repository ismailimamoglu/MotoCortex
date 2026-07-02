import { NativeModules, Platform } from 'react-native';

const { IOSBackgroundTaskManager } = NativeModules || {};

export async function beginBackgroundTask(): Promise<number> {
  if (Platform.OS === 'ios' && IOSBackgroundTaskManager) {
    try {
      return await IOSBackgroundTaskManager.beginBackgroundTask();
    } catch (e) {
      console.warn('[BackgroundTask] Failed to begin background task:', e);
    }
  }
  return -1;
}

export async function endBackgroundTask(): Promise<boolean> {
  if (Platform.OS === 'ios' && IOSBackgroundTaskManager) {
    try {
      return await IOSBackgroundTaskManager.endBackgroundTask();
    } catch (e) {
      console.warn('[BackgroundTask] Failed to end background task:', e);
    }
  }
  return false;
}
