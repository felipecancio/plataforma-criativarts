-- ---------------------------------------------------------------------------
-- Associa cada produto ao arquivo relativo no Cloudflare R2 (storage_key).
-- Bucket NÃO é armazenado — apenas o caminho do objeto.
-- Pré-requisito: 009_products_storage.sql
-- ---------------------------------------------------------------------------

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Animes/ANIMES 132.rar'
where id = '1' or slug = 'animes';

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Filmes/filmes 119.rar'
where id = '2' or slug = 'filmes';

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Futebol/FUTEBOL 128.rar'
where id = '3' or slug = 'futebol';

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Games/PERSONAGENS JOGOS 112.rar'
where id = '4' or slug = 'jogos';

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Religião/RELIGIÃO 112.rar'
where id = '5' or slug = 'religiao';

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Rock/rock 183.rar'
where id = '6' or slug = 'rock';

update public.products
set
  storage_provider = 'r2',
  storage_key = 'Streetwear/STREETWEAR 123.rar'
where id = '7' or slug = 'streetwear';
