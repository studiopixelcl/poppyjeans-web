-- 1. Eliminar todos los registros de las variantes (tallas, colores, fotos)
DELETE FROM ProductVariants;

-- 2. Eliminar todos los productos principales
DELETE FROM Products;
DELETE FROM OrderItems; 
DELETE FROM Orders; 

-- 3. Reiniciar los contadores de ID (Auto-Increment) para que empiecen en 1
UPDATE sqlite_sequence SET seq = 0 WHERE name = 'Products';
UPDATE sqlite_sequence SET seq = 0 WHERE name = 'ProductVariants';
UPDATE sqlite_sequence SET seq = 0 WHERE name = 'Orders';

-- Nota: No tocamos la tabla 'Categories' para que mantengas tus filtros intactos.