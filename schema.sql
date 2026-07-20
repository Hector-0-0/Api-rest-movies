-- schema.sql — Esquema y datos semilla de PostgreSQL para la Movies REST API.
--
-- Los proveedores gestionados (Neon, Render) crean la base por ti, así que este
-- archivo solo define objetos dentro de la base actual: no hay CREATE DATABASE
-- ni \c. Se ejecuta con:
--     psql "$DATABASE_URL" -f schema.sql
--
-- Es idempotente: volver a ejecutarlo recrea el esquema desde cero.

DROP TABLE IF EXISTS movie_genres;
DROP TABLE IF EXISTS movie;
DROP TABLE IF EXISTS genre;
DROP TABLE IF EXISTS users;

-- gen_random_uuid() viene en el core de PostgreSQL desde la v13 (sin extensión).
CREATE TABLE movie (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title    text NOT NULL,
    year     integer NOT NULL,
    director text NOT NULL,
    duration integer NOT NULL,
    poster   text,
    -- NUMERIC mantiene exacta la nota de 0.0 a 10.0. Los modelos la castean a
    -- float8 al leer, porque node-pg devuelve NUMERIC como string.
    rate     numeric(3, 1) NOT NULL CHECK (rate >= 0 AND rate <= 10)
);

CREATE TABLE genre (
    id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE
);

-- Claves foráneas de verdad: MySQL ignoraba en silencio el REFERENCES a nivel
-- de columna que había antes. El ON DELETE CASCADE evita que se acumulen filas
-- huérfanas en cada borrado.
CREATE TABLE movie_genres (
    movie_id uuid    NOT NULL REFERENCES movie (id) ON DELETE CASCADE,
    genre_id integer NOT NULL REFERENCES genre (id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE INDEX movie_genres_genre_id_idx ON movie_genres (genre_id);

-- Usuarios para la autenticación JWT. Las contraseñas se guardan solo hasheadas.
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL,
    password_hash text NOT NULL,
    role          text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- La colación por defecto de MySQL hacía que `WHERE email = ?` no distinguiera
-- mayúsculas; PostgreSQL sí las distingue. Un índice único funcional sobre
-- LOWER(email) conserva el comportamiento: Foo@x.com y foo@x.com son una cuenta.
CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));

-- Los géneros deben coincidir con la whitelist GENRES de src/schemas/movies.mjs.
INSERT INTO genre (name) VALUES
  ('Action'),
  ('Adventure'),
  ('Animation'),
  ('Biography'),
  ('Crime'),
  ('Comedy'),
  ('Drama'),
  ('Fantasy'),
  ('Horror'),
  ('Sci-Fi'),
  ('Romance');

-- Admin semilla para poder probar la API desde el primer momento.
-- Credenciales: admin@example.com / admin12345 (cámbialas en cualquier despliegue real).
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@example.com', '$2b$10$yjRLUitKusDkTpHmIIazo.PFDxhQYxuZsjSlVqR/YBowFnVKVaP.2', 'admin');

