-- Coleção Teddy Bear - PNG

insert into public.products (
  id, name, slug, quantity, style,
  price, compare_at_price, sold_count,
  image, gallery, sort_order, is_active,
  storage_provider, storage_key
) values (
  '10',
  'Coleção Teddy Bear - PNG',
  'teddybear',
  100,
  'Graphic Tee',
  19.90,
  24.90,
  42,
  '/products/teddybear.webp',
  array[
    '/products/teddybear.webp',
    '/products/teddybear-2.webp',
    '/products/teddybear-3.webp'
  ],
  1,
  true,
  'r2',
  'TEDDY BEAR/TEDDY BEAR 100.rar'
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

update public.products set sort_order = 2 where id = '1';
update public.products set sort_order = 3 where id = '8';
update public.products set sort_order = 4 where id = '9';
update public.products set sort_order = 5 where id = '2';
update public.products set sort_order = 6 where id = '3';
update public.products set sort_order = 7 where id = '4';
update public.products set sort_order = 8 where id = '5';
update public.products set sort_order = 9 where id = '6';
update public.products set sort_order = 10 where id = '7';
