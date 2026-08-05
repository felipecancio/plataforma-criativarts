-- ---------------------------------------------------------------------------
-- grant_library_for_order: libera biblioteca com product_ids opcionais
-- (fallback quando order_items está vazio)
-- ---------------------------------------------------------------------------

create or replace function public.grant_library_for_order(
  p_order_id uuid,
  p_product_ids text[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_inserted integer := 0;
  v_item_count integer := 0;
  v_pid text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_order.status is distinct from 'paid' then
    raise exception 'order must be paid';
  end if;

  select count(*) into v_item_count
  from public.order_items
  where order_id = v_order.id;

  -- Recria itens a partir do array enviado pelo servidor
  if v_item_count = 0 and p_product_ids is not null then
    foreach v_pid in array p_product_ids
    loop
      insert into public.order_items (
        order_id, product_id, product_name, product_slug,
        unit_price, quantity, line_total
      )
      select
        v_order.id, p.id, p.name, p.slug, p.price, 1, p.price
      from public.products p
      where p.id = v_pid
      on conflict (order_id, product_id) do nothing;
    end loop;
  end if;

  -- Recria itens a partir do metadata do pedido
  if (select count(*) from public.order_items where order_id = v_order.id) = 0
     and jsonb_typeof(v_order.metadata -> 'product_ids') = 'array' then
    for v_pid in
      select jsonb_array_elements_text(v_order.metadata -> 'product_ids')
    loop
      insert into public.order_items (
        order_id, product_id, product_name, product_slug,
        unit_price, quantity, line_total
      )
      select
        v_order.id, p.id, p.name, p.slug, p.price, 1, p.price
      from public.products p
      where p.id = v_pid
      on conflict (order_id, product_id) do nothing;
    end loop;
  end if;

  insert into public.user_library (
    user_id, product_id, order_id, order_item_id, status, granted_at
  )
  select
    v_order.user_id,
    oi.product_id,
    v_order.id,
    oi.id,
    'active',
    coalesce(v_order.paid_at, timezone('utc', now()))
  from public.order_items oi
  where oi.order_id = v_order.id
  on conflict (user_id, product_id) do update
    set
      status = 'active',
      order_id = excluded.order_id,
      order_item_id = excluded.order_item_id,
      granted_at = excluded.granted_at,
      updated_at = timezone('utc', now());

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.grant_library_for_order(uuid, text[]) from public;
grant execute on function public.grant_library_for_order(uuid, text[]) to authenticated;

comment on function public.grant_library_for_order is
  'Libera user_library para pedido paid; aceita product_ids de fallback.';
