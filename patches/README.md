# Package Patches Documentation

This directory contains `patch-package` modifications applied automatically via `postinstall` script.

## 1. `expo-localization+16.0.1.patch`

- **Target Package:** `expo-localization` (v16.0.1)
- **Target File:** `ios/LocalizationModule.swift`
- **Reason:** Fixed a Swift 5.x compiler warning/error caused by a missing `@unknown default` case in the `Calendar.Identifier` enum switch statement. Fallback returns `"gregory"`.

## 2. `expo-modules-core+2.2.3.patch`

- **Target Package:** `expo-modules-core` (v2.2.3)
- **Target File:** `android/ExpoModulesCorePlugin.gradle`
- **Reason:** Fixed an Android Gradle 8.x build failure where `components.release` was accessed prior to evaluation completion. Wrapped inside `project.afterEvaluate` block.
