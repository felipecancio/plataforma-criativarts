-- ---------------------------------------------------------------------------
-- Correção: garantir order_items + liberar user_library para pedidos paid.
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ---------------------------------------------------------------------------

-- 1) Política: dono vê produto adquirido mesmo se inativo na loja
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

-- 2) grant_library: se order_items estiver vazio, recria a partir de metadata.product_ids
create or replace function public.grant_library_from_paid_order(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_inserted integer := 0;
  v_item_count integer := 0;
  v_product_id text;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_order.status is distinct from 'paid' then
    raise exception 'Order % must be paid to grant library access', p_order_id;
  end if;

  select count(*) into v_item_count
  from public.order_items
  where order_id = v_order.id;

  -- Recuperação: pedidos paid sem itens (falha antiga no insert)
  if v_item_count = 0 and jsonb_typeof(v_order.metadata -> 'product_ids') = 'array' then
    for v_product_id in
      select jsonb_array_elements_text(v_order.metadata -> 'product_ids')
    loop
      insert into public.order_items (
        order_id,
        product_id,
        product_name,
        product_slug,
        unit_price,
        quantity,
        line_total
      )
      select
        v_order.id,
        p.id,
        p.name,
        p.slug,
        p.price,
        1,
        p.price
      from public.products p
      where p.id = v_product_id
      on conflict (order_id, product_id) do nothing;
    end loop;
  end if;

  insert into public.user_library (
    user_id,
    product_id,
    order_id,
    order_item_id,
    status,
    granted_at
  )
  select
    v_order.user_id,
    oi.product_id,
    v_order.id,
    oi.id,
    'active',
    coalesce(v_order.paid_at, now())
  from public.order_items oi
  where oi.order_id = v_order.id
  on conflict (user_id, product_id) do update
    set
      status = 'active',
      order_id = excluded.order_id,
      order_item_id = excluded.order_item_id,
      granted_at = excluded.granted_at,
      updated_at = now();

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.grant_library_from_paid_order(uuid) from public;
revoke all on function public.grant_library_from_paid_order(uuid) from anon, authenticated;

-- 3) record_order_payment com liberação automática
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

-- 4) Sync para o usuário autenticado (usado pela página Minha Biblioteca)
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

-- 5) BACKFILL imediato: todos os pedidos já paid → user_library
do $$
declare
  r record;
  n integer;
begin
  for r in
    select id from public.orders where status = 'paid'
  loop
    n := public.grant_library_from_paid_order(r.id);
    raise notice 'order % → % biblioteca rows', r.id, n;
  end loop;
end $$;
