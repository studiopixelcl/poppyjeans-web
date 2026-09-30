-- Agregar la categoría MAN (id: 8) a la tabla Categories
INSERT INTO Categories (id, nombre, slug) 
VALUES (8, 'MAN', 'man')
ON CONFLICT(id) DO UPDATE SET nombre = 'MAN', slug = 'man';
