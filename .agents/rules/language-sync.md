---
trigger: always_on
---

# Global Multilingual Synchronization & i18n Guardrails

## 1. Absolute Prohibition of Hardcoded UI Strings
- NEVER insert user-facing plain text strings directly into any UI layout component, screen, custom hook, or modal.
- Every single piece of user-visible text—including error boundaries, button labels, diagnostic descriptions, and contextual paywall dynamic templates—must be strictly bound via the localization hook (`t('key')` or equivalent i18n instance).

## 2. 26-Language Matrix & Retroactive Audit
- In every task assigned, you are strictly mandated to execute a retroactive audit on the modified file context to detect, catch, and extract any legacy hardcoded strings or missing i18n keys from previous iterations.
- When a new localization key is introduced, you must verify that the key is symmetrically declared across the primary translation files (`tr.json`, `en.json`). 
- If the translation matrices for the remaining target global languages (up to 26 languages) are handled via automated pipelines, you must output a structured JSON translation template snippet so the developer can easily feed the localized pipeline without missing keys.

## 3. Typed Structural Integrity (Zero Translation Drift)
- The nested object hierarchies must match 1:1 across all localized resource files. If a new key is added into `locales/tr.json` under `paywall.dtcTeaser`, the exact same structure must exist in `locales/en.json` and all other generated language vectors.
- Do not introduce arbitrary string constants inside code files. If a text needs dynamic parameters (e.g., `{{code}}` or `{{misfireCount}}`), enforce interpolation tokens inside the JSON schema rather than slicing strings in the logic layer.