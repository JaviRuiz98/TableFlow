-- =============================================================================
-- 0032_close_order_on_table_attended.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- When a mesa/reservado is marked attended, the open order is CLOSED so
-- dashboard "Actividad reciente" / pedidos atendidos match sala operativa.
-- New products via assign_products_to_table still open a fresh OPEN order.
-- =============================================================================

create or replace function public.set_table_attended(
  p_table_id uuid,
  p_attended boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
     or public.current_role() not in ('ADMIN', 'USER', 'RECEPTOR') then
    raise exception 'No autorizado';
  end if;

  if not public.table_belongs_to_current_company(p_table_id) then
    raise exception 'Mesa no encontrada o de otra empresa';
  end if;

  update public.tables
     set attended = p_attended,
         updated_at = now()
   where id = p_table_id;

  if p_attended then
    update public.order_items oi
       set status = 'PLACED',
           attended = true,
           placed_by = auth.uid(),
           placed_at = coalesce(oi.placed_at, now()),
           updated_at = now()
      from public.orders o
     where oi.order_id = o.id
       and o.table_id = p_table_id
       and o.status = 'OPEN'
       and oi.status = 'PENDING'
       and oi.attended = false;

    update public.orders
       set status = 'CLOSED',
           updated_at = now()
     where table_id = p_table_id
       and status = 'OPEN';
  end if;
end;
$$;

comment on function public.set_table_attended(uuid, boolean) is
  'Mark table attended: place pending items and CLOSE open order. ADMIN|USER|RECEPTOR + same-company when helper exists.';

revoke all on function public.set_table_attended(uuid, boolean) from public;
grant execute on function public.set_table_attended(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
