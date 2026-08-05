-- ---------------------------------------------------------------------------
-- Webhook Mercado Pago: finalizar pedido sem sessão de usuário
-- (service_role apenas). approved → paid + biblioteca; demais → não libera.
-- ---------------------------------------------------------------------------

-- Permite que o webhook (service role) chame a liberação existente.
grant execute on function public.grant_library_from_paid_order(uuid) to service_role;

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
declare
  v_order public.orders%rowtype;
  v_new_status text;
  v_paid_at timestamptz;
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

  -- Já pago: reforça biblioteca (idempotente) e atualiza refs do pagamento.
  if v_order.status = 'paid' then
    update public.orders
    set
      payment_id = coalesce(payment_id, p_payment_id),
      payment_provider = coalesce(payment_provider, 'mercadopago'),
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
    -- pending / in_process / rejected / cancelled → NÃO libera biblioteca
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

revoke all on function public.finalize_order_from_mercadopago(uuid, text, text, text) from public;
revoke all on function public.finalize_order_from_mercadopago(uuid, text, text, text) from anon, authenticated;
grant execute on function public.finalize_order_from_mercadopago(uuid, text, text, text) to service_role;

comment on function public.finalize_order_from_mercadopago is
  'Webhook MP: approved → paid + user_library; pending/rejected não liberam.';
