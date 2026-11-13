import { Platform } from "react-native";

// The Android widget reads a JSON file the app writes into its own filesDir.
// Loading the native module lazily keeps the web build (and jest) from ever
// touching it.
let native = null;

const load = () => {
  if (Platform.OS !== "android") return null;
  if (!native) {
    const { requireNativeModule } = require("expo-modules-core");
    native = requireNativeModule("HavenWidget");
  }
  return native;
};

// Fire and forget: a widget that fails to update must never break a render.
export function updateHavenWidget(payload) {
  try {
    load()?.update(JSON.stringify(payload));
  } catch (error) {
    console.warn("widget update failed", error);
  }
}
