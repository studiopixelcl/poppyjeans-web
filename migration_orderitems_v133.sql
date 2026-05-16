-- ============================================================
-- MIGRACIÓN v1.3.3 → Columnas faltantes en Orders y OrderItems
-- Ejecutar UNA SOLA VEZ con:
--   wrangler d1 execute mathsoluis-db --remote --file=migration_orderitems_v133.sql
-- ============================================================

-- 1. OrderItems: columna para el ID de variante (color/estilo)
ALTER TABLE OrderItems ADD COLUMN variant_id INTEGER;

-- 2. OrderItems: URL de imagen de la prenda elegida
ALTER TABLE OrderItems ADD COLUMN imagen_url TEXT;

-- 3. Orders: costo de envío (por si tampoco existe)
ALTER TABLE Orders ADD COLUMN shipping_cost REAL DEFAULT 0;

-- ¡Listo! Ahora los checkouts guardarán variant_id e imagen_url correctamente.
