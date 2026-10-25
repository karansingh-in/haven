// WCAG contrast for the app's own palette. Colours may be hex or rgba(); rgba
// is composited over the surface it sits on, which is how the real screens
// render (the label tokens are translucent by design).
import { ACCENTS, DARK, LIGHT } from "../src/palette";

function parse(color) {
  const value = String(color).trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Cannot read colour: ${color}`);
  const [r, g, b, a] = match[1].split(",").map((v) => Number(v.trim()));
  return { r, g, b, a: a === undefined ? 1 : a };
}

function over(front, back) {
  const f = parse(front);
  const b = typeof back === "object" ? back : parse(back);
  return {
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  };
}

function channel(value) {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(foreground, background) {
  const back = typeof background === "object" ? background : parse(background);
  const front = over(foreground, back);
  const a = luminance(front);
  const b = luminance(back);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

// A translucent fill is only a background once it is laid over the page.
const wash = (fill, base) => over(fill, base);

const themes = [
  ["light", LIGHT],
  ["dark", DARK],
];

describe.each(themes)("%s theme text is readable", (_name, theme) => {
  test("primary text on the page and on cards", () => {
    expect(contrastRatio(theme.label, theme.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.label, theme.surface)).toBeGreaterThanOrEqual(4.5);
  });

  test("secondary text on the page and on cards", () => {
    expect(contrastRatio(theme.label2, theme.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.label2, theme.surface)).toBeGreaterThanOrEqual(4.5);
  });

  // label3 carries placeholders, inactive tabs and icons - tertiary, but still
  // visible. 3:1 is the WCAG bar for non-text/incidental content; pushing it to
  // 4.5 would collapse it into label2 and flatten the type hierarchy.
  test("tertiary text stays visible", () => {
    expect(contrastRatio(theme.label3, theme.bg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(theme.label3, theme.surface)).toBeGreaterThanOrEqual(3);
  });

  test("text on the soft accent fills", () => {
    expect(contrastRatio(theme.label, wash(theme.tintSoft, theme.bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.label, wash(theme.goldSoft, theme.bg))).toBeGreaterThanOrEqual(4.5);
  });

  test("white labels on accent fills", () => {
    for (const [key, accent] of Object.entries(ACCENTS)) {
      expect([key, contrastRatio("#FFFFFF", accent.tint[theme.scheme]) >= 3]).toEqual([key, true]);
    }
  });
});

test("contrastRatio matches known pairs", () => {
  expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  // 50% black over white is ~#808080, which is close to 3.9:1.
  expect(contrastRatio("rgba(0,0,0,0.5)", "#FFFFFF")).toBeGreaterThan(3.5);
});
