module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-modules-core|@expo/metro-config|expo-blur)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.test.(ts|tsx|js|jsx)'],
  moduleNameMapper: {
    '^expo-blur$': '<rootDir>/tests/__mocks__/expo-blur.js',
    '^expo-haptics$': '<rootDir>/tests/__mocks__/expo-haptics.js',
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.js',
  },
};