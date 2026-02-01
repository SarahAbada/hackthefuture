// seed/seed.js
//const { Pool } = require("pg");
//const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// src/db.js or top of seed.js
const { Pool } = require("pg");
require("dotenv").config();

// Make sure the DATABASE_URL is a string
if (!process.env.DATABASE_URL || typeof process.env.DATABASE_URL !== "string") {
  throw new Error("DATABASE_URL must be set in .env and be a string");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional: force SSL to false locally if needed
  ssl: false,
});
// Helper functions
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // 1️⃣ Ensure we have some routes
    const routeRes = await pool.query("SELECT route_id FROM routes");
    let routes = routeRes.rows.map(r => r.route_id);
    if (routes.length === 0) {
      // insert some example routes
      await pool.query(`
        INSERT INTO routes (route_id, name, avg_road_slope, avg_road_width, construction_risk, snow_sensitivity)
        VALUES
        ('85', 'Route 85', 3.5, 12, 0.2, 0.8),
        ('86', 'Route 86', 2.0, 10, 0.1, 0.5)
      `);
      routes = ['85', '86'];
    }

    // 2️⃣ Ensure we have some stops
    const stopRes = await pool.query("SELECT stop_id FROM stops");
    let stops = stopRes.rows.map(s => s.stop_id);
    if (stops.length === 0) {
      await pool.query(`
        INSERT INTO stops (stop_id, route_id, name, lat, lon)
        VALUES
        ('Hurdman_A','85','Hurdman Station',45.428,-75.683),
        ('Lees_B','85','Lees Station',45.426,-75.679),
        ('Hurdman_C','86','Hurdman South',45.428,-75.684)
      `);
      stops = ['Hurdman_A','Lees_B','Hurdman_C'];
    }

    // 3️⃣ Seed some weather snapshots
    const weatherRes = await pool.query("SELECT weather_id FROM weather_snapshots");
    let weatherIds = weatherRes.rows.map(w => w.weather_id);
    if (weatherIds.length === 0) {
      for (let i = 0; i < 5; i++) {
        const raw = {
          condition: randomChoice(["sunny", "cloudy", "rain", "snow"]),
          temperature_c: Math.floor(randomBetween(-10, 30)),
          wind_kph: Math.floor(randomBetween(0, 40))
        };
        const insertRes = await pool.query(
          `INSERT INTO weather_snapshots (timestamp, raw_json) VALUES (NOW() - interval '${i} hours', $1) RETURNING weather_id`,
          [raw]
        );
        weatherIds.push(insertRes.rows[0].weather_id);
      }
    }

    // 4️⃣ Seed trips
    const tripRes = await pool.query("SELECT trip_id FROM trips");
    let trips = tripRes.rows.map(t => t.trip_id);
    if (trips.length === 0) {
      for (let i = 0; i < 20; i++) {
        const route_id = randomChoice(routes);
        const scheduledDeparture = new Date(Date.now() - randomBetween(0, 2 * 24 * 60 * 60 * 1000)); // last 2 days
        const scheduledArrival = new Date(scheduledDeparture.getTime() + randomBetween(20, 60) * 60000); // 20-60 min trips
        const trip_id = `${route_id}_${scheduledDeparture.toISOString().slice(0,10)}_${i}`;

        await pool.query(
          `INSERT INTO trips (trip_id, route_id, scheduled_departure, scheduled_arrival) VALUES ($1,$2,$3,$4)`,
          [trip_id, route_id, scheduledDeparture, scheduledArrival]
        );
        trips.push(trip_id);
      }
    }

    // 5️⃣ Seed historical_arrivals (big chunk for nuanced stats)
    const totalRows = 2000;
    for (let i = 0; i < totalRows; i++) {
      const trip_id = randomChoice(trips);
      const stop_id = randomChoice(stops);
      const weather_id = randomChoice(weatherIds);
      const scheduled = new Date(Date.now() - randomBetween(0, 2 * 24 * 60 * 60 * 1000));
      const actual = new Date(scheduled.getTime() + randomBetween(-5, 15) * 60000); // ±5 to 15 min
      const delay_minutes = (actual - scheduled) / 60000;

      await pool.query(
        `INSERT INTO historical_arrivals
         (trip_id, stop_id, weather_id, scheduled_arrival, actual_arrival, delay_minutes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [trip_id, stop_id, weather_id, scheduled, actual, delay_minutes]
      );
    }

    console.log(`🌿 Inserted ${totalRows} historical arrivals. Seeding done!`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
