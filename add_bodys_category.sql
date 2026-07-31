-- Agregar la categoría Bodys (id: 7) a la tabla Categories
INSERT INTO Categories (id, nombre, slug) 
VALUES (7, 'Bodys', 'bodys')
ON CONFLICT(id) DO UPDATE SET nombre = 'Bodys', slug = 'bodys';
