// Palette and accent tokens. Extracted from App.js so the contrast tests can
// import them without pulling in the whole screen tree.

export const ACCENTS = {
  blue: {
    tint: { light: "#007AFF", dark: "#0A84FF" },
    tintSoft: { light: "rgba(0,122,255,0.12)", dark: "rgba(10,132,255,0.16)" },
    tintGradient: {
      light: ["#007AFF", "#007AFF"],
      dark: ["#0A84FF", "#0A84FF"],
    },
  },
  green: {
    tint: { light: "#2C9C4A", dark: "#27A347" },
    tintSoft: { light: "rgba(52,199,89,0.12)", dark: "rgba(48,209,88,0.16)" },
    tintGradient: {
      light: ["#2C9C4A", "#2C9C4A"],
      dark: ["#27A347", "#27A347"],
    },
  },
  indigo: {
    tint: { light: "#5856D6", dark: "#5E5CE6" },
    tintSoft: { light: "rgba(88,86,214,0.12)", dark: "rgba(94,92,230,0.16)" },
    tintGradient: {
      light: ["#5856D6", "#5856D6"],
      dark: ["#5E5CE6", "#5E5CE6"],
    },
  },
  orange: {
    tint: { light: "#CE7200", dark: "#D07800" },
    tintSoft: { light: "rgba(255,149,0,0.12)", dark: "rgba(255,159,10,0.16)" },
    tintGradient: {
      light: ["#CE7200", "#CE7200"],
      dark: ["#D07800", "#D07800"],
    },
  },
};

export const ACCENT_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "indigo", label: "Indigo" },
  { value: "orange", label: "Orange" },
];

export function applyAccent(base, accentKey) {
  const a = ACCENTS[accentKey] || ACCENTS.blue;
  const mode = base.scheme;
  return {
    ...base,
    tint: a.tint[mode],
    tintSoft: a.tintSoft[mode],
    tintGradient: a.tintGradient[mode],
  };
}

export const LIGHT = {
  scheme: "light",
  bg: "#FFFFFF",
  surface: "#F2F2F7",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#F2F2F7",
  fill: "rgba(60,60,67,0.08)",
  fillStrong: "rgba(60,60,67,0.15)",
  separator: "rgba(60,60,67,0.29)",
  label: "#000000",
  label2: "rgba(60,60,67,0.75)",
  label3: "rgba(60,60,67,0.58)",
  tint: "#007AFF",
  tintSoft: "rgba(0,122,255,0.12)",
  tintGradient: ["#007AFF", "#007AFF"],
  rose: "#FF3B30",
  roseSoft: "rgba(255,59,48,0.12)",
  lilac: "#5856D6",
  lilacSoft: "rgba(88,86,214,0.12)",
  mint: "#34C759",
  mintSoft: "rgba(52,199,89,0.12)",
  gold: "#FF9500",
  goldSoft: "rgba(255,149,0,0.14)",
  red: "#C93A32",
  redSoft: "rgba(201,58,50,0.10)",
  scrim: "rgba(0,0,0,0.40)",
  chrome: "rgba(255,255,255,0.88)",
  shadow: "#000000",
};

export const DARK = {
  scheme: "dark",
  bg: "#000000",
  surface: "#1C1C1E",
  surfaceRaised: "#2C2C2E",
  surfaceSunken: "#0A0A0C",
  fill: "rgba(235,235,245,0.10)",
  fillStrong: "rgba(235,235,245,0.17)",
  separator: "rgba(84,84,88,0.50)",
  label: "#FFFFFF",
  label2: "rgba(235,235,245,0.60)",
  label3: "rgba(235,235,245,0.40)",
  tint: "#0A84FF",
  tintSoft: "rgba(10,132,255,0.16)",
  tintGradient: ["#0A84FF", "#0A84FF"],
  rose: "#FF453A",
  roseSoft: "rgba(255,69,58,0.16)",
  lilac: "#5E5CE6",
  lilacSoft: "rgba(94,92,230,0.16)",
  aqua: "#64D2FF",
  aquaSoft: "rgba(100,210,255,0.16)",
  mint: "#30D158",
  mintSoft: "rgba(48,209,88,0.16)",
  gold: "#FF9F0A",
  goldSoft: "rgba(255,159,10,0.16)",
  red: "#FF453A",
  redSoft: "rgba(255,69,58,0.16)",
  scrim: "rgba(0,0,0,0.62)",
  chrome: "rgba(0,0,0,0.86)",
  shadow: "#000000",
};
