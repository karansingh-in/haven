import { theme } from '../src/theme';

test('space scale contains only 8pt multiples', () => {
  const allowed = [4,8,12,16,24,32,48,64];
  Object.values(theme.space).forEach(v => expect(allowed).toContain(v));
});

test('colors have light and dark variants', () => {
  expect(theme.colors.light.bg).toBe('#FFFFFF');
  expect(theme.colors.dark.bg).toBe('#000000');
  expect(theme.colors.light.accent).toBeDefined();
  expect(theme.colors.dark.accent).toBeDefined();
});

test('typography has tabular-nums on all number styles', () => {
  ['timer', 'countdown', 'score', 'hours'].forEach(key => {
    expect(theme.typography[key].fontVariant).toEqual(['tabular-nums']);
  });
});