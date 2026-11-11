import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useTheme } from '@/lib/theme';
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet } from 'react-native';

type ScrollHandler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
type Ctx = { translateY: Animated.Value; onScroll: ScrollHandler };

const HIDDEN_OFFSET = 160; // enough to move the floating bar (height + margin + safe area) off screen
const TOP_ZONE = 10; // always visible near the top
const STEP = 4; // ignore tiny movements

const TabBarContext = createContext<Ctx | null>(null);

// Shares one animated offset between the tab bar and every screen's ScrollView.
export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const hidden = useRef(false);
  const lastY = useRef(0);

  const setHidden = useCallback(
    (next: boolean) => {
      if (hidden.current === next) return;
      hidden.current = next;
      Animated.timing(translateY, {
        toValue: next ? HIDDEN_OFFSET : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [translateY],
  );

  const onScroll = useCallback<ScrollHandler>(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const maxY = contentSize.height - layoutMeasurement.height;
      const dy = y - lastY.current;
      lastY.current = y;

      if (y <= TOP_ZONE) setHidden(false);
      else if (y > maxY) return; // iOS bounce at the bottom
      else if (dy > STEP) setHidden(true);
      else if (dy < -STEP) setHidden(false);
    },
    [setHidden],
  );

  const value = useMemo(() => ({ translateY, onScroll }), [translateY, onScroll]);
  return <TabBarContext.Provider value={value}>{children}</TabBarContext.Provider>;
}

// Props to spread on a ScrollView so scrolling down hides the tab bar and scrolling up shows it.
export function useHideTabBarOnScroll() {
  const ctx = useContext(TabBarContext);
  return { onScroll: ctx?.onScroll, scrollEventThrottle: 16 };
}

// The regular bottom tab bar, anchored at the bottom and slid off screen by the shared offset.
export function HidingTabBar(props: BottomTabBarProps) {
  const ctx = useContext(TabBarContext);
  const { palette } = useTheme();
  return (
    <Animated.View style={[styles.wrap, { backgroundColor: palette.surface }, ctx && { transform: [{ translateY: ctx.translateY }] }]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Opaque so nothing behind the bar shows through, including the safe-area strip under it.
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, },
});
