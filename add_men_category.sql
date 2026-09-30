-- Agregar o actualizar la categoría MEN (id: 8) a la tabla Categories
INSERT INTO Categories (id, nombre, slug) 
VALUES (8, 'MEN', 'men')
ON CONFLICT(id) DO UPDATE SET nombre = 'MEN', slug = 'men';
