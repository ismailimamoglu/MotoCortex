import React from 'react';
import { Animated } from 'react-native';

export interface ShimmerSensorCardProps {
  width: string | number;
  height: number;
  tc: any;
  scaleMod: (n: number) => number;
}

export const ShimmerSensorCard = React.memo(({ width, height, tc, scaleMod }: ShimmerSensorCardProps) => {
  const shimmerOpacity = React.useRef(new Animated.Value(0.25)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, { toValue: 0.6, duration: 850, useNativeDriver: true }),
        Animated.timing(shimmerOpacity, { toValue: 0.25, duration: 850, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmerOpacity]);

  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        backgroundColor: tc.card,
        borderWidth: 1.2,
        borderColor: tc.border,
        borderLeftWidth: 4,
        borderLeftColor: tc.border,
        borderRadius: scaleMod(8),
        opacity: shimmerOpacity,
      }}
    />
  );
});

export default ShimmerSensorCard;
