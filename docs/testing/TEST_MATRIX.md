# Functional coverage matrix (B13)

Legend: **U** unit · **I** integration (mocked) · **E** E2E · **M** manual · **—** gap / blocked

| Flow | U | I | E | Notes |
|------|---|---|---|-------|
| Login / session / roles | ✓ | ✓ auth.service | ✓ shell + blocked submit | Full ADMIN workspace E2E needs isolated backend |
| Logout / cleanup | ✓ workspace | ✓ auth.signOut | — | |
| authGuard redirect | | ✓ | ✓ unauth → login | |
| ADMIN tabs Planos/Productos/Usuarios | ✓ visibility + workspace | | — | Characterize in Vitest; UI brand manual |
| USER operativa only | ✓ | | — | |
| Plan list/create/select | ✓ workspace / floors | ✓ FloorPlanService | — | |
| Snapshot save (RPC args) | | ✓ | — | Mocked RPC only |
| Load snapshot + RESERVED split | | ✓ | — | |
| Duplicate plan | ✓ | ✓ PlanDuplication | — | |
| Lock plan | | ✓ setLocked | — | |
| Geometry / tools / history | ✓ | | — | Not Konva gestures |
| Viewport zoom ↔ model coords | ✓ | | — | Pure math |
| Stage teardown listeners | ✓ | | — | |
| Table validation / deletion RPC | ✓ | ✓ | — | Never live delete |
| Attended / observation RPC | | ✓ | — | Still on FloorPlanService |
| Catalog CRUD + safe delete | ✓ products + workspace | | — | |
| Orders forTable / assign / maps | ✓ state/maps | ✓ OrderService | — | |
| Realtime notify debounce | ✓ | ✓ workspace↔orders | — | |
| User admin dialogs / Edge invoke | ✓ | ✓ UserAdminService | — | Edge mocked |
| Reservations table contract | ✓ contract | | — | **No Angular UI module** |
| Konva drag/draw in browser | — | — | — | Documented gap |
| Create user against remote | — | — | blocked | Intentionally forbidden |

## Counts (post B13 Vitest)

- Spec files: 35
- Tests: **159** (was 138 before B13)
- Playwright files: `e2e/app.spec.ts`, `e2e/auth-shell.spec.ts` (+ helper)

Percentages intentionally omitted — matrix is qualitative.
