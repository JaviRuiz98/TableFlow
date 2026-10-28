# Auditoría estática de base de datos — TableFlow

**Fecha:** 2026-10-27  
**Alcance:** análisis solo de archivos locales (`supabase/migrations`, SQL complementarios, `supabase/functions`, tipos Angular y README).  
**Restricciones respetadas:** no se ha conectado a ninguna base remota, no se han ejecutado migraciones, no se ha modificado el proyecto Sala Chocolatte, no se muestran secretos ni credenciales.

> **Advertencia metodológica:** este informe describe el esquema *implícito por el historial de migraciones del repo*. **No** se asume que coincida con el estado real de la base original (CreadorSala / Sala Chocolatte). Puede haber SQL aplicado a mano, objetos legacy o divergencias no versionadas.

---

## 1. Inventario de artefactos

### 1.1 Migraciones (`supabase/migrations/`)

| Archivo | Propósito resumido |
|---------|--------------------|
| `0001_initial.sql` | Esquema base, enums, RLS inicial, seed catálogo, Realtime, trigger `handle_new_user` |
| `0002_persist_table_state.sql` | `type`/`attended` en mesas, enum `text`, FK cascade pedidos, rewrite `replace_floor_plan_snapshot` |
| `0003_user_management.sql` | Bloqueo de rol vía metadata; `app_secrets` + `verify_app_secret` |
| `0004_admin_user_permissions_lock_delete.sql` | Roles `ADMIN`/`USER`; RLS restringida; `is_locked`; RPCs operativas |
| `0005_username_login.sql` | Columna `profiles.username` + índice único |
| `0006_fix_pgcrypto_password_rpcs.sql` | `pgcrypto` en `extensions` + RPC de secretos/borrado |
| `0007_mark_items_placed_when_attended.sql` | Refuerzo de `set_table_attended` (PENDING→PLACED) |
| `0007_product_price_nullable.sql` | `products.price` nullable |
| `0008_catalog_management.sql` | RPC catálogo (bloqueo si hay *cualquier* historial) |
| `0009_fix_add_product_pending.sql` | `assign_products_to_table` vuelve a PENDING al reañadir |
| `0010_catalog_delete_cancelled_only.sql` | Borrado catálogo permitido si solo hay CANCELLED |
| `0011_table_observations.sql` | `tables.observation` + `set_table_observation` + replica identity |
| `0012_text_font_size.sql` | `font_size` en elementos + rewrite snapshot |
| `0013_order_item_attended.sql` | `order_items.attended` + rewrite attended/assign |
| `0014_observation_marks_unattended.sql` | Observación fuerza `attended=false` |
| `0015_realtime_pending_notifications.sql` | Replica identity + publicación Realtime idempotente |
| `0016_observation_pending_without_orders.sql` | Observación vacía no cambia `attended`; no vacía sí |
| `0017_company_registration.sql` | `companies` + `profiles.company_id` + `handle_new_user` registro empresa |
| `0018_products_company_id.sql` | `products.company_id` + RLS por empresa + unique por tenant |

**Total:** 19 archivos (incluye `0017`/`0018`). **Conflicto de numeración:** dos migraciones comparten prefijo `0007`.

### 1.2 SQL complementarios (no gestionados por CLI)

| Archivo | Relación con migraciones |
|---------|--------------------------|
| `supabase/SQL_CATALOG_MANAGEMENT.sql` | Idéntico a `0008` |
| `supabase/SQL_CATALOG_DELETE_CANCELLED_ONLY.sql` | Idéntico a `0010` |
| `supabase/SQL_CATALOG_DELETE_REFRESH.sql` | **Obsoleto** (equivalente a lógica de `0008`, no a `0010`) |
| `supabase/SQL_TABLE_OBSERVATIONS.sql` | Casi idéntico a `0011` (solo comentarios) |
| `supabase/SQL_OBSERVATION_REALTIME.sql` | Subconjunto de Realtime (`tables` replica identity) |
| `supabase/SQL_OBSERVATION_MARKS_UNATTENDED.sql` | Idéntico a `0014` |
| `supabase/SQL_REALTIME_PEDIDOS_OBSERVACIONES.sql` | Idéntico a `0015` |
| `supabase/SQL_OBSERVATION_PENDING_WITHOUT_ORDERS.sql` | Idéntico a `0016` |
| `supabase/SQL_PASSWORD_BORRADO.sql` | Semilla operativa de `app_secrets` (`table_deletion`) — **no es migración** |
| `supabase/SQL_TEXT_FONT_SIZE.sql` | Idéntico a `0012` (antes en raíz) |
| `supabase/SQL_ORDER_ITEM_ATTENDED.sql` | Idéntico a `0013` (antes en raíz) |

