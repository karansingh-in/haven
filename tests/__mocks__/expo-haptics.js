// Mock for expo-haptics
const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
};

const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

const selectionAsync = jest.fn().mockResolvedValue(undefined);
const impactAsync = jest.fn().mockResolvedValue(undefined);
const notificationAsync = jest.fn().mockResolvedValue(undefined);

module.exports = {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  selectionAsync,
  impactAsync,
  notificationAsync,
  default: {
    ImpactFeedbackStyle,
    NotificationFeedbackType,
    selectionAsync,
    impactAsync,
    notificationAsync,
  },
};