DROP TABLE IF EXISTS trails;
DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS meetups;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS yelps;
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(16, 14),
  longitude NUMERIC(17, 14)
);

CREATE TABLE weathers (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  created_at NUMERIC(35),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE meetups (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  name VARCHAR(255),
  creation_date VARCHAR(255),
  host VARCHAR(255),
  created_at NUMERIC(35),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE movies(
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  released_on VARCHAR(255),
  total_votes INTEGER,
  average_votes NUMERIC(16),
  popularity NUMERIC(16),
  image_url VARCHAR(255),
  overview VARCHAR(1023),
  created_at NUMERIC(35),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE yelps(
  id SERIAL PRIMARY KEY,
  url VARCHAR(255),
  name VARCHAR(255),
  rating NUMERIC(6),
  price VARCHAR(255),
  image_url VARCHAR(255),
  created_at NUMERIC(35),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE trails (
  id SERIAL PRIMARY KEY,
  trail_url VARCHAR(255),
  name VARCHAR(255),
  location VARCHAR(255),
  length NUMERIC(8),
  condition_date VARCHAR(255),
  condition_time VARCHAR(255),
  conditions VARCHAR(255),
  stars NUMERIC(8),
  star_votes NUMERIC(8),
  summary VARCHAR(255),
  created_at NUMERIC(35),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
)