Estos scripts sugieren que en el proyecto original parte del esquema se aplicó **manualmente** en el SQL Editor, no solo vía CLI de migraciones.

### 1.3 Edge Functions

| Función | Notas |
|---------|-------|
| `supabase/functions/create-user/index.ts` | Crea usuario Auth + actualiza `profiles` con service role; exige sesión ADMIN + `verify_app_secret('user_management', …)` |

### 1.4 Configuración ausente / incompleta

- **No existe** `supabase/config.toml` → el proyecto no está inicializado como stack local completo de Supabase CLI.
- **No existe** `supabase/seed.sql` versionado (más allá del seed embebido en `0001`).
- README aún describe flujo antiguo (solo `0001`, roles `WAITER`/`MANAGER`).
- Dominio interno de auth aún apunta a marca origen: `usuarios.salachocolatte.app` (frontend + Edge Function).

---

## 2. Evolución del esquema (inicial → estado final implícito)

### 2.1 Esquema inicial (`0001`)

**Enums:** `app_role(ADMIN,WAITER,BARTENDER,MANAGER)`, `table_shape`, `floor_element_kind(wall,zone,door)`, `order_status`, `order_item_status`.

**Tablas:** `profiles`, `floor_plans`, `floor_plan_elements`, `tables`, `product_categories`, `products`, `orders`, `order_items`.

**Funciones/triggers clave:** `set_updated_at`, `handle_new_user` (SECURITY DEFINER; rol desde metadata), `current_role`, `is_manager`, `replace_floor_plan_snapshot` (INVOKER; borraba y recreaba mesas).

**RLS:** autenticados leen casi todo; escritura de planos/catálogo vía `is_manager`; pedidos/ítems insertables por el propio usuario.

**Realtime:** `orders`, `order_items`, `tables`, `floor_plans`.

**Seed:** categorías Alcohol/Refrescos y productos de ejemplo.

### 2.2 Modificaciones posteriores (cadena lógica)

1. **Persistencia de plano (`0002`):** mesas con `type`/`attended`; elementos `text`; snapshot upsert por `id`; pedidos `ON DELETE CASCADE` desde mesas.
2. **Seguridad de altas (`0003`):** rol forzado a `WAITER`; tabla `app_secrets` (RLS on + revoke anon/authenticated).
3. **Modelo operativo ADMIN/USER (`0004`):** enum reducido; políticas: USER lectura; ADMIN escritura; RPCs `set_table_attended`, `assign_products_to_table`, `delete_table_with_orders`; `floor_plans.is_locked`.
4. **Login por username (`0005`)**.
5. **pgcrypto en `extensions` (`0006`)**.
6. **Atendido → PLACED (`0007_mark…`)** y **precio nullable (`0007_product…`)**.
7. **Catálogo seguro (`0008` → endurecido en `0010`)**.
8. **Re-pedido pendiente (`0009` → sustituido conceptualmente por `0013`)**.
9. **Observaciones (`0011` → `0014` → `0016`)**.
10. **`font_size` (`0012`)**.
11. **`order_items.attended` + histórico (`0013`)**.
12. **Realtime reforzado (`0015`)**.

### 2.3 Estado final implícito (si se aplican 0001…0016 en orden)

#### Tablas y columnas relevantes

