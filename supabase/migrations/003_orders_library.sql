-- Criativarts: pedidos, itens e biblioteca digital
-- Execute no SQL Editor após 001_products.sql e 002_profiles.sql

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'refunded', 'failed', 'expired')),
  currency text not null default 'BRL' check (char_length(currency) = 3),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total numeric(10, 2) not null check (total >= 0),
  customer_email text,
  -- Campos reservados para gateway (Mercado Pago) — preenchidos depois
  payment_provider text,
  payment_id text,
  preference_id text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_payment_id_idx on public.orders (payment_id)
  where payment_id is not null;
create index if not exists orders_preference_id_idx on public.orders (preference_id)
  where preference_id is not null;

comment on table public.orders is 'Pedidos do cliente; pagamento será ligado depois (Mercado Pago)';
comment on column public.orders.metadata is 'Dados extras do checkout/gateway (JSON)';

-- ---------------------------------------------------------------------------
-- order_items (snapshot do produto no momento da compra)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null references public.products (id) on delete restrict,
  product_name text not null,
  product_slug text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

comment on table public.order_items is 'Itens do pedido com snapshot de nome/preço';

-- ---------------------------------------------------------------------------
-- user_library (acesso vitalício a produtos digitais após pagamento)
-- ---------------------------------------------------------------------------
create table if not exists public.user_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  order_item_id uuid references public.order_items (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists user_library_user_id_idx on public.user_library (user_id);
create index if not exists user_library_user_status_idx
  on public.user_library (user_id, status);
create index if not exists user_library_product_id_idx on public.user_library (product_id);
create index if not exists user_library_order_id_idx on public.user_library (order_id);

comment on table public.user_library is 'Biblioteca digital: produtos liberados ao usuário após order paid';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
  before update on public.order_items
  for each row
  execute function public.set_updated_at();

drop trigger if exists user_library_set_updated_at on public.user_library;
create trigger user_library_set_updated_at
  before update on public.user_library
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Função interna: libera biblioteca a partir de um pedido pago
-- (chamada futura pelo webhook/service role — não pelo client)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.user_library enable row level security;

-- orders: usuário só vê / cria os próprios
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own pending orders" on public.orders;
create policy "Users can create own pending orders"
  on public.orders
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

-- order_items: acesso via ownership do pedido
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert items on own pending orders" on public.order_items;
create policy "Users can insert items on own pending orders"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and o.status = 'pending'
    )
  );

-- user_library: somente leitura do próprio acervo
-- gravação apenas via security definer / service role
drop policy if exists "Users can read own library" on public.user_library;
create policy "Users can read own library"
  on public.user_library
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;
revoke all on table public.user_library from anon;

grant select, insert on table public.orders to authenticated;
grant select, insert on table public.order_items to authenticated;
grant select on table public.user_library to authenticated;
