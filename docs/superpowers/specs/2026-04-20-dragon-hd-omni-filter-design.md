# Dragon HD Omni Voice Filter

## Problem

Azure TTS now offers "Dragon HD Omni" voices alongside the existing "Dragon HD" voices. The app needs a dedicated filter checkbox to isolate Dragon HD Omni voices. The existing Dragon HD filter must be updated so the two categories don't overlap.

Dragon HD Omni voices follow the ShortName pattern: `{locale}-{voicename}:DragonHDOmniLatestNeural` (e.g. `en-US-Brian:DragonHDOmniLatestNeural`).

## Design

### Single file change: `src/components/VoiceSelector.tsx`

**New state:**

```typescript
const [filterDragonHDOmni, setFilterDragonHDOmni] = useState(false);
```

**Updated `applyFilters()` logic:**

- Existing Dragon HD line changes from:
  ```typescript
  if (filterDragonHD && !v.ShortName.includes('DragonHD')) return false;
  ```
  to:
  ```typescript
  if (filterDragonHD && !(v.ShortName.includes('DragonHD') && !v.ShortName.includes('DragonHDOmni'))) return false;
  ```
- New Dragon HD Omni line:
  ```typescript
  if (filterDragonHDOmni && !v.ShortName.includes('DragonHDOmni')) return false;
  ```

**Updated `anyFilter`:**

Add `filterDragonHDOmni` to the expression.

**Updated `useMemo` dependency arrays:**

Both `filteredAllVoices` and `filteredVoices` memos add `filterDragonHDOmni`.

**New checkbox in filter bar (placed after the Dragon HD checkbox):**

```tsx
<label className="flex items-center gap-1.5 cursor-pointer">
  <input type="checkbox" checked={filterDragonHDOmni} onChange={(e) => setFilterDragonHDOmni(e.target.checked)} className="rounded" />
  <span className="text-gray-600">Dragon HD Omni</span>
</label>
```

## Scope

- Only `src/components/VoiceSelector.tsx` is modified.
- No server, database, or API changes.
- No new dependencies.