| Tabla | Columnas / notas |
|-------|------------------|
| `profiles` | `id`, `full_name`, `role` (`ADMIN`\|`USER`, default `USER`), `username`, timestamps |
| `app_secrets` | `secret_key`, `secret_hash`, … (sin grants a clientes) |
| `floor_plans` | + `is_locked` |
| `floor_plan_elements` | kinds incl. `text`; + `font_size` (8–120) |
| `tables` | + `type`, `attended`, `observation`; replica identity FULL |
| `products` | `price` nullable |
| `orders` / `order_items` | + `order_items.attended` NOT NULL default false; `order_items` replica identity FULL |

#### Funciones públicas esperadas (versión final)

| Función | Seguridad | Quién puede |
|---------|-----------|-------------|
| `current_role` / `is_admin` / `is_manager` (alias) | DEFINER | lectura rol del caller |
| `handle_new_user` | DEFINER trigger | inserta profile `USER` |
| `replace_floor_plan_snapshot` | INVOKER | sujeto a RLS (ADMIN write) |
| `verify_app_secret` | DEFINER | solo ADMIN; boolean |
| `set_table_attended` | DEFINER | ADMIN y USER |
| `assign_products_to_table` | DEFINER | solo ADMIN |
| `delete_table_with_orders` | DEFINER | ADMIN + secreto `table_deletion` |
| `set_table_observation` | DEFINER | solo ADMIN |
| `product_has_order_history` / `category_has_order_history` | DEFINER | solo ADMIN |
| `delete_product_safe` / `delete_category_safe` | DEFINER | solo ADMIN; permite borrar si no hay PENDING/PLACED |

#### Realtime esperado

Publicación `supabase_realtime`: al menos `orders`, `order_items`, `tables`, `floor_plans` (añadidas en `0001`; `0015` reafirma `tables` y `order_items` de forma idempotente).  
`REPLICA IDENTITY FULL` en `tables` y `order_items` (necesario para que el cliente compare `old.observation` / cambios de `attended`).

---

## 3. Dependencias, orden y conflictos

### 3.1 Orden lexicográfico CLI (Supabase)

Con el prefijo actual, el orden de aplicación sería:

`0001` → `0002` → `0003` → `0004` → `0005` → `0006` → **`0007_mark_items…`** → **`0007_product_price…`** → `0008` … → `0016`.

Ambas `0007` son independientes entre sí (una toca función, otra columna); en este caso el orden relativo **no rompe** el esquema, pero:

- La numeración duplicada **rompe la convención** de historial único.
- En bases ya migradas con otro nombre/hash, reaplicar puede generar filas conflictivas en `supabase_migrations.schema_migrations`.
- **Recomendación:** renombrar antes de cualquier reconstrucción limpia, p.ej. `0007_mark…` y `0007a`/`0007_1`/`0007b_product_price…` → idealmente `0007` y `0007_1` o resecuenciar a `0007`/`0008` y desplazar el resto (**solo tras autorización** y en copia local).

### 3.2 Dependencias duras

| Objeto | Depende de |
|--------|------------|
| Todo RLS post-`0004` | `is_admin` / `current_role` |
| `verify_app_secret` / borrado | `app_secrets` + `extensions.crypt` |
| `assign_products` / `set_table_attended` (`0013`) | columna `order_items.attended` |
| Observaciones Realtime Angular | `tables.observation` + replica identity FULL |
| Edge `create-user` | `profiles.username`, `verify_app_secret`, secreto `user_management`, service role |

### 3.3 Conflictos / riesgos de doble aplicación

1. **`SQL_CATALOG_DELETE_REFRESH.sql`** reintroduce la lógica antigua de `0008` (bloquea si existe *cualquier* `order_items`). Si alguien lo ejecuta después de `0010`, **regresiona** el comportamiento del catálogo.
2. Scripts raíz `SQL_*.sql` y copias en `supabase/SQL_*.sql` invitan a ejecutar SQL fuera de banda → divergencia respecto a `schema_migrations`.
3. `0001` hace `alter publication … add table` sin guarda; en un proyecto que ya tenga esas tablas publicadas, **falla**. `0015` sí es idempotente para `tables`/`order_items`, pero no para `orders`/`floor_plans`.
4. `0012` añade constraint `floor_plan_elements_font_size_check` **sin** `IF NOT EXISTS`; re-ejecutar el archivo a mano falla.
5. `SQL_PASSWORD_BORRADO.sql` usa `crypt()`/`gen_salt()` sin esquema `extensions.` → puede fallar según `search_path` del SQL Editor.

