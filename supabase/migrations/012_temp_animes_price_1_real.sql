-- TEMP: Pack Animes → R$ 1,00 (teste de compra real)
-- Preço original: 29.90
-- Restaurar com: 012_restore_animes_price.sql

update public.products
set price = 1.00
where slug = 'animes' or id = '1';
