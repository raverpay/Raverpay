// src/components/ui/Skeleton.tsx
import React, { useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
  ...props
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(opacity.value, [0.3, 1], [0.3, 0.7]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#D1D5DB",
        },
        animatedStyle,
        style,
      ]}
      {...props}
    />
  );
};

// Circle Skeleton for avatars/icons
interface SkeletonCircleProps {
  size?: number;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
}) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
};

// Skeleton Text - multiple lines
interface SkeletonTextProps {
  lines?: number;
  gap?: number;
  lastLineWidth?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  gap = 8,
  lastLineWidth = "70%",
}) => {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={14}
        />
      ))}
    </View>
  );
};
