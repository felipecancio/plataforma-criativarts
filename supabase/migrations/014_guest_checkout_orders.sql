-- ---------------------------------------------------------------------------
-- Guest checkout: orders.user_id nullable + finalize sem exigir user
-- + helpers de claim e lookup de e-mail (service_role)
-- ---------------------------------------------------------------------------

-- 1) Permitir pedido sem usuário (guest) até claim pós-pagamento
alter table public.orders
  alter column user_id drop not null;

comment on column public.orders.user_id is
  'Dono do pedido; NULL enquanto guest paid aguarda criação/vínculo de conta.';

-- 2) grant_library: exige user_id (não grava NULL em user_library)
create or replace function public.grant_library_from_paid_order(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_inserted integer := 0;
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

  if v_order.user_id is null then
    -- Pedido pago guest ainda sem conta — não libera biblioteca.
    return 0;
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

-- 3) finalize: paid NÃO depende de user_id; library só se user_id existir
create or replace function public.finalize_order_from_mercadopago(
  p_order_id uuid,
  p_payment_id text,
  p_mp_status text,
  p_mp_status_detail text default null,
  p_customer_email text default null,
  p_link_user_id uuid default null
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
  v_email text;
begin
  if p_order_id is null or p_payment_id is null or p_mp_status is null then
    raise exception 'invalid webhook payload';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  v_email := nullif(trim(coalesce(p_customer_email, '')), '');

  -- Já pago: atualiza refs; vincula user se ainda NULL; reforça biblioteca.
  if v_order.status = 'paid' then
    update public.orders
    set
      payment_id = coalesce(payment_id, p_payment_id),
      payment_provider = coalesce(payment_provider, 'mercadopago'),
      customer_email = coalesce(customer_email, v_email),
      user_id = coalesce(user_id, p_link_user_id),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'mp_status', p_mp_status,
        'mp_status_detail', p_mp_status_detail,
        'last_payment_id', p_payment_id,
        'webhook_at', timezone('utc', now())
      )
    where id = p_order_id
    returning * into v_order;

    perform public.grant_library_from_paid_order(p_order_id);
    return v_order;
  end if;

  if p_mp_status = 'approved' then
    v_new_status := 'paid';
    v_paid_at := timezone('utc', now());
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
    customer_email = coalesce(customer_email, v_email),
    user_id = case
      when v_new_status = 'paid' then coalesce(user_id, p_link_user_id)
      else user_id
    end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'mp_status', p_mp_status,
      'mp_status_detail', p_mp_status_detail,
      'last_payment_id', p_payment_id,
      'webhook_at', timezone('utc', now())
    )
  where id = p_order_id
  returning * into v_order;

  if v_new_status = 'paid' then
    perform public.grant_library_from_paid_order(p_order_id);
  end if;

  return v_order;
end;
$$;

revoke all on function public.finalize_order_from_mercadopago(uuid, text, text, text, text, uuid) from public;
revoke all on function public.finalize_order_from_mercadopago(uuid, text, text, text, text, uuid) from anon, authenticated;
grant execute on function public.finalize_order_from_mercadopago(uuid, text, text, text, text, uuid) to service_role;

-- Manter overload antigo (4 args) chamando o novo, para não quebrar callers
create or replace function public.finalize_order_from_mercadopago(
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
begin
  return public.finalize_order_from_mercadopago(
    p_order_id,
    p_payment_id,
    p_mp_status,
    p_mp_status_detail,
    null,
    null
  );
end;
$$;

revoke all on function public.finalize_order_from_mercadopago(uuid, text, text, text) from public;
revoke all on function public.finalize_order_from_mercadopago(uuid, text, text, text) from anon, authenticated;
grant execute on function public.finalize_order_from_mercadopago(uuid, text, text, text) to service_role;

-- 4) Lookup seguro de usuário por e-mail (auth.users) — service_role only
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
revoke all on function public.find_user_id_by_email(text) from anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- 5) Claim atômico: vincula user + consome token + grant library
create or replace function public.claim_paid_guest_order(
  p_order_id uuid,
  p_token_hash text,
  p_user_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_hash text;
  v_expires text;
  v_consumed text;
begin
  if p_order_id is null or p_token_hash is null or p_user_id is null then
    raise exception 'invalid claim payload';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user profile not found';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.status is distinct from 'paid' then
    raise exception 'order not paid';
  end if;

  -- Já vinculado ao mesmo user: idempotente
  if v_order.user_id is not null then
    if v_order.user_id = p_user_id then
      perform public.grant_library_from_paid_order(p_order_id);
      return v_order;
    end if;
    raise exception 'order already claimed';
  end if;

  v_hash := v_order.metadata->>'claim_token_hash';
  v_expires := v_order.metadata->>'claim_expires_at';
  v_consumed := v_order.metadata->>'claim_consumed_at';

  if v_hash is null or v_hash is distinct from p_token_hash then
    raise exception 'invalid claim token';
  end if;

  if v_consumed is not null then
    raise exception 'claim token already used';
  end if;

  if v_expires is not null
     and (v_expires)::timestamptz < timezone('utc', now()) then
    raise exception 'claim token expired';
  end if;

  update public.orders
  set
    user_id = p_user_id,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'claim_consumed_at', timezone('utc', now())::text,
        'claimed_by', p_user_id::text
      )
  where id = p_order_id
  returning * into v_order;

  perform public.grant_library_from_paid_order(p_order_id);
  return v_order;
end;
$$;

revoke all on function public.claim_paid_guest_order(uuid, text, uuid) from public;
revoke all on function public.claim_paid_guest_order(uuid, text, uuid) from anon, authenticated;
grant execute on function public.claim_paid_guest_order(uuid, text, uuid) to service_role;

comment on function public.finalize_order_from_mercadopago(uuid, text, text, text, text, uuid) is
  'Webhook MP: approved → paid (mesmo sem user); library só com user_id.';
comment on function public.claim_paid_guest_order(uuid, text, uuid) is
  'Claim seguro de pedido guest paid → user_id + library.';
