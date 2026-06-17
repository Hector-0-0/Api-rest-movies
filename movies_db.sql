DROP DATABASE IF EXISTS moviesdb;

CREATE DATABASE moviesdb;

USE moviesdb;

CREATE TABLE movie (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    title VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    director VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    poster TEXT,
    rate DECIMAL(2, 1) UNSIGNED NOT NULL
);

CREATE TABLE genre (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE movie_genres (
    movie_id BINARY(16) REFERENCES movie(id),
    genre_id INT REFERENCES genre(id),
    PRIMARY KEY (movie_id, genre_id)
);

-- Users for JWT authentication. Passwords are stored as bcrypt hashes only.
CREATE TABLE users (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Genres must match the GENRES whitelist in src/schemas/movies.mjs.
INSERT INTO genre (name) VALUES
('Action'),
('Adventure'),
('Crime'),
('Comedy'),
('Drama'),
('Horror'),
('Sci-Fi'),
('Romance');

-- Seed admin so the API can be tested out of the box.
-- Credentials: admin@example.com / admin12345  (change in any real deployment).
INSERT INTO users (id, email, password_hash, role) VALUES
(UUID_TO_BIN(UUID()), 'admin@example.com', '$2b$10$yjRLUitKusDkTpHmIIazo.PFDxhQYxuZsjSlVqR/YBowFnVKVaP.2', 'admin');

INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES
(UUID_TO_BIN(UUID()), "Inception", 2010, "Christopher Nolan", 180, "https://m.media-amazon.com/images/I/91Rc8cAmnAL._AC_UF1000,1000_QL80_.jpg", 8.8),
(UUID_TO_BIN(UUID()), "The Shawshank Redemption", 1994, "Frank Darabont", 142, "https://i.ebayimg.com/images/g/4goAAOSwMyBe7hnQ/s-l1200.webp", 9.3),
(UUID_TO_BIN(UUID()), "The Dark Knight", 1994, "Christopher Nolan", 152, "https://i.ebayimg.com/images/g/yokAAOSwm8w1YARbm/s-l1200.jpg", 9.0);

INSERT INTO movie_genres (movie_id, genre_id)
VALUES
((SELECT id FROM movie WHERE title = 'Inception'), (SELECT id FROM genre WHERE name = 'Sci-Fi')),
((SELECT id FROM movie WHERE title = 'Inception'), (SELECT id FROM genre WHERE name = 'Action')),
((SELECT id FROM movie WHERE title = 'Inception'), (SELECT id FROM genre WHERE name = 'Adventure')),
((SELECT id FROM movie WHERE title = 'The Shawshank Redemption'), (SELECT id FROM genre WHERE name = 'Drama')),
((SELECT id FROM movie WHERE title = 'The Dark Knight'), (SELECT id FROM genre WHERE name = 'Action')),
((SELECT id FROM movie WHERE title = 'The Dark Knight'), (SELECT id FROM genre WHERE name = 'Crime')),
((SELECT id FROM movie WHERE title = 'The Dark Knight'), (SELECT id FROM genre WHERE name = 'Drama'));

SELECT * FROM movie;

SELECT BIN_TO_UUID(id), title FROM movie;