### 3.4 Transacciones

- `0013` envuelve en `BEGIN`/`COMMIT` (adecuado).
- El resto son scripts sueltos; un fallo a mitad deja estado parcial si se ejecutan a mano.

---

## 4. Posibles objetos faltantes respecto a la BD original

Sin inspección remota **no se puede afirmar** el delta exacto. Indicios locales de posibles gaps:

| Indicio | Implicación |
|---------|-------------|
| `database.types.ts` declara tabla `reservations` | Legacy mencionada en `0004`; **no se crea** en migraciones TableFlow. Si la original aún la tiene, aquí no se recreará. |
| `SQL_PASSWORD_BORRADO.sql` fuera de migraciones | Secretos `table_deletion` (y probablemente `user_management`) existen en prod original pero **no** en el historial versionado. |
| README + scripts SQL manuales | La original pudo recibir parches no capturados o en orden distinto. |
| Dominio `usuarios.salachocolatte.app` | Usuarios Auth de la original no son transferibles 1:1 a un proyecto Supabase nuevo (Auth es por proyecto). |
| Seed de catálogo en `0001` | La original puede tener catálogo distinto; no hay dump de datos. |
| Ausencia de `config.toml` / políticas Auth Dashboard | Ajustes de Auth (confirmación email, redirect URLs, rate limits) no están en repo. |

**Acción recomendada (requiere autorización explícita, solo lectura):** exportar inventario de la BD original (`pg_dump --schema-only`, listado de funciones, políticas, publicación Realtime, filas de `app_secrets` **sin** hashes en claro) y comparar con este estado implícito. **No ejecutar escritura.**

---

## 5. Funciones, triggers, RLS y Realtime

### 5.1 Triggers

| Trigger | Tabla | Función |
|---------|-------|---------|
| `*_updated` | profiles, floor_plans, elements, tables, categories, products, orders, order_items | `set_updated_at` |
| `on_auth_user_created` | `auth.users` | `handle_new_user` |

No hay trigger que sincronice `username` desde metadata en altas Auth; la Edge Function actualiza `profiles` tras `createUser`.

### 5.2 Matriz RLS (post-`0004`)

| Tabla | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|---------------------|
| `profiles` | self o ADMIN | UPDATE solo ADMIN; sin INSERT de cliente |
| `floor_plans` / elements / `tables` | authenticated | solo ADMIN |
| `product_categories` / `products` | authenticated | solo ADMIN |
| `orders` / `order_items` | authenticated | solo ADMIN |
| `app_secrets` | RLS on + **REVOKE** a anon/authenticated | sin policies de cliente |

**Cambio de modelo:** en `0001` un camarero podía insertar pedidos/ítems; desde `0004` la operativa de escritura de pedidos pasa por **RPC SECURITY DEFINER** (`assign_products_to_table`) restringida a ADMIN. USER solo puede marcar atendido vía `set_table_attended`. Esto **coincide** con el UI Angular (`isAdmin` para altas).

### 5.3 Realtime vs Angular

`OrderNotificationService` escucha:

- `order_items` `*` → alerta si `status=PENDING` y `attended !== true`
- `tables` `UPDATE` → alerta por cambio de `observation` (necesita `old`) o `attended` → false

Requisitos DB: publicación + `REPLICA IDENTITY FULL` en ambas tablas. Cubierto por `0001`/`0011`/`0015`/`0016` en el historial local.

`plan-editor` también se suscribe a cambios de pedidos para colores de mesa.

---

## 6. Hallazgos de seguridad

### 6.1 Severidad alta / media

