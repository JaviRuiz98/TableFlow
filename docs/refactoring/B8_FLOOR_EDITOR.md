# B8 — Floor editor modularization (complete)

**Branch:** `main`  
**Status:** **B8.1–B8.6 DONE**  
**Module brief:** [../modules/floor-editor.md](../modules/floor-editor.md)

## Subphases

| Step | Outcome |
|------|---------|
| B8.1 | Audit + characterization plan |
| B8.2 | `geometry/` — GeometryService + line helpers |
| B8.3 | `canvas/` — viewport + stage teardown utils |
| B8.4 | `tools/` — policy + drawing model builders |
| B8.5 | `history/` — stack ops; PlanEditor owns arrays |
| B8.6 | Integration: docs, contracts tests, dead Ionic imports removed, section markers, typed realtime channel |

## Architecture (final)

```text
features/floor-editor/
  plan-editor.component.*     # coordinator + Stage + render
  table-product-panel.*
  geometry/  canvas/  tools/  history/
```

**Direction:** editor → floor-plans / orders / products / auth.  
**Never:** floor-plans → floor-editor.

## Public contracts (must not break)

- Workspace `@ViewChild` → `saveDesign`, `openOperationalTarget`
- `@Input plan|mode|hideSurface`, `@Output pendingChanged`
- Panel `@Output targetSelected`

## What remains in PlanEditor (justified)

| Concern | Why |
|---------|-----|
| `render` + drag/endpoints | Konva nodes + model + history tightly coupled |
| Stage create/listeners | Single owner requirement |
| Order dialog / realtime | Feature orchestration |
| `TableDeletionService` usage | Moves with B9 tables module |
| History **arrays** | Single source of truth; utils only compute next state |

## Manual QA checklist (B8 close)

- [ ] Wheel zoom at pointer; pinch; pan tool
- [ ] Draw wall after zoom; short stroke cancel
- [ ] Undo/redo; undo then new edit clears redo
- [ ] Lock/unlock; USER cannot draw
- [ ] Operativo: panel select → order dialog; attended/observation
- [ ] Save/reload preserves table ids
- [ ] Leave editor: no leftover dialogs/listeners
- [ ] Protected delete password flows

## Next authorized step

**B9 — `features/tables`** (validation, deletion; document RPC ownership). Do not start without approval.
