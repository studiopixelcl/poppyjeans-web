-- First map products to existing IDs 1 to 5
UPDATE Products SET categoria_id = 1 WHERE nombre LIKE '%Calza%';
UPDATE Products SET categoria_id = 2 WHERE nombre LIKE '%Jeans%';
UPDATE Products SET categoria_id = 3 WHERE nombre LIKE '%Conjunto%';
UPDATE Products SET categoria_id = 4 WHERE nombre LIKE '%Enterito%';
UPDATE Products SET categoria_id = 5 WHERE nombre LIKE '%Pantalon%' OR nombre LIKE '%Pantalón%';

-- Sync the JSON array string categorias_ids to prevent frontend filter mismatches
UPDATE Products SET categorias_ids = '[' || categoria_id || ']';

-- Now no products point to 6, 7, 8, 9, 10. We can safely delete them.
DELETE FROM Categories WHERE id > 5;

-- Update the names and slugs of categories 1 to 5 to match the new list
UPDATE Categories SET nombre = 'Calza', slug = 'calza' WHERE id = 1;
UPDATE Categories SET nombre = 'Jeans', slug = 'jeans' WHERE id = 2;
UPDATE Categories SET nombre = 'Conjunto', slug = 'conjunto' WHERE id = 3;
UPDATE Categories SET nombre = 'Enterito', slug = 'enterito' WHERE id = 4;
UPDATE Categories SET nombre = 'Pantalones', slug = 'pantalones' WHERE id = 5;
