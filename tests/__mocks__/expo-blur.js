// Mock for expo-blur
const React = require('react');
const { View } = require('react-native');

const BlurView = ({ intensity = 50, style, children, ...props }) => (
  <View style={[style, { opacity: intensity / 100 }]} {...props}>
    {children}
  </View>
);

module.exports = {
  BlurView,
  default: { BlurView },
};