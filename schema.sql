-- ============================================================================
-- DEFINICIÓN DE ESQUEMA RELACIONAL — SP CORE v2.0 (D1 / SQLite)
-- ESPECIFICACIÓN DE INGENIERÍA: STUDIO PIXEL SpA
-- ============================================================================

CREATE TABLE IF NOT EXISTS Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_normal REAL NOT NULL,
    precio_oferta REAL,
    en_oferta INTEGER DEFAULT 0, 
    oferta_limitada INTEGER DEFAULT 0,
    fecha_fin_oferta TEXT, 
    stock INTEGER DEFAULT 0,
    categoria_id INTEGER,
    categorias_ids TEXT, -- Formato JSON Array: "[1,2,3]"
    etiquetas TEXT, -- Tags separados por coma
    weight REAL DEFAULT 500, -- Peso en gramos para el cotizador logístico
    is_pack INTEGER DEFAULT 0, -- Identificador de Kits de productos
    visible INTEGER DEFAULT 1,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES Categories(id)
);

CREATE TABLE IF NOT EXISTS ProductVariants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    color_name TEXT,
    color_hex TEXT,
    tallas TEXT, -- Estructura JSON Crítica: Array o Diccionario de Componentes
    stock INTEGER DEFAULT 0,
    imagen_1 TEXT, -- URLs absolutas apuntadas a Cloudflare R2
    imagen_2 TEXT,
    imagen_3 TEXT,
    imagen_4 TEXT,
    imagen_5 TEXT,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    telefono TEXT,
    direccion TEXT,
    comuna TEXT,
    region TEXT,
    fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    total REAL NOT NULL,
    shipping_cost REAL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente', -- Pendiente, Pagado, Preparando, Enviado, Entregado, Cancelado
    tracking_code TEXT,
    courier TEXT,
    notas TEXT,
    fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(id)
);

CREATE TABLE IF NOT EXISTS OrderItems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    variant_id INTEGER,
    product_name TEXT NOT NULL,
    variant_details TEXT, -- Almacena strings corporativos: "Talla: M" o JSON '{"bata":"M","sosten":"44"}'
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    imagen_url TEXT,
    FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE SET NULL,
    FOREIGN KEY (variant_id) REFERENCES ProductVariants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS AdminSessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    admin_id INTEGER NOT NULL,
    admin_name TEXT NOT NULL,
    admin_rol TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES Admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ActivityLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL, -- CREAR, EDITAR, ELIMINAR, MIGRAR
    entity_type TEXT NOT NULL, -- Producto, Pedido, Cliente, Configuracion
    entity_id TEXT,
    details TEXT,
    fecha TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Config (
    key TEXT PRIMARY KEY,
    value TEXT, -- JSON Stringificado para la inyección dinámica de agentes IA o parámetros de pasarela
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);