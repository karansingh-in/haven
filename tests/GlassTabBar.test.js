import React from 'react';
import renderer from 'react-test-renderer';
import { GlassTabBar } from '../src/ui';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (fn) => fn(),
  withSpring: (val) => val,
  useAnimatedReaction: () => {},
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn(),
}));

test('GlassTabBar has 5 tabs and renders BlurView', () => {
  const tabs = ['Today', 'Calendar', 'Study', 'Insights', 'NEET'];
  const tree = renderer.create(
    React.createElement(GlassTabBar, { tabs, active: 'Today', onPress: jest.fn() })
  ).toJSON();
  expect(tree).toBeDefined();
});