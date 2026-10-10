// Mock for react-native with useColorScheme
const React = require('react');
const RN = jest.requireActual('react-native');

const useColorScheme = jest.fn(() => 'light');

module.exports = {
  ...RN,
  useColorScheme,
  Platform: {
    ...RN.Platform,
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  StyleSheet: {
    ...RN.StyleSheet,
    hairlineWidth: 0.5,
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    create: (styles) => styles,
    flatten: (style) => style,
  },
};