| ID | Hallazgo | Detalle |
|----|----------|---------|
| S1 | **Asignación de rol vía service role en Edge Function** | Patrón correcto *si* la función valida ADMIN + secreto. Riesgo residual: service role mal desplegado o filtrado. No debe llegar al browser. |
| S2 | **CORS `Access-Control-Allow-Origin: *`** en `create-user` | Amplio; mitigado por Bearer JWT + chequeos, pero facilita llamadas cross-origin. Preferible restringir orígenes de TableFlow. |
| S3 | **Dominio interno legado** | `usuarios.salachocolatte.app` acopla Auth a marca ajena; en proyecto nuevo debe cambiarse de forma coordinada frontend + función (usuarios existentes quedarían con emails técnicos viejos). |
| S4 | **Secretos no versionados** | Sin filas `user_management` / `table_deletion`, alta de usuarios y borrado de mesas fallan en runtime. Deben sembrarse **por entorno** (nunca committear contraseñas). |
| S5 | **`SQL_CATALOG_DELETE_REFRESH.sql` regresivo** | Puede reabrir/bloquear comportamiento incorrecto si se aplica a mano. |
| S6 | **SELECT amplio para todo `authenticated`** | Cualquier usuario autenticado ve pedidos, mesas, perfiles (ADMIN ve todos; USER ve el suyo + datos operativos). Aceptable para app de personal interno; inadecuado si hubiera multi-tenant público. |

### 6.2 SECURITY DEFINER — revisión

Buenas prácticas presentes:

- `set search_path = public` (o `public, extensions` / `public, pg_temp`) en DEFINER.
- Comprobación de `auth.uid()` y rol antes de mutar.
- `REVOKE ALL … FROM public` + `GRANT EXECUTE TO authenticated` en RPC sensibles.
- `handle_new_user` **ya no** toma rol del metadata (`0003`/`0004`).

Riesgos residuales:

| Función | Nota |
|---------|------|
| `set_table_attended` | Cualquier USER puede marcar **cualquier** mesa (no hay ownership). Diseño intencional. |
| `assign_products_to_table` / deletes | Bypass RLS por DEFINER; la autorización es solo el `IF` interno — correcto si no se debilitan. |
| `verify_app_secret` | Expone oracle boolean a ADMIN (fuerza bruta de secreto de administración). Mitigar con rate limit Auth / no reutilizar secretos cortos. |
| `replace_floor_plan_snapshot` | INVOKER: bien. Si un ADMIN llama con JSON malicioso, puede borrar mesas del plano (cascada a pedidos). |

### 6.3 Escalada de privilegios

- Auto-registro Auth → profile siempre `USER` → **no** hay auto-ADMIN.
- Primer ADMIN debe promoverse por SQL Dashboard (`update profiles set role='ADMIN'…`) — documentado en `supabase/README.md`.
- Un ADMIN puede crear otro ADMIN vía Edge Function si conoce `user_management` — esperado; proteger ese secreto.

### 6.4 Datos sensibles

- Hashes en `app_secrets` (bcrypt vía pgcrypto). Tabla inaccesible a roles cliente.
- Contraseñas de borrado/admin viajan en RPC/body de función: usar HTTPS (Supabase) y no loguear payloads.

---

## 7. Alineación con Angular

| Capacidad UI / servicio | Objeto DB requerido | ¿Cubierto por migraciones? |
|-------------------------|---------------------|----------------------------|
| Login username | `profiles.username` + email interno | Sí (`0005` + convención app) |
| Roles ADMIN/USER | enum + RLS | Sí (`0004`) |
| Guardar plano / font_size | `replace_floor_plan_snapshot` + `font_size` | Sí (`0012`) |
| Lock plano | `is_locked` | Sí (`0004`) |
| Asignar productos | `assign_products_to_table` (ADMIN) | Sí (`0013` final) |
| Atender mesa | `set_table_attended` | Sí (`0013`) |
| Observaciones | `set_table_observation` + Realtime old | Sí (`0016` + `0015`) |
| Borrado mesa | `delete_table_with_orders` + secreto | Función sí; **semilla secreto no** |
| Catálogo CRUD/delete | tablas + RPC `*_safe` / `*_has_order_history` | Sí (`0010`) |
| Crear usuario | Edge `create-user` + `user_management` | Código sí; **secreto y deploy no versionados** |
| Tipos `reservations` | tabla | **No** (tipo huérfano) |
| `database.types.ts` con `Row: any` | — | Tipado débil; no bloquea, no valida esquema |

