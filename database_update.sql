-- Ejecuta este archivo para añadir las nuevas columnas de ofertas sin borrar tus productos existentes
ALTER TABLE Products ADD COLUMN en_oferta BOOLEAN DEFAULT 0;
ALTER TABLE Products ADD COLUMN oferta_limitada BOOLEAN DEFAULT 0;
ALTER TABLE Products ADD COLUMN fecha_fin_oferta DATETIME;
-- Añadimos la columna para el sistema de etiquetas
ALTER TABLE Products ADD COLUMN etiquetas TEXT;
ALTER TABLE Products ADD COLUMN tallas TEXT;
ALTER TABLE Products ADD COLUMN colores TEXT;
ALTER TABLE Products ADD COLUMN imagen_url_2 TEXT;
ALTER TABLE Products ADD COLUMN imagen_url_3 TEXT;
-- Creamos la tabla relacionada para los Colores, Tallas e Imágenes (Variantes)
CREATE TABLE IF NOT EXISTS ProductVariants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    color_name TEXT,
    color_hex TEXT,
    tallas TEXT,
    stock INTEGER DEFAULT 0,
    imagen_1 TEXT,
    imagen_2 TEXT,
    imagen_3 TEXT,
    imagen_4 TEXT,
    imagen_5 TEXT,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);