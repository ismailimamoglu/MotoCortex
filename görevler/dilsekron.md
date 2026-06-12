MOTO CORTEX LANGUAGE SYNC HARDENING PLAN v1.0
Phase 1 — Translation Audit

Repo genelinde tara:

t(
i18n.t(
hardcoded strings
translation object direct access

Raporla:

UI-safe
Async-safe
Unsafe
Phase 2 — Enforce Two-Zone Rule
Zone A — React UI Layer

Allowed only:

useTranslation()

Forbidden:

i18n.t()
translations[lang]
Zone B — Async / Non-React Layer

Allowed only:

i18n.t()

Examples:

Bluetooth callbacks
OBD queue
watchdog
timers
alert handlers
native listeners

Forbidden:

useTranslation()
Phase 3 — Translation Integrity Validator

Create:

scripts/validateTranslations.ts

Checks:

missing keys
orphan keys
type mismatch
empty strings

Fail CI if broken.

Phase 4 — Runtime Language Event Bus

Dil değişince:

LANGUAGE_CHANGED

event yayınla.

Subscribers:

Toast manager
Modal manager
Alert manager
Bottom sheet manager
Navigation titles

force refresh.

Phase 5 — Dev Guardrails

ESLint rules:

Ban:

<Text>Hello</Text>
Alert.alert("Error")

Allow only translation keys.