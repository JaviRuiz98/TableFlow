# TableFlow

**TableFlow** es una aplicación full stack para la gestión operativa de salas: planos, mesas y reservados, catálogo, pedidos y avisos al personal en tiempo real.

Combina un **editor visual de planos** (Konva) con un flujo de **operativa** conectado a **Supabase** (PostgreSQL, Auth, Realtime y Edge Functions). Está pensada para establecimientos donde la disposición del espacio y el estado de cada mesa deben coordinarse con el servicio, sin depender de hojas sueltas ni de herramientas desconectadas.

Se entrega como **PWA** (Angular + Ionic) y puede empaquetarse para **Android / iOS** con Capacitor.

> Identidad de producto y repositorio: **TableFlow**. La interfaz y el empaquetado nativo pueden seguir mostrando la marca operativa histórica «Sala Chocolatte» hasta un rebranding visual autorizado. El backend de referencia es exclusivamente el proyecto Supabase TableFlow.

---

## Funcionalidades principales

| Área | Qué incluye |
|------|-------------|
| **Editor de planos** | Diseño con Konva: mesas, reservados, líneas/muros, texto, zoom/pan, bloqueo del plano, undo/redo |
| **Mesas y reservados** | Numeración, selección, borrado protegido por contraseña de aplicación (RPC) |
| **Operativa y pedidos** | Pedidos por mesa/reservado, cantidades, estados PENDING/PLACED, marcado `attended` |
| **Observaciones** | Notas por mesa/reservado visibles en operativa |
| **Catálogo** | Categorías y productos activos; alta/edición y borrado seguro vía RPC |
| **Usuarios y roles** | `ADMIN` (dashboard empresarial + alta de usuarios), `USER` (gestión de sala), `RECEPTOR` (recepción); alta solo por ADMIN vía `create-user` |
| **Realtime** | Canales Supabase para pedidos/observaciones y avisos al rol RECEPTOR |
| **Historial del editor** | Pila de snapshots locales con undo/redo durante la sesión de diseño |
| **PWA y móvil** | Service Worker / build web; Capacitor para Android e iOS |

Detalle de dominio: [`docs/modules/`](docs/modules/).

---

## Capturas de pantalla

Aún no hay capturas versionadas en el repositorio. Cuando estén disponibles, pueden colocarse así:

```markdown
### Editor de planos
![Editor de planos](docs/assets/screenshots/editor-planos.png)

### Vista operativa
![Vista operativa](docs/assets/screenshots/operativa.png)

### Catálogo
![Catálogo](docs/assets/screenshots/catalogo.png)

### Administración
![Administración](docs/assets/screenshots/administracion.png)
```

Carpeta sugerida: `docs/assets/screenshots/` (por crear).

---

## Stack tecnológico

Versiones tomadas de `package.json` (rangos `^` del proyecto):

| Capa | Tecnología |
|------|------------|
| Framework | Angular **20.3** · TypeScript |
| UI | Ionic **8.8** · componentes standalone |
| Canvas | Konva **10.3** |
| Backend | Supabase JS **2.112** · PostgreSQL · Auth · Realtime · Edge Function `create-user` |
| Nativo | Capacitor **8.5** (Android / iOS) |
| Tests | Vitest **3.2** + jsdom · Playwright **1.55** |
| Calidad | ESLint |

---

## Arquitectura modular

El código de aplicación se organiza por **features** (dominio) y **core** (transversal). Cada feature concentra su servicio, utilidades y, cuando aplica, componentes UI en carpetas por unidad de responsabilidad. La capa UI no usa el cliente Supabase en crudo: el acceso pasa por servicios de feature e infraestructura.

### Áreas

