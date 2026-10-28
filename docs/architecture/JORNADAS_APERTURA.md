# Jornadas de apertura

## Modelo

Cada **jornada** es un `floor_plans` independiente:

- `name`, `opening_date`, `opens_at`, `closes_at`, `closes_next_day`, `status` (`scheduled` | `open` | `closed`)
- Propiedad: `company_id` (no `created_by`)
- Como máximo **una** jornada `open` por empresa (índice único parcial)
- Idempotencia blanda: único `(company_id, opening_date, lower(name))`

Mesas de la jornada (`tables`):

| reserved | Significado |
|----------|-------------|
| false | Disponible |
| true | Reservada |

Cuando llegan clientes ya han pedido botella: no hay flag `occupied`. El color operativo usa:

| Color | Condición |
|-------|-----------|
| Rojo | Pedido pendiente / observación sin atender |
| Verde | Mesa `attended` (botella puesta); al marcarla se cierra el pedido `OPEN` |
| Dorado | Reservada (etiqueta `RESERVADA`) |
| Negro | Libre |

`reserved` y `attended` son **estados actuales**, no historial. Los pedidos viven en `orders` / `order_items`.

## Flujos

1. **Crear jornada** — RPC `create_opening_jornada` (ADMIN): vacío o copia de geometría (UUIDs nuevos; `reserved` false; sin pedidos).
2. **Editar fecha/horario** — update de `opening_date` / `opens_at` / `closes_at` / `closes_next_day` desde Operativa (franja «Evento») o listado de planos.
3. **Reservar** — `set_table_reserved` (ADMIN/USER vía `is_admin()` post-0022).
4. **Atender** — `set_table_attended(true)`: ítems PENDING → PLACED y pedido `OPEN` → `CLOSED`.
5. **Traslado** — `transfer_table_content` misma jornada; bloquea destino reservado/con pedidos; mueve `orders` existentes.
6. **Abrir / cerrar** — `open_jornada` / `close_jornada` (ADMIN estricto). Jornada cerrada: sin editar snapshot ni operativa.

`replace_floor_plan_snapshot` **no** sobrescribe `reserved`.

## Migraciones

| Archivo | Contenido |
|---------|-----------|
| `0030_jornada_and_table_flags.sql` | Columnas jornada + reserved/occupied iniciales |
| `0031_jornada_operational_rpcs.sql` | RPCs operativas |
| `0032_close_order_on_table_attended.sql` | Atender cierra pedido |
| `0033_drop_table_occupied.sql` | Elimina `occupied` y `set_table_occupied` |

## Limitaciones (v1)

- Sin tabla de eventos de reserva → no hay historial exacto de reservas.
- Facturación del dashboard = suma `order_items.quantity * products.price` (sin snapshot de precio histórico en la línea).
- `is_active` se mantiene alineado con `status = open` por compatibilidad.
