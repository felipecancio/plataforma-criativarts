-- Novo produto: Coleção Animes Vol. 2 - HALFTONE
-- Idempotente (upsert por id).

insert into public.products (
  id, name, slug, quantity, style,
  price, compare_at_price, sold_count,
  image, gallery, sort_order, is_active,
  storage_provider, storage_key
) values (
  '8',
  'Coleção Animes Vol. 2 - HALFTONE',
  'animesvol2',
  162,
  'Halftone',
  24.90,
  49.90,
  91,
  '/products/animesvol2.webp',
  array[
    '/products/animesvol2.webp',
    '/products/animesvol2-2.webp',
    '/products/animesvol2-3.webp',
    '/products/animesvol2-4.webp'
  ],
  2,
  true,
  'r2',
  'Animes vol 2/HALFTONE-006.rar'
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
  is_active = excluded.is_active,
  storage_provider = excluded.storage_provider,
  storage_key = excluded.storage_key,
  updated_at = now();

-- Reordena os demais (Animes Vol.1 = 1, Vol.2 = 2, resto em seguida)
update public.products set sort_order = 3 where id = '2';
update public.products set sort_order = 4 where id = '3';
update public.products set sort_order = 5 where id = '4';
update public.products set sort_order = 6 where id = '5';
update public.products set sort_order = 7 where id = '6';
update public.products set sort_order = 8 where id = '7';
