-- RESTAURAR: Pack Animes → R$ 29,90 (preço original)
-- Rodar no SQL Editor após o teste de compra real.

update public.products
set price = 29.90
where slug = 'animes' or id = '1';
