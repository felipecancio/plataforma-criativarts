-- Criativarts: catálogo de produtos
-- Execute no SQL Editor do Supabase (Dashboard → SQL → New query)

create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text not null unique,
  quantity integer not null check (quantity > 0),
  style text not null default 'Halftone',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) not null check (compare_at_price >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  image text not null,
  gallery text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_slug_idx on public.products (slug);
create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order);

alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

-- Seed inicial (mesmo catálogo atual do site)
insert into public.products (
  id, name, slug, quantity, style, price, compare_at_price, sold_count, image, gallery, sort_order
) values
  (
    '1',
    'Coleção Animes - HALFTONE',
    'animes',
    132,
    'Halftone',
    29.90,
    59.90,
    112,
    '/products/animes.webp',
    array[
      '/products/animes.webp',
      '/products/animes-2.webp',
      '/products/animes-3.webp',
      '/products/animes-4.webp'
    ],
    1
  ),
  (
    '2',
    'Coleção Filmes - HALFTONE',
    'filmes',
    119,
    'Halftone',
    22.90,
    39.90,
    67,
    '/products/filmes.webp',
    array[
      '/products/filmes.webp',
      '/products/filmes-2.webp',
      '/products/filmes-3.webp'
    ],
    2
  ),
  (
    '3',
    'Coleção Futebol - HALFTONE',
    'futebol',
    128,
    'Halftone',
    22.90,
    39.90,
    94,
    '/products/futebol.webp',
    array[
      '/products/futebol.webp',
      '/products/futebol-2.webp',
      '/products/futebol-3.webp'
    ],
    3
  ),
  (
    '4',
    'Coleção Jogos - HALFTONE',
    'jogos',
    112,
    'Halftone',
    29.90,
    59.90,
    51,
    '/products/jogos.webp',
    array[
      '/products/jogos.webp',
      '/products/jogos-2.webp',
      '/products/jogos-3.webp'
    ],
    4
  ),
  (
    '5',
    'Coleção Religião - HALFTONE',
    'religiao',
    112,
    'Halftone',
    29.90,
    59.90,
    78,
    '/products/religiao.webp',
    array[
      '/products/religiao.webp',
      '/products/religiao-2.webp',
      '/products/religiao-3.webp'
    ],
    5
  ),
  (
    '6',
    'Coleção Rock - HALFTONE',
    'rock',
    183,
    'Halftone',
    22.90,
    39.90,
    103,
    '/products/rock.webp',
    array[
      '/products/rock.webp',
      '/products/rock-2.webp',
      '/products/rock-3.webp'
    ],
    6
  ),
  (
    '7',
    'Coleção Streetwear - HALFTONE',
    'streetwear',
    123,
    'Halftone',
    29.90,
    59.90,
    59,
    '/products/streetwear.webp',
    array[
      '/products/streetwear.webp',
      '/products/streetwear-2.webp',
      '/products/streetwear-3.webp'
    ],
    7
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  quantity = excluded.quantity,
  style = excluded.style,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  sold_count = excluded.sold_count,
  image = excluded.image,
  gallery = excluded.gallery,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
