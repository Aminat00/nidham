/**
 * Calm entrance animation — a gentle fade + short upward slide. Used as items
 * "land" in the Just-captured feed. Nothing bouncy; the motion stays quiet.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