| Módulo | Responsabilidad |
|--------|-----------------|
| `features/workspace` | Shell: pestañas, composición del editor, diálogos de planos/catálogo, alertas RECEPTOR |
| `features/floor-editor` | Editor Konva (Stage único), herramientas, historial, panel de productos en mesa |
| `features/floor-plans` | Persistencia de planos: listado, snapshot, duplicado, lock, attended/observation RPC |
| `features/tables` | Validación y borrado de mesas/reservados con contraseña |
| `features/orders` | Pedidos abiertos, asignación de productos, mapas de cantidades, suscripción realtime |
| `features/products` | Catálogo (categorías/productos) y RPC de historial/borrado seguro |
| `features/users` | Cliente de verifyAccess / create-user |
| `features/notifications` | Debounce y canales de alerta para RECEPTOR |
| `features/auth` | Pantalla de login |
| `core/auth` + `core/guards` | Sesión, roles, `authGuard` |
| `core/infrastructure` | `SupabaseService`, errores |
| `core/data` + `core/models` | Tipos DB alineados a BOOTSTRAP y modelos de dominio |

### Árbol (estructura real, compacta)

```text
src/app/
  core/
    auth/  guards/  infrastructure/  data/  models/
  features/
    auth/login/
    workspace/          # shell + carpetas por diálogo/panel
    floor-editor/       # plan-editor/, table-product-panel/, geometry/, canvas/, tools/, history/
    floor-plans/        # floor-plan/, plan-duplication/, snapshot/, element/
    tables/             # table-deletion/, table-validation/
    orders/             # order/, order-state/, open-order-quantity-maps/
    products/product/
    users/user-admin/
    notifications/order-notification/
```

Mapas: [`docs/architecture/MODULE_MAP.md`](docs/architecture/MODULE_MAP.md) · [`docs/architecture/DEPENDENCY_MAP.md`](docs/architecture/DEPENDENCY_MAP.md) · [`docs/architecture/SYSTEM_OVERVIEW.md`](docs/architecture/SYSTEM_OVERVIEW.md).

---

## Sistema de agentes especializados (Cursor)

TableFlow incluye una configuración **multiagente para el IDE Cursor**, orientada a mantener cambios acotados por dominio. Son **subagentes de asistencia al desarrollo**, no parte del runtime de la aplicación.

| Pieza | Ubicación |
|-------|-----------|
| Restricciones globales | [`AGENTS.md`](AGENTS.md) + regla always-apply `.cursor/rules/tableflow-global.mdc` |
| Reglas por dominio | `.cursor/rules/*.mdc` (globs) |
| Subagentes | `.cursor/agents/tableflow-*.md` (invocación `/tableflow-<dominio>`) |
| Briefs de módulo | [`docs/modules/`](docs/modules/) |
| Mapa de invocación | [`docs/agents/AGENT_MAP.md`](docs/agents/AGENT_MAP.md) |

**Doce especialistas:** `tableflow-orchestrator`, `tableflow-auth`, `tableflow-workspace`, `tableflow-floor-plans`, `tableflow-floor-editor`, `tableflow-tables`, `tableflow-orders`, `tableflow-products`, `tableflow-users`, `tableflow-notifications`, `tableflow-test-runner`, `tableflow-db-contracts`.

- Coordinación de trabajo cruzado: `/tableflow-orchestrator`
- Inventario y ejecución de tests: `/tableflow-test-runner`

La configuración se validó frente a la documentación de Cursor y mediante simulaciones de alcance; la invocación interactiva de cada slash en el IDE depende del entorno del usuario.

---

## Instalación y ejecución

Requisitos: **Node.js 22+**, npm, y un proyecto Supabase TableFlow (URL + clave pública anon/publishable).

```bash
git clone https://github.com/JaviRuiz98/TableFlow.git
cd TableFlow
npm ci
cp .env.example .env
# Editar .env con SUPABASE_URL y SUPABASE_ANON_KEY (solo valores públicos)
npm start
# App en http://127.0.0.1:4200/ (hash routing)
```

`prestart` / `prebuild` ejecutan `scripts/generate-env.mjs` y generan `src/environments/*` (ignorados por Git).

**Seguridad**

- No coloques `service_role` ni claves `sb_secret_*` en `.env` ni en el frontend.
- El acceso a datos sensibles debe quedar protegido por Auth + RLS en Supabase.

### Calidad local

