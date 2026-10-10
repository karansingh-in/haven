// Mock for react-native-reanimated
const React = require('react');
const { View } = require('react-native');

const withSpring = (value, config) => value;
const withTiming = (value, config) => value;
const withDelay = (value, config) => value;
const withSequence = (...values) => values[values.length - 1];

const useSharedValue = (initial) => ({ value: initial });
const useAnimatedStyle = (fn) => fn();
const useAnimatedReaction = (fn, callback) => {};
const useDerivedValue = (fn) => fn();

const Easing = {
  linear: {},
  ease: {},
  quad: {},
  cubic: {},
  poly: (n) => {},
  sin: {},
  circle: {},
  exp: {},
  elastic: (bounciness) => {},
  bounce: (bounciness) => {},
  bezier: (x1, y1, x2, y2) => {},
  in: (easing) => easing,
  out: (easing) => easing,
  inOut: (easing) => easing,
};

const interpolate = (value, input, output) => {
  if (input.length === 2 && output.length === 2) {
    const [inMin, inMax] = input;
    const [outMin, outMax] = output;
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  }
  return output[0];
};

const extrapolate = {
  extend: 'extend',
  clamp: 'clamp',
  identity: 'identity',
};

module.exports = {
  default: {
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedReaction,
    useDerivedValue,
    Easing,
    interpolate,
    extrapolate,
  },
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useDerivedValue,
  Easing,
  interpolate,
  extrapolate,
  View: View,
  Animated: {
    View,
    Text: View,
    Image: View,
    ScrollView: View,
    FlatList: View,
    SectionList: View,
    createAnimatedComponent: (c) => c,
  },
};