**Inconsistencia documental:** README aún habla de ejecutar solo `0001` y roles WAITER/MANAGER — **desactualizado** respecto al código y a `0004+`.

---

## 8. Plan de reconstrucción (sin ejecutar — requiere autorización)

### Fase A — Preparación (solo lectura / local)

1. Inventariar (con autorización) el esquema real de Sala Chocolatte / CreadorSala: enums, tablas, funciones, policies, publication, extensions.
2. Diff contra el estado implícito de este repo.
3. Decidir dominio Auth de TableFlow (reemplazar `usuarios.salachocolatte.app`).
4. Crear **proyecto Supabase nuevo** vacío para TableFlow (no reutilizar el de Sala Chocolatte).
5. Añadir `supabase/config.toml` (`supabase init`) en el repo cuando se autorice modificar archivos.
6. Resolver colisión `0007_*` y retirar o archivar SQL complementarios obsoletos (`SQL_CATALOG_DELETE_REFRESH`, duplicados) para evitar ejecución accidental.

### Fase B — Local

1. `supabase start` (Docker local) — **no** `--linked` contra producción.
2. Aplicar migraciones en orden (`supabase db reset` **solo local**).
3. Desplegar Edge Function en el stack local.
4. Sembrar `app_secrets` (`table_deletion`, `user_management`) con valores de entorno local (plantilla tipo `SQL_PASSWORD_BORRADO`, corregida a `extensions.crypt`).
5. Crear primer usuario Auth + `UPDATE profiles SET role='ADMIN'`.
6. Apuntar `environment.ts` local a URL/anon key locales.
7. Ejecutar batería de pruebas §9.

### Fase C — Proyecto remoto TableFlow (nuevo)

1. Autorización explícita del responsable.
2. Vincular CLI al proyecto **TableFlow** (nunca al de Sala Chocolatte).
3. Push de migraciones / SQL Editor en el mismo orden auditado.
4. Deploy `create-user` con secrets de plataforma (service role solo en función).
5. Sembrar secretos de app; promover primer ADMIN.
6. Configurar Auth (Email provider, redirect URLs TableFlow).
7. Verificar Realtime publication + replica identity.
8. Smoke test con build Angular apuntando al nuevo proyecto.
9. **Prohibido:** `db reset --linked`, `db push` hacia Sala Chocolatte, o cualquier escritura en la BD original.

### Fase D — Datos

- Migrar **datos** (planos, catálogo, usuarios) es un proyecto aparte: Auth users no se copian con `pg_dump` simple; requiere estrategia de export/import o recreación.
- No mezclar `auth.users` entre proyectos sin procedimiento documentado.

---

## 9. Plan de pruebas

### 9.1 Integridad

- [ ] Enums finales: `app_role`, `table_type`, `floor_element_kind` incluye `text`.
- [ ] FK: borrar mesa con pedidos OPEN cascada; índice único un OPEN por mesa.
- [ ] Snapshot: guardar plano conserva `id` de mesas y pedidos; elimina mesas quitadas del JSON.
- [ ] `font_size` default 22 en textos; check 8–120.
- [ ] `order_items.attended`: PLACED históricos `true`; nuevo assign no muta líneas ya atendidas; crea PENDING nueva.
- [ ] Observación no vacía → `attended=false`; observación vacía no altera `attended`.
- [ ] Catálogo: producto solo con líneas CANCELLED se puede borrar; con PENDING/PLACED no.

### 9.2 Seguridad

