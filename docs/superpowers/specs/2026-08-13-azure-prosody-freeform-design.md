# Azure TTS — free-form rate/pitch/volume input

**Date:** 2026-08-13
**Branch:** `fix/azure-tts-rate`

## Problem

The Azure prosody controls (`ProsodyControls.tsx`) only expose the named preset
levels via `<select>` dropdowns (`x-slow`…`x-fast`, etc.). Per the Azure docs
([`AzureStandardVoice.rate`](https://learn.microsoft.com/en-us/javascript/api/@azure/ai-voicelive/azurestandardvoice?view=azure-node-latest#@azure-ai-voicelive-azurestandardvoice-rate)),
`rate` — and analogously `pitch` and `volume` — also accept:

- a named level (`x-slow`, `slow`, `medium`, `fast`, `x-fast`, `default`)
- a relative percentage (`+20%`, `-10%`)
- a non-negative multiplier (`0.5`, `1.5`)

Users cannot currently enter percentages or numbers.

## Goal

Let users pick a preset **or** enter a custom value (percentage / number /
relative change) for rate, pitch, and volume in the Azure TTS tab.

## Design

### Component: `src/components/ProsodyField.tsx` (new)

A reusable labeled control combining a preset `<select>` with a conditional
custom text `<input>`.

**Props:** `label`, `presets: string[]`, `customHint: string`, `value: string`,
`onChange: (value: string) => void`.

**Custom-vs-preset mode is derived purely from `value`** — no internal state, no
effects:

```
isCustom = !presets.includes(value)   // '' or '+20%' → custom; 'medium' → preset
```

- The `<select>` lists the presets plus a `Custom (% or number)` sentinel option
  (value `__custom__`).
- Selecting `Custom` calls `onChange('')`, flipping into custom mode with an
  empty text field.
- Because mode is derived from `value`, loading a saved recording with
  `rate: '+20%'` renders in custom mode automatically. No new `TtsConfig` fields.
- The custom field shows `customHint` as a helper line and a **non-blocking**
  soft warning (subtle red text) when a non-empty value does not match the
  field's accepted pattern. Synthesis is never blocked — Azure is the
  authoritative validator.

### `src/components/ProsodyControls.tsx` (refactor)

Render three `ProsodyField`s with doc-accurate hints:

- Rate — presets `x-slow, slow, medium, fast, x-fast`; hint `e.g. +20%, -10%, 0.5, 1.5`
- Pitch — presets `x-low, low, medium, high, x-high`; hint `e.g. +10%, -5%, +50Hz, -2st, 200Hz`
- Volume — presets `silent, x-soft, soft, medium, loud, x-loud`; hint `e.g. +10, -6dB, 0–100`

### `src/utils/ssml.ts` (update)

Replace the `!== 'medium'` checks with an `isProsodyActive` helper:

```
isProsodyActive(v) = v.trim() !== '' && v.trim() !== 'medium'
```

Emit each `rate`/`pitch`/`volume` attribute (trimmed, verbatim) only when active;
`hasProsody` = any active. This keeps `medium` as the no-op default and makes an
empty custom field correctly omit the attribute. Custom values pass straight
through to Azure. The Python/Node code generators reuse `buildSsml`, so they
stay consistent automatically.

### Storage

No change. `rate`/`pitch`/`volume` are already `TEXT` columns
(`server/db.ts`), so custom values persist and round-trip through save/load with
no migration.

## Testing

Extend `tests/ssml.test.ts`:

- custom percentage rate (`+20%`) emitted verbatim inside `<prosody>`
- custom multiplier rate (`1.5`) emitted verbatim
- empty custom value (`''`) omits the attribute / `<prosody>` element
- `medium` still omitted
- custom pitch (`+50Hz`) and volume (`-6dB`) emitted verbatim
- values are trimmed before emission

React Testing Library is not installed; tests stay at the pure-`buildSsml`
level, which is the correctness-critical logic.

## Out of scope

- Changing prosody handling in non-Azure tabs.
- Hard/blocking client-side validation.
