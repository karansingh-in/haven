# Task 1: Add Dependencies & Font Assets

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `assets/fonts/Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Bold.ttf`

**Interfaces:**
- Produces: Installed packages, font assets registered in app.json

- [ ] **Step 1: Add `expo-blur` to package.json dependencies**
```bash
npx expo install expo-blur
```

- [ ] **Step 2: Remove google-fonts packages**
```bash
npm uninstall @expo-google-fonts/fraunces @expo-google-fonts/outfit
```

- [ ] **Step 3: Download Inter font files** (weights 400, 500, 600, 700) to `assets/fonts/`

- [ ] **Step 4: Update app.json plugins + fonts array**
```json
{
  "expo": {
    "plugins": [
      "expo-blur",
      "expo-local-authentication",
      ["expo-notifications", { "icon": "./assets/images/icon.png", "color": "#007AFF" }]
    ],
    "fonts": [
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-Medium.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./assets/fonts/Inter-Bold.ttf"
    ]
  }
}
```

- [ ] **Step 5: Verify install**
```bash
npx expo install --check
```
Expected: All dependencies compatible with SDK 57

- [ ] **Step 6: Commit**
```bash
git add package.json app.json assets/fonts/
git commit -m "chore: add expo-blur, Inter fonts; remove google-fonts"
```