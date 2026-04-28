-- Eliminar tablas si existen (útil para reinicios en desarrollo)
DROP TABLE IF EXISTS Admins;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Products;

-- Tabla de Administradores (El equipo de Isabela)
CREATE TABLE Admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT DEFAULT 'admin', -- Puede ser 'superadmin' o 'editor'
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Categorías
CREATE TABLE Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

-- Tabla de Productos (Inventario)
CREATE TABLE Products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_normal REAL NOT NULL,
    precio_oferta REAL,
    stock INTEGER DEFAULT 0,
    categoria_id INTEGER,
    imagen_url TEXT,
    visible BOOLEAN DEFAULT 1, -- 1: Activo en tienda, 0: Oculto
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES Categories(id)
);

-- Insertar el primer usuario Super Administrador por defecto
INSERT INTO Admins (nombre, email, password_hash, rol) 
VALUES ('Isabela Mathsoluis', 'admin@mathsoluis.cl', 'hash_pendiente_generar', 'superadmin');

-- Insertar categorías base conversadas
INSERT INTO Categories (nombre, slug) VALUES 
('Recién Nacido', 'recien-nacido'),
('Niñas', 'ninas'),
('Niños', 'ninos'),
('Mamá & Bebé', 'mama-bebe');