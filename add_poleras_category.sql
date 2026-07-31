-- Agregar la categoría Poleras (id: 6) a la tabla Categories
INSERT INTO Categories (id, nombre, slug) 
VALUES (6, 'Poleras', 'poleras')
ON CONFLICT(id) DO UPDATE SET nombre = 'Poleras', slug = 'poleras';
