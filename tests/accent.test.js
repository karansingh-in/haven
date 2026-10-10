import { theme, useAccent } from '../src/theme';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

beforeEach(() => {
  theme.colors.setAccent('blue');
});

test('useAccent returns default blue when nothing stored', () => {
  const { accent } = useAccent();
  expect(accent).toBe('#007AFF');
});

test('theme accentColors has 4 swatches', () => {
  expect(theme.colors.accentKeys).toEqual(['blue', 'green', 'indigo', 'orange']);
});

test('setAccent updates theme.accent and persists', () => {
  const result = theme.colors.setAccent('green');
  expect(result).toBe(true);
  expect(theme.colors.getAccent()).toBe('#34C759');
  expect(theme.colors.light.accent).toBe('#34C759');
  expect(theme.colors.dark.accent).toBe('#34C759');
  expect(theme.colors.light.fill.quaternary).toBe('#34C75926');
});

test('setAccent rejects invalid keys', () => {
  theme.colors.setAccent('green');
  expect(theme.colors.getAccent()).toBe('#34C759');
  
  const result = theme.colors.setAccent('invalid');
  expect(result).toBe(false);
  expect(theme.colors.getAccent()).toBe('#34C759');
});