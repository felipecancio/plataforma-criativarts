-- ---------------------------------------------------------------------------
-- Pós-pagamento: liberar user_library quando o pedido for paid/approved.
-- (Mantido; use 006_fix_library_grant_backfill.sql se a biblioteca não populou.)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read owned products" on public.products;
create policy "Users can read owned products"
  on public.products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_library ul
      where ul.product_id = products.id
        and ul.user_id = auth.uid()
        and ul.status = 'active'
    )
  );

create or replace function public.record_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_mp_status text,
  p_mp_status_detail text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_new_status text;
  v_paid_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_order.status = 'paid' then
    perform public.grant_library_from_paid_order(p_order_id);
    return v_order;
  end if;

  if p_mp_status = 'approved' then
    v_new_status := 'paid';
    v_paid_at := timezone('utc', now());
  elsif p_mp_status in ('rejected', 'cancelled') then
    v_new_status := 'pending';
    v_paid_at := null;
  else
    v_new_status := 'pending';
    v_paid_at := null;
  end if;

  update public.orders
  set
    payment_id = p_payment_id,
    payment_provider = coalesce(payment_provider, 'mercadopago'),
    status = v_new_status,
    paid_at = case
      when v_new_status = 'paid' then coalesce(paid_at, v_paid_at)
      else paid_at
    end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'mp_status', p_mp_status,
      'mp_status_detail', p_mp_status_detail,
      'last_payment_id', p_payment_id
    )
  where id = p_order_id
  returning * into v_order;

  if v_new_status = 'paid' then
    perform public.grant_library_from_paid_order(p_order_id);
  end if;

  return v_order;
end;
$$;

revoke all on function public.record_order_payment(uuid, text, text, text) from public;
grant execute on function public.record_order_payment(uuid, text, text, text) to authenticated;

comment on function public.record_order_payment is
  'Registra pagamento MP; se approved, marca paid e libera user_library.';

create or replace function public.sync_my_paid_orders_library()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  total integer := 0;
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  for r in
    select id
    from public.orders
    where user_id = auth.uid()
      and status = 'paid'
  loop
    n := public.grant_library_from_paid_order(r.id);
    total := total + coalesce(n, 0);
  end loop;

  return total;
end;
$$;

revoke all on function public.sync_my_paid_orders_library() from public;
grant execute on function public.sync_my_paid_orders_library() to authenticated;

comment on function public.sync_my_paid_orders_library is
  'Garante user_library a partir dos pedidos paid do usuário (idempotente).';
