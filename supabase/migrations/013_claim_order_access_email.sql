-- ---------------------------------------------------------------------------
-- Idempotência do e-mail de acesso (Resend): claim / mark / release
-- service_role apenas — não altera fluxo de pagamento.
-- ---------------------------------------------------------------------------

create or replace function public.claim_order_access_email(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  if p_order_id is null then
    raise exception 'invalid order id';
  end if;

  update public.orders
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'access_email_claimed_at', timezone('utc', now())::text
  )
  where id = p_order_id
    and status = 'paid'
    and metadata->>'access_email_sent_at' is null
    and (
      metadata->>'access_email_claimed_at' is null
      or (
        (metadata->>'access_email_claimed_at')::timestamptz
        < timezone('utc', now()) - interval '15 minutes'
      )
    )
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function public.mark_order_access_email_sent(
  p_order_id uuid,
  p_resend_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'access_email_sent_at', timezone('utc', now())::text,
      'access_email_id', p_resend_id
    )
    - 'access_email_claimed_at'
    - 'access_email_last_error'
  where id = p_order_id;
end;
$$;

create or replace function public.release_order_access_email_claim(
  p_order_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set metadata = (
      coalesce(metadata, '{}'::jsonb) - 'access_email_claimed_at'
    ) || case
      when p_error is null then '{}'::jsonb
      else jsonb_build_object('access_email_last_error', p_error)
    end
  where id = p_order_id
    and metadata->>'access_email_sent_at' is null;
end;
$$;

revoke all on function public.claim_order_access_email(uuid) from public;
revoke all on function public.claim_order_access_email(uuid) from anon, authenticated;
grant execute on function public.claim_order_access_email(uuid) to service_role;

revoke all on function public.mark_order_access_email_sent(uuid, text) from public;
revoke all on function public.mark_order_access_email_sent(uuid, text) from anon, authenticated;
grant execute on function public.mark_order_access_email_sent(uuid, text) to service_role;

revoke all on function public.release_order_access_email_claim(uuid, text) from public;
revoke all on function public.release_order_access_email_claim(uuid, text) from anon, authenticated;
grant execute on function public.release_order_access_email_claim(uuid, text) to service_role;

comment on function public.claim_order_access_email is
  'Resend: claim atômico do e-mail de acesso (evita duplicata).';
comment on function public.mark_order_access_email_sent is
  'Resend: marca e-mail de acesso como enviado.';
comment on function public.release_order_access_email_claim is
  'Resend: libera claim após falha (permite retry).';
