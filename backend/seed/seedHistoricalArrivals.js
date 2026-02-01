const { Pool } = require("pg");
const pool = new Pool();

async function seedHistoricalArrivals() {
  const data = [
    { trip_id: "85_08_00", stop_id: "Start_A", scheduled_arrival: "2026-01-31 08:00:00", actual_arrival: "2026-01-31 08:05:00", delay_minutes: 5 },
    { trip_id: "85_08_00", stop_id: "Start_A", scheduled_arrival: "2026-01-31 08:00:00", actual_arrival: "2026-01-31 08:10:00", delay_minutes: 10 },
    { trip_id: "85_08_30", stop_id: "Start_A", scheduled_arrival: "2026-01-31 08:30:00", actual_arrival: "2026-01-31 08:35:00", delay_minutes: 5 },
    { trip_id: "85_08_30", stop_id: "Start_A", scheduled_arrival: "2026-01-31 08:30:00", actual_arrival: "2026-01-31 08:40:00", delay_minutes: 10 },
    { trip_id: "85_08_30", stop_id: "Start_A", scheduled_arrival: "2026-01-31 08:30:00", actual_arrival: "2026-01-31 08:50:00", delay_minutes: 20 },
    { trip_id: "85_08_00", stop_id: "Stop_1", scheduled_arrival: "2026-01-31 08:10:00", actual_arrival: "2026-01-31 08:15:00", delay_minutes: 5 },
    { trip_id: "85_08_00", stop_id: "Stop_1", scheduled_arrival: "2026-01-31 08:10:00", actual_arrival: "2026-01-31 08:20:00", delay_minutes: 10 },
    { trip_id: "85_08_30", stop_id: "Stop_1", scheduled_arrival: "2026-01-31 08:40:00", actual_arrival: "2026-01-31 08:45:00", delay_minutes: 5 },
    { trip_id: "85_08_30", stop_id: "Stop_1", scheduled_arrival: "2026-01-31 08:40:00", actual_arrival: "2026-01-31 08:50:00", delay_minutes: 10 },
    { trip_id: "85_08_30", stop_id: "Stop_1", scheduled_arrival: "2026-01-31 08:40:00", actual_arrival: "2026-01-31 09:00:00", delay_minutes: 20 },
  ];

  for (const entry of data) {
    await pool.query(
      `INSERT INTO historical_arrivals (trip_id, stop_id, scheduled_arrival, actual_arrival, delay_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [entry.trip_id, entry.stop_id, entry.scheduled_arrival, entry.actual_arrival, entry.delay_minutes]
    );
  }

  console.log("Seeded historical_arrivals table with test data.");
  await pool.end();
}

seedHistoricalArrivals().catch(err => {
  console.error("Error seeding historical_arrivals table:", err);
  process.exit(1);
});