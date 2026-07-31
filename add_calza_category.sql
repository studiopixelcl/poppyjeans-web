-- Agregar la categoría Calza (id: 10) a la tabla Categories
INSERT INTO Categories (id, nombre, slug) 
VALUES (10, 'Calza', 'calza')
ON CONFLICT(id) DO NOTHING;
