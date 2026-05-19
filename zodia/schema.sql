-- schema.sql
-- Ejecutar con: npx wrangler d1 execute zodia_db --file=./schema.sql

DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    nombre_actual TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    fecha_nacimiento TEXT NOT NULL,
    signo_zodiacal TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    
    -- Variables Numerológicas (El Motor Akáshico)
    camino_vida INTEGER,
    actitud INTEGER,
    generacion INTEGER,
    dia_espiritual INTEGER,
    expresion INTEGER,
    alma INTEGER,
    personalidad INTEGER,
    madurez INTEGER,
    deudas_karmicas TEXT, -- Guardado como JSON Array: Ej. "[14, 19]"
    nivel_conciencia INTEGER DEFAULT 1,
    ultimo_login TEXT,    -- Fecha UTC: YYYY-MM-DD

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS Posts;
CREATE TABLE Posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    contenido TEXT NOT NULL,
    imagen_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Migración: sistema de progresión de nivel
-- Ejecutar SOLO si la tabla Users ya existe (no recrearla):
--   npx wrangler d1 execute zodia_db --local --command="ALTER TABLE Users ADD COLUMN nivel_conciencia INTEGER DEFAULT 1"
--   npx wrangler d1 execute zodia_db --local --command="ALTER TABLE Users ADD COLUMN ultimo_login TEXT"
-- Si estás creando la BD desde cero, las columnas ya están en el CREATE TABLE de arriba.

DROP TABLE IF EXISTS Comments;
CREATE TABLE Comments (
    id         TEXT     PRIMARY KEY,
    post_id    TEXT     NOT NULL,
    user_id    TEXT     NOT NULL,
    contenido  TEXT     NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES Posts(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

DROP TABLE IF EXISTS Messages;
CREATE TABLE Messages (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    sender_id   TEXT     NOT NULL,
    receiver_id TEXT     NOT NULL,
    contenido   TEXT     NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES Users(id),
    FOREIGN KEY (receiver_id) REFERENCES Users(id)
);
-- Índices para acelerar las consultas de inbox e historial
CREATE INDEX IF NOT EXISTS idx_msg_sender   ON Messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_receiver ON Messages(receiver_id);

DROP TABLE IF EXISTS AdminsConfig;
CREATE TABLE AdminsConfig (
    id TEXT PRIMARY KEY,
    clave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);