-- Las mismas 15 películas que sirve el modelo en memoria, para que ambos
-- backends sean intercambiables (ver tests/models.contract.test.mjs).
INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES
  ('dcdd0fad-a94c-4810-8acc-5f108d3b18c3', 'The Shawshank Redemption', 1994, 'Frank Darabont', 142, 'https://i.ebayimg.com/images/g/4goAAOSwMyBe7hnQ/s-l1200.webp', 9.3),
  ('c8a7d63f-3b04-44d3-9d95-8782fd7dcfaf', 'The Dark Knight', 2008, 'Christopher Nolan', 152, 'https://i.ebayimg.com/images/g/yokAAOSw8w1YARbm/s-l1200.jpg', 9),
  ('5ad1a235-0d9c-410a-b32b-220d91689a08', 'Inception', 2010, 'Christopher Nolan', 148, 'https://m.media-amazon.com/images/I/91Rc8cAmnAL._AC_UF1000,1000_QL80_.jpg', 8.8),
  ('241bf55d-b649-4109-af7c-0e6890ded3fc', 'Pulp Fiction', 1994, 'Quentin Tarantino', 154, 'https://www.themoviedb.org/t/p/original/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg', 8.9),
  ('9e6106f0-848b-4810-a11a-3d832a5610f9', 'Forrest Gump', 1994, 'Robert Zemeckis', 142, 'https://i.ebayimg.com/images/g/qR8AAOSwkvRZzuMD/s-l1600.jpg', 8.8),
  ('7e3fd5ab-60ff-4ae2-92b6-9597f0308d1c', 'Gladiator', 2000, 'Ridley Scott', 155, 'https://img.fruugo.com/product/0/60/14417600_max.jpg', 8.5),
  ('c906673b-3948-4402-ac7f-73ac3a9e3105', 'The Matrix', 1999, 'Lana Wachowski', 136, 'https://i.ebayimg.com/images/g/QFQAAOSwAQpfjaA6/s-l1200.jpg', 8.7),
  ('b6e03689-cccd-478e-8565-d92f40813b13', 'Interstellar', 2014, 'Christopher Nolan', 169, 'https://m.media-amazon.com/images/I/91obuWzA3XL._AC_UF1000,1000_QL80_.jpg', 8.6),
  ('aa391090-b938-42eb-b520-86ea0aa3917b', 'The Lord of the Rings: The Return of the King', 2003, 'Peter Jackson', 201, 'https://i.ebayimg.com/images/g/0hoAAOSwe7peaMLW/s-l1600.jpg', 8.9),
  ('2e6900e2-0b48-4fb6-ad48-09c7086e54fe', 'The Lion King', 1994, 'Roger Allers, Rob Minkoff', 88, 'https://m.media-amazon.com/images/I/81BMmrwSFOL._AC_UF1000,1000_QL80_.jpg', 8.5),
  ('04986507-b3ed-442c-8ae7-4c5df804f896', 'The Avengers', 2012, 'Joss Whedon', 143, 'https://img.fruugo.com/product/7/41/14532417_max.jpg', 8),
  ('7d2832f8-c70a-410e-8963-4c93bf36cc9c', 'Jurassic Park', 1993, 'Steven Spielberg', 127, 'https://vice-press.com/cdn/shop/products/Jurassic-Park-Editions-poster-florey.jpg?v=1654518755&width=1024', 8.1),
  ('ccf36f2e-8566-47f7-912d-9f4647250bc7', 'Titanic', 1997, 'James Cameron', 195, 'https://i.pinimg.com/originals/42/42/65/4242658e6f1b0d6322a4a93e0383108b.png', 7.8),
  ('8fb17ae1-bdfe-45e5-a871-4772d7e526b8', 'The Social Network', 2010, 'David Fincher', 120, 'https://i.pinimg.com/originals/7e/37/b9/7e37b994b613e94cba64f307b1983e39.jpg', 7.7),
  ('6a360a18-c645-4b47-9a7b-2a71babbf3e0', 'Avatar', 2009, 'James Cameron', 162, 'https://i.etsystatic.com/35681979/r/il/dfe3ba/3957859451/il_fullxfull.3957859451_h27r.jpg', 7.8);

