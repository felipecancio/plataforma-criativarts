-- ---------------------------------------------------------------------------
-- DIAGNÓSTICO + BACKFILL FORÇADO da biblioteca
-- Cole no SQL Editor do Supabase e rode TUDO de uma vez.
-- No final, a query de resultado deve mostrar linhas em user_library.
-- ---------------------------------------------------------------------------

-- A) Diagnóstico (veja o resultado desta query)
select
  (select count(*) from public.orders where status = 'paid') as pedidos_paid,
  (select count(*) from public.order_items oi
     join public.orders o on o.id = oi.order_id
     where o.status = 'paid') as itens_em_pedidos_paid,
  (select count(*) from public.user_library) as linhas_biblioteca;

-- B) Detalhe dos pedidos paid
select
  o.id,
  o.status,
  o.user_id,
  o.total,
  o.metadata,
  (select count(*) from public.order_items oi where oi.order_id = o.id) as qtd_itens
from public.orders o
where o.status = 'paid'
order by o.created_at desc;

-- C) Recria order_items a partir de metadata.product_ids quando estiver vazio
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
  o.id,
  p.id,
  p.name,
  p.slug,
  p.price,
  1,
  p.price
from public.orders o
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(o.metadata -> 'product_ids') = 'array'
      then o.metadata -> 'product_ids'
    else '[]'::jsonb
  end
) as pid(product_id)
join public.products p on p.id = pid.product_id
where o.status = 'paid'
  and not exists (
    select 1 from public.order_items oi where oi.order_id = o.id
  )
on conflict (order_id, product_id) do nothing;

-- D) Backfill direto user_library (não depende de função)
insert into public.user_library (
  user_id,
  product_id,
  order_id,
  order_item_id,
  status,
  granted_at
)
select
  o.user_id,
  oi.product_id,
  o.id,
  oi.id,
  'active',
  coalesce(o.paid_at, timezone('utc', now()))
from public.orders o
join public.order_items oi on oi.order_id = o.id
where o.status = 'paid'
on conflict (user_id, product_id) do update
set
  status = 'active',
  order_id = excluded.order_id,
  order_item_id = excluded.order_item_id,
  granted_at = excluded.granted_at,
  updated_at = timezone('utc', now());

-- E) Resultado final (PRECISA ter count > 0 se houver pedido paid com itens)
select
  (select count(*) from public.order_items oi
     join public.orders o on o.id = oi.order_id
     where o.status = 'paid') as itens_apos_backfill,
  (select count(*) from public.user_library) as biblioteca_apos_backfill;

select * from public.user_library order by granted_at desc;
