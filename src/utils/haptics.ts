import * as Haptics from 'expo-haptics';

export async function triggerHaptic(style = Haptics.ImpactFeedbackStyle.Light) {
  try {
    if (Haptics && typeof Haptics.impactAsync === 'function') {
      await Haptics.impactAsync(style);
    }
  } catch (error) {
    console.log('Haptics not supported or native module not rebuilt:', error);
  }
}