- [ ] Usuario `USER` no puede INSERT/UPDATE directo en `orders`/`order_items`/`products` (error RLS).
- [ ] `USER` sí ejecuta `set_table_attended`; no ejecuta `assign_products_to_table` / `set_table_observation` / deletes.
- [ ] `verify_app_secret` false para no-ADMIN; true solo con secreto correcto.
- [ ] `app_secrets` no legible vía PostgREST como authenticated.
- [ ] Signup/metadata no produce ADMIN.
- [ ] `create-user` rechaza sin JWT, sin rol ADMIN, sin `admin_password` correcto.
- [ ] Service role key ausente del bundle Angular.

### 9.3 Realtime / Angular

- [ ] Alta de producto (ADMIN) dispara diálogo USER de nuevos pedidos.
- [ ] Cambio de observación dispara aviso de observación (no doble con attended).
- [ ] Payload Realtime incluye `old.observation` (replica identity).
- [ ] Login por username → email interno del dominio TableFlow.
- [ ] Flujo ADMIN: planos, catálogo, usuarios, borrado con contraseña.
- [ ] Flujo USER: listado operativo, atender, lectura observación; sin botones de escritura admin.

### 9.4 Compatibilidad de despliegue

- [ ] `npm test` / `npm run build` con environments del proyecto nuevo.
- [ ] Edge Function desplegada y reachable desde `functions.invoke('create-user')`.
- [ ] Documentación README alineada (dejar de pedir solo `0001` y roles WAITER).

---

## 10. Resumen ejecutivo

| Área | Veredicto |
|------|-----------|
| Cadena de migraciones | Coherente en lógica acumulada hasta `0016`, con **colisión 0007** y SQL manual duplicado/obsoleto |
| Paridad con BD original | **No verificada**; indicios de objetos/secretos/legacy fuera de migraciones |
| RLS / DEFINER | Modelo ADMIN/USER razonable; DEFINER bien acotados en general |
| Realtime | Alineado con Angular si se aplican `0011`–`0016` |
| Listo para TableFlow | **No sin** config local, secretos, dominio Auth, deploy función y validación vs original |
| Riesgo a Sala Chocolatte | Evitable si se usa **solo** proyecto nuevo y se prohíbe link/push a la original |

### Próximos pasos que requieren tu autorización

1. Generar/actualizar `supabase/config.toml` y reordenar/renombrar `0007_*`.
2. Auditoría **solo lectura** del esquema remoto original (inventario diff).
3. `supabase start` + `db reset` **local** para validar la cadena.
4. Semillas de `app_secrets` y cambio de dominio Auth a marca TableFlow.
5. Cualquier `db push` / deploy remoto al proyecto TableFlow.

**No se ha ejecutado ninguna de estas operaciones en esta auditoría.**

---

## Anexo A — Mapa rápido objeto → migración introductora / última versión

| Objeto | Introducido | Última definición relevante |
|--------|-------------|-----------------------------|
| Esquema base | `0001` | — |
| `tables.type/attended` | `0002` | — |
| `app_secrets` / verify | `0003` | `0006` |
| Roles ADMIN/USER + RLS | `0004` | — |
| RPCs attended/assign/delete | `0004` | `0013` (attended/assign), `0006` (delete) |
| `username` | `0005` | — |
| Catálogo RPC | `0008` | `0010` |
| `observation` | `0011` | `0016` (función) |
| `font_size` | `0012` | `0012` (snapshot) |
| `order_items.attended` | `0013` | `0013` |
| Realtime refuerzo | `0015` | `0015` |

## Anexo B — Archivos a no ejecutar en reconstrucción limpia

- `supabase/SQL_CATALOG_DELETE_REFRESH.sql` (regresivo)
- Duplicados idénticos a migraciones (ruido; preferir solo `migrations/`)
- `SQL_PASSWORD_BORRADO.sql` tal cual (placeholder; adaptar a `extensions.*` y secretos reales **fuera de git**)

---

*Informe generado por auditoría estática. Cualquier acción sobre bases de datos o modificación de migraciones queda pendiente de autorización explícita.*
