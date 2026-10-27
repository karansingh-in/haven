// Builds the sideloadable release APK.
//
// `android/` is generated, so the two size settings below are applied after
// every prebuild instead of living in a file that gets wiped.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const android = join(root, "android");
const isWindows = process.platform === "win32";

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", shell: isWindows });

console.log("› prebuild");
run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"], root);

// Compress the .so files inside the APK (uncompressed is faster to start,
// but the APK is ~20 MB bigger and this one is carried around on a cable).
const propsPath = join(android, "gradle.properties");
const props = readFileSync(propsPath, "utf8").replace(
  /^expo\.useLegacyPackaging=.*$/m,
  "expo.useLegacyPackaging=true",
);
writeFileSync(propsPath, props);

// English is the only locale in the app; drop the other ~80 resource sets.
const gradlePath = join(android, "app", "build.gradle");
const gradle = readFileSync(gradlePath, "utf8");
if (!gradle.includes("resourceConfigurations")) {
  writeFileSync(
    gradlePath,
    gradle.replace(
      /(buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL".*\n)/,
      '$1\n        resourceConfigurations += ["en"]\n',
    ),
  );
}

console.log("› assembleRelease (arm64)");
run(
  isWindows ? "gradlew.bat" : "./gradlew",
  [
    "assembleRelease",
    "-PreactNativeArchitectures=arm64-v8a",
    "-Pandroid.enableMinifyInReleaseBuilds=true",
    "-Pandroid.enableShrinkResourcesInReleaseBuilds=true",
  ],
  android,
);

console.log("APK: android/app/build/outputs/apk/release/app-release.apk");
