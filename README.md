# TableFlow

Aplicación PWA (Angular 20 + Ionic 8 + Capacitor 8) para operaciones de sala: planos, mesas/reservados, catálogo de productos, pedidos y avisos en tiempo real sobre **Supabase** (Postgres, Auth, Realtime, Edge Function `create-user`).

> Identidad de producto: **TableFlow**. La UI nativa y textos visibles pueden seguir mostrando la marca operativa histórica «Sala Chocolatte» hasta una autorización de rebranding visual. El backend objetivo es exclusivamente el proyecto Supabase TableFlow.

## Stack

| Capa | Tecnología |
|------|------------|
| UI | Angular standalone, Ionic, Konva (editor de planos) |
| Backend | Supabase JS (`@supabase/supabase-js`) |
| Nativo | Capacitor (Android / iOS) |
| Tests | Vitest + jsdom (`npm test`), Playwright smoke (`npm run e2e`) |

## Requisitos

- Node.js 22+
- npm
- Proyecto Supabase **TableFlow** (URL + anon/publishable key)
- Opcional: Android Studio / Xcode para builds nativos

## Configuración (sin secretos)

1. Copia `.env.example` → `.env`.
2. Rellena solo valores **públicos**:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
```

3. `prestart` / `prebuild` ejecutan `scripts/generate-env.mjs` y generan `src/environments/*` (ignorados por Git).
4. **Nunca** pongas `service_role` / `sb_secret_*` en el frontend ni en `.env` de la app.

Esquema de referencia local: `supabase/BOOTSTRAP_TABLEFLOW.sql` y `supabase/migrations/`. El bootstrap **no garantiza** paridad 1:1 con el esquema remoto desplegado; ver `DATABASE_MIGRATION_AUDIT.md` y `docs/refactoring/B12_CLEANUP.md`.

## Instalación y arranque

```bash
npm ci
npm start          # http://127.0.0.1:4200/ (hash routing)
```

## Tests, lint y build

```bash
npm test
npm run lint
npm run build      # salida: dist/discoteca/browser (ruta legacy de build; ver B12)
npm run e2e        # smoke Playwright (requiere servidor)
```

Estado actual: **159** tests Vitest; Playwright smoke + auth-shell (mutaciones remotas bloqueadas). Detalle: [`docs/testing/TEST_STRATEGY.md`](docs/testing/TEST_STRATEGY.md). Sin workflow de deploy en este repositorio.

## Arquitectura modular

Tras el refactor B0–B11, el código vive en features + core:

| Área | Ruta |
|------|------|
| Shell | `src/app/features/workspace/` |
| Editor de planos | `src/app/features/floor-editor/` |
| Persistencia de planos | `src/app/features/floor-plans/` |
| Mesas (borrado/validación) | `src/app/features/tables/` |
| Pedidos / productos / usuarios / notificaciones | `features/{orders,products,users,notifications}/` |
| Auth + infra + tipos DB | `src/app/core/` |

Mapas: [`docs/architecture/MODULE_MAP.md`](docs/architecture/MODULE_MAP.md) · [`docs/architecture/DEPENDENCY_MAP.md`](docs/architecture/DEPENDENCY_MAP.md) · módulos en [`docs/modules/`](docs/modules/).

## Funciones principales

- Roles **ADMIN** / **USER**
- Planos: diseño (ADMIN), operativa, duplicado, bloqueo
- Pedidos por mesa/reservado, estados PENDING/PLACED, `attended`, observaciones
- Catálogo con borrado seguro vía RPC
- Alta de usuarios ADMIN (Edge Function + contraseña de app)
- Realtime para pedidos/observaciones (avisos USER)

## Capacitor

Empaquetado nativo documentado en [`NATIVE_APP.md`](NATIVE_APP.md).  
`appId` / `appName` / `webDir` (`dist/discoteca/browser`) se conservan por compatibilidad nativa hasta autorización explícita de cambio.

## Limitaciones conocidas

- Offline: shell/cache; mutaciones requieren red.
- Geometría dibujo→plano es conservadora (segmentos ortogonales).
- Marca visible en UI ≠ nombre técnico TableFlow (deuda de branding visual).
- Prefijo duplicado de migración `0007_*` en el historial SQL (no renombrar en B12).
- Tipos DB alineados a BOOTSTRAP (B10); regeneración oficial pendiente.

## Agentes / refactor

Progreso: [`docs/refactoring/REFACTOR_PROGRESS.md`](docs/refactoring/REFACTOR_PROGRESS.md).  
Testing: [`docs/testing/TEST_STRATEGY.md`](docs/testing/TEST_STRATEGY.md).  
Agentes Cursor: [`docs/agents/README.md`](docs/agents/README.md) · invocación `/tableflow-<dominio>`.
