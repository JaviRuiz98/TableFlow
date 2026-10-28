# Seed multiempresa (staging / local)

**No ejecutar en producción ni en Sala Chocolatte. Sin commit/push hasta revisión.**

## Archivos

| Archivo | Uso |
|---------|-----|
| `SEED_MULTIEMPRESA_STAGING.sql` | Insert idempotente adaptado al esquema post-0029 (Aurora / Eclipse / Nébula) |
| `SEED_CHOCOLATTE_DEV.sql` | Datos de ejemplo para la empresa ya existente **Sala Chocolatte** (`fjrh98@gmail.com`) |
| `SEED_MULTIEMPRESA_CHECKS.sql` | Aserciones KPI / roles / alineación tenant |
| `../../scripts/generate_multiempresa_seed.py` | Regenera el seed desde el zip de fixtures |

## Flujo seguro

1. Crear **9 usuarios Auth** (Admin API / Dashboard) con emails `@tableflow.test` listados en el header del seed. Sin metadata de registro de empresa.
2. Aplicar migraciones hasta `0029` en staging/local.
3. Revisar y luego ejecutar `SEED_MULTIEMPRESA_STAGING.sql` como `service_role` / `postgres`.
4. Ejecutar `SEED_MULTIEMPRESA_CHECKS.sql`.
5. (Pendiente tras tu OK) specs Vitest de aislamiento RLS/RPC.

## Arquitectura respetada

- `company_id` en `profiles`, `products`, `floor_plans`.
- Mesas / pedidos / líneas: tenant vía `tables → floor_plans.company_id` (y productos vía `products.company_id`).
