// ui.js — Haven primitive components (iOS 26 design language)

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, Platform, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { withSpring, useSharedValue, useAnimatedStyle, useAnimatedReaction } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme, useAccent } from './theme';

// ============================================
// PressableScale — 0.97 press with haptic
// ============================================
export const PressableScale = forwardRef(({ children, onPress, haptic = 'light', style, ...props }, ref) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, theme.springs.snappy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle[haptic.charAt(0).toUpperCase() + haptic.slice(1)] || Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.springs.gentle);
  };

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handlePressOut}
      style={({ pressed }) => [styles.pressableBase, animatedStyle, pressed && styles.pressed, style]}
      {...props}
    >
      {children}
    </Pressable>
  );
});

PressableScale.displayName = 'PressableScale';

// ============================================
// Screen — Safe area + bg + margin + scroll edge fade
// ============================================
export const Screen = ({ children, style, ...props }) => {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? theme.colors.dark.bg : theme.colors.light.bg;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }, style]} {...props}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

function useColorScheme() {
  // Use React Native's built-in
  const { useColorScheme } = require('react-native');
  return useColorScheme() || 'light';
}

// ============================================
// Section — Whitespace grouping (no boxes)
// ============================================
export const Section = ({ children, header, headerStyle, style, gap = 'xl' }) => {
  const colorScheme = useColorScheme();
  const labelColor = colorScheme === 'dark' ? theme.colors.dark.label.tertiary : theme.colors.light.label.tertiary;
  const gapValue = theme.space[gap] || theme.space.xl;

  return (
    <View style={[styles.section, { marginTop: gapValue }, style]}>
      {header && (
        <Text style={[styles.sectionHeader, { color: labelColor }, headerStyle]}>{header}</Text>
      )}
      {children}
    </View>
  );
};

// ============================================
// Card — Opaque elevated surface (no glass)
// ============================================
export const Card = ({ children, style, ...props }) => {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? theme.colors.dark.elevated : theme.colors.light.elevated;
  const separator = colorScheme === 'dark' ? theme.colors.dark.separator : theme.colors.light.separator;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: separator },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

// ============================================
// Row — 44pt min, hairline separator, press scale
// ============================================
export const Row = ({ children, onPress, separator = true, style, ...props }) => {
  const colorScheme = useColorScheme();
  const separatorColor = colorScheme === 'dark' ? theme.colors.dark.separator : theme.colors.light.separator;

  const content = (
    <View style={[styles.row, style]}>
      {children}
      {separator && <View style={[styles.separator, { backgroundColor: separatorColor, marginLeft: theme.space.lg }]} />}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} haptic="light" style={props.style}>
        {content}
      </PressableScale>
    );
  }

  return <View {...props} style={style}>{content}</View>;
};

// ============================================
// Button — filled (primary) | tinted | plain
// ============================================
export const Button = ({ children, variant = 'filled', onPress, style, disabled, ...props }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? theme.colors.dark : theme.colors.light;
  const accent = colors.accent;
  const fillQuaternary = colors.fill.quaternary;

  let baseStyle = styles.buttonBase;
  let textStyle = styles.buttonText;

  if (variant === 'filled') {
    baseStyle = [baseStyle, styles.buttonFilled, { backgroundColor: accent }];
    textStyle = [textStyle, styles.buttonTextFilled];
  } else if (variant === 'tinted') {
    baseStyle = [baseStyle, styles.buttonFilled, { backgroundColor: fillQuaternary }];
    textStyle = [textStyle, styles.buttonTextTinted, { color: accent }];
  } else {
    baseStyle = [baseStyle, styles.buttonPlain];
    textStyle = [textStyle, styles.buttonTextPlain, { color: accent }];
  }

  if (disabled) {
    baseStyle = [baseStyle, styles.buttonDisabled];
    textStyle = [textStyle, styles.buttonTextDisabled];
  }

  return (
    <PressableScale onPress={onPress} disabled={disabled} haptic="light" style={[baseStyle, style]}>
      <Text style={textStyle}>{children}</Text>
    </PressableScale>
  );
};

// ============================================
// Separator — Hairline divider
// ============================================
export const Separator = ({ style, inset = 'lg', vertical }) => {
  const colorScheme = useColorScheme();
  const color = colorScheme === 'dark' ? theme.colors.dark.separator : theme.colors.light.separator;
  const insetValue = theme.space[inset] || theme.space.lg;

  if (vertical) {
    return <View style={[styles.separatorVertical, { backgroundColor: color, marginHorizontal: insetValue }, style]} />;
  }
  return <View style={[styles.separator, { backgroundColor: color, marginLeft: insetValue }, style]} />;
};

// ============================================
// Badge — Tinted background, caption text, pill radius
// ============================================
export const Badge = ({ children, style, variant = 'default', ...props }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? theme.colors.dark : theme.colors.light;
  const accent = colors.accent;
  const fillQuaternary = colors.fill.quaternary;

  let bgStyle = styles.badgeBase;
  let textStyle = styles.badgeText;

  if (variant === 'default') {
    bgStyle = [bgStyle, { backgroundColor: fillQuaternary }];
    textStyle = [textStyle, { color: accent }];
  } else if (variant === 'accent') {
    bgStyle = [bgStyle, { backgroundColor: accent }];
    textStyle = [textStyle, { color: '#FFFFFF' }];
  }

  return (
    <View style={[bgStyle, style]} {...props}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
};

// ============================================
// GlassTabBar — Floating capsule, BlurView, shrink on scroll
// (Implemented in Task 5 - placeholder here)
// ============================================
export const GlassTabBar = ({ tabs, active, onPress }) => {
  return (
    <View style={styles.glassTabBarPlaceholder}>
      <Text>GlassTabBar: {active}</Text>
    </View>
  );
};

// ============================================
// Sheet — Spring-in modal, dimming layer
// (Placeholder - full implementation in App.js with Reanimated)
// ============================================
export const Sheet = ({ visible, children, onClose }) => {
  if (!visible) return null;
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? theme.colors.dark.elevated : theme.colors.light.elevated;

  return (
    <View style={styles.sheetOverlay}>
      <View style={[styles.sheetContent, { backgroundColor: bg }]}>
        {children}
      </View>
    </View>
  );
};

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  pressableBase: {
    // Base pressable
  },
  pressed: {
    opacity: 0.8,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space['3xl'],
  },
  section: {
    // Whitespace grouping handled by marginTop prop
  },
  sectionHeader: {
    ...theme.typography.footnote,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.space.sm,
  },
  card: {
    borderRadius: theme.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: theme.space.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.space.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    flex: 1,
  },
  separatorVertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
  buttonBase: {
    height: 48,
    borderRadius: theme.radius.control,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    flexDirection: 'row',
  },
  buttonFilled: {
    // backgroundColor set dynamically
  },
  buttonPlain: {
    // transparent
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...theme.typography.headline,
  },
  buttonTextFilled: {
    color: '#FFFFFF',
  },
  buttonTextTinted: {
    // color set dynamically
  },
  buttonTextPlain: {
    // color set dynamically
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  badgeBase: {
    borderRadius: 999,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...theme.typography.caption,
  },
  glassTabBarPlaceholder: {
    height: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    padding: theme.space.lg,
    minHeight: 200,
  },
});

export default {
  Screen,
  Section,
  Card,
  Row,
  Button,
  Separator,
  Badge,
  PressableScale,
  GlassTabBar,
  Sheet,
};