```bash
npm test          # Vitest (suite unitaria / integración mockeada)
npm run lint      # ESLint --max-warnings=0
npm run build     # producción → dist/discoteca/browser (ruta legacy Capacitor/ngsw)
npm run e2e       # Playwright smoke (servidor + bloqueo de mutaciones remotas)
```

Empaquetado nativo: [`docs/native/NATIVE_APP.md`](docs/native/NATIVE_APP.md) (`appId` / `webDir` conservados por compatibilidad).

---

## Testing y calidad

| Tipo | Herramienta | Notas |
|------|-------------|--------|
| Unitaria / integración mockeada | Vitest + jsdom | Specs por feature; Supabase mockeado |
| E2E smoke | Playwright | Login/shell; mutaciones remotas bloqueadas (`e2e/helpers/network-safety.ts`) |
| Estático | ESLint | `npm run lint` |

Estado verificado en el cierre de la fase de componentes: **185** tests Vitest · **4** escenarios Playwright · lint y build en verde.

Documentación: [`docs/testing/TEST_STRATEGY.md`](docs/testing/TEST_STRATEGY.md) · [`docs/testing/TEST_MATRIX.md`](docs/testing/TEST_MATRIX.md).

No hay badges de cobertura ni pipeline CI de deploy documentados en este repositorio.

---

## Documentación técnica

| Tema | Enlace |
|------|--------|
| Visión del sistema | [`docs/architecture/SYSTEM_OVERVIEW.md`](docs/architecture/SYSTEM_OVERVIEW.md) |
| Mapa de módulos | [`docs/architecture/MODULE_MAP.md`](docs/architecture/MODULE_MAP.md) |
| Dependencias entre dominios | [`docs/architecture/DEPENDENCY_MAP.md`](docs/architecture/DEPENDENCY_MAP.md) |
| Integración Supabase | [`docs/architecture/SUPABASE_INTEGRATION.md`](docs/architecture/SUPABASE_INTEGRATION.md) |
| Auditoría de migraciones / esquema | [`docs/architecture/DATABASE_MIGRATION_AUDIT.md`](docs/architecture/DATABASE_MIGRATION_AUDIT.md) |
| Briefs por módulo | [`docs/modules/`](docs/modules/) |
| Agentes Cursor | [`docs/agents/README.md`](docs/agents/README.md) · [`AGENTS.md`](AGENTS.md) |
| Testing | [`docs/testing/`](docs/testing/) |
| Capacitor / nativo | [`docs/native/`](docs/native/) |
| Notas de producto / sesión | [`docs/product/`](docs/product/) |
| Progreso de refactor | [`docs/refactoring/REFACTOR_PROGRESS.md`](docs/refactoring/REFACTOR_PROGRESS.md) |
| SQL de referencia | [`supabase/BOOTSTRAP_TABLEFLOW.sql`](supabase/BOOTSTRAP_TABLEFLOW.sql) · [`supabase/migrations/`](supabase/migrations/) |

---

## Limitaciones conocidas

- Las mutaciones requieren red; el modo offline es shell/caché, no operación completa desconectada.
- La geometría de dibujo a plano es conservadora (segmentos ortogonales).
- Marca visible en UI / Capacitor ≠ nombre técnico TableFlow (deuda de branding documentada).
- Artefacto de build `dist/discoteca` se mantiene por compatibilidad nativa y Service Worker.
- Los tipos TypeScript de base de datos están alineados a BOOTSTRAP; una regeneración oficial desde remoto queda pendiente de autorización.

Detalles de esquema, migraciones y scripts SQL complementarios: [`docs/architecture/DATABASE_MIGRATION_AUDIT.md`](docs/architecture/DATABASE_MIGRATION_AUDIT.md).

---

## Licencia y contribución

Repositorio: [github.com/JaviRuiz98/TableFlow](https://github.com/JaviRuiz98/TableFlow).

Para cambios locales: preferir trabajo acotado por módulo, respetar [`AGENTS.md`](AGENTS.md) y no introducir secretos en el código.
