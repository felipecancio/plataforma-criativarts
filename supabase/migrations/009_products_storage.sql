-- ---------------------------------------------------------------------------
-- products: localização do arquivo digital no storage (Cloudflare R2)
-- Compatível com catálogo existente — colunas nullable.
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists storage_provider text
    check (storage_provider is null or storage_provider in ('r2'));

alter table public.products
  add column if not exists storage_key text;

comment on column public.products.storage_provider is
  'Provedor do arquivo digital (ex.: r2). Null = ainda não associado.';

comment on column public.products.storage_key is
  'Chave/objeto no bucket privado (ex.: packs/animes.zip). Null = sem arquivo.';

-- Índice parcial para lookups futuros de download
create index if not exists products_storage_key_idx
  on public.products (storage_key)
  where storage_key is not null;