INSERT INTO movie_genres (movie_id, genre_id) VALUES
  ('dcdd0fad-a94c-4810-8acc-5f108d3b18c3', (SELECT id FROM genre WHERE name = 'Drama')),
  ('c8a7d63f-3b04-44d3-9d95-8782fd7dcfaf', (SELECT id FROM genre WHERE name = 'Action')),
  ('c8a7d63f-3b04-44d3-9d95-8782fd7dcfaf', (SELECT id FROM genre WHERE name = 'Crime')),
  ('c8a7d63f-3b04-44d3-9d95-8782fd7dcfaf', (SELECT id FROM genre WHERE name = 'Drama')),
  ('5ad1a235-0d9c-410a-b32b-220d91689a08', (SELECT id FROM genre WHERE name = 'Action')),
  ('5ad1a235-0d9c-410a-b32b-220d91689a08', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('5ad1a235-0d9c-410a-b32b-220d91689a08', (SELECT id FROM genre WHERE name = 'Sci-Fi')),
  ('241bf55d-b649-4109-af7c-0e6890ded3fc', (SELECT id FROM genre WHERE name = 'Crime')),
  ('241bf55d-b649-4109-af7c-0e6890ded3fc', (SELECT id FROM genre WHERE name = 'Drama')),
  ('9e6106f0-848b-4810-a11a-3d832a5610f9', (SELECT id FROM genre WHERE name = 'Drama')),
  ('9e6106f0-848b-4810-a11a-3d832a5610f9', (SELECT id FROM genre WHERE name = 'Romance')),
  ('7e3fd5ab-60ff-4ae2-92b6-9597f0308d1c', (SELECT id FROM genre WHERE name = 'Action')),
  ('7e3fd5ab-60ff-4ae2-92b6-9597f0308d1c', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('7e3fd5ab-60ff-4ae2-92b6-9597f0308d1c', (SELECT id FROM genre WHERE name = 'Drama')),
  ('c906673b-3948-4402-ac7f-73ac3a9e3105', (SELECT id FROM genre WHERE name = 'Action')),
  ('c906673b-3948-4402-ac7f-73ac3a9e3105', (SELECT id FROM genre WHERE name = 'Sci-Fi')),
  ('b6e03689-cccd-478e-8565-d92f40813b13', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('b6e03689-cccd-478e-8565-d92f40813b13', (SELECT id FROM genre WHERE name = 'Drama')),
  ('b6e03689-cccd-478e-8565-d92f40813b13', (SELECT id FROM genre WHERE name = 'Sci-Fi')),
  ('aa391090-b938-42eb-b520-86ea0aa3917b', (SELECT id FROM genre WHERE name = 'Action')),
  ('aa391090-b938-42eb-b520-86ea0aa3917b', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('aa391090-b938-42eb-b520-86ea0aa3917b', (SELECT id FROM genre WHERE name = 'Drama')),
  ('2e6900e2-0b48-4fb6-ad48-09c7086e54fe', (SELECT id FROM genre WHERE name = 'Animation')),
  ('2e6900e2-0b48-4fb6-ad48-09c7086e54fe', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('2e6900e2-0b48-4fb6-ad48-09c7086e54fe', (SELECT id FROM genre WHERE name = 'Drama')),
  ('04986507-b3ed-442c-8ae7-4c5df804f896', (SELECT id FROM genre WHERE name = 'Action')),
  ('04986507-b3ed-442c-8ae7-4c5df804f896', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('04986507-b3ed-442c-8ae7-4c5df804f896', (SELECT id FROM genre WHERE name = 'Sci-Fi')),
  ('7d2832f8-c70a-410e-8963-4c93bf36cc9c', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('7d2832f8-c70a-410e-8963-4c93bf36cc9c', (SELECT id FROM genre WHERE name = 'Sci-Fi')),
  ('ccf36f2e-8566-47f7-912d-9f4647250bc7', (SELECT id FROM genre WHERE name = 'Drama')),
  ('ccf36f2e-8566-47f7-912d-9f4647250bc7', (SELECT id FROM genre WHERE name = 'Romance')),
  ('8fb17ae1-bdfe-45e5-a871-4772d7e526b8', (SELECT id FROM genre WHERE name = 'Biography')),
  ('8fb17ae1-bdfe-45e5-a871-4772d7e526b8', (SELECT id FROM genre WHERE name = 'Drama')),
  ('6a360a18-c645-4b47-9a7b-2a71babbf3e0', (SELECT id FROM genre WHERE name = 'Action')),
  ('6a360a18-c645-4b47-9a7b-2a71babbf3e0', (SELECT id FROM genre WHERE name = 'Adventure')),
  ('6a360a18-c645-4b47-9a7b-2a71babbf3e0', (SELECT id FROM genre WHERE name = 'Fantasy'));
