CREATE TABLE routes (
  route_id TEXT PRIMARY KEY,
  name TEXT,
  avg_road_slope REAL,
  avg_road_width REAL,
  construction_risk REAL,
  snow_sensitivity REAL
);

CREATE TABLE stops (
  stop_id TEXT PRIMARY KEY,
  route_id TEXT REFERENCES routes(route_id),
  name TEXT,
  lat REAL,
  lon REAL
);

CREATE TABLE trips (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT REFERENCES routes(route_id),
  scheduled_departure TIMESTAMP,
  scheduled_arrival TIMESTAMP
);

CREATE TABLE weather_snapshots (
  weather_id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP,
  raw_json JSONB
);

CREATE TABLE historical_arrivals (
  id SERIAL PRIMARY KEY,
  trip_id TEXT REFERENCES trips(trip_id),
  stop_id TEXT REFERENCES stops(stop_id),
  weather_id INT REFERENCES weather_snapshots(weather_id),
  scheduled_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  delay_minutes REAL
);

CREATE TABLE traffic_profiles (
  id SERIAL PRIMARY KEY,
  route_id TEXT REFERENCES routes(route_id),
  hour_of_day INT,
  day_type TEXT,
  congestion_level REAL
);
