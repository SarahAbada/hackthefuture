# HackTheFuture – Smart Arrival Predictor 🚀

A prototype web app that uses **AI + real-world data** to predict the probability of arriving on time to an event.  
It integrates:

- **NLP**: Understands your text input like `"I need to reach my interview by 6:30pm"`  
- **Risk engine**: Combines historical transit delays, traffic, weather, and route features to estimate arrival probability.  
- **Fallback logic**: Looks realistic even when historical data is missing.  

---

## Features

- Enter a natural language plan for reaching a destination.  
- AI parses **target time and urgency**.  
- System computes an **on-time probability** using historical + live data.  
- Demo mode included with a **pre-set prompt** for instant showcase.  

---

## Prerequisites

- Node.js 18+  
- npm  
- PostgreSQL database (for historical/traffic/weather data)  
- **OpenAI API key** (for NLP parsing)  

---

## Setup & Run (localhost)

### 1️⃣ Install dependencies

```bash
# Linux
sudo apt install npm -y

# Mac
brew install npm

### 2️⃣ Configure environment

Create a `.env` file in the root directory with your OpenAI API key and database URL:

```env
CEREBRAS_API_KEY=your_api_key_here
DATABASE_URL=postgres://user:password@host:port/dbname
> If you don’t have real data yet, demo mode uses fallback values so it still works.

## 3️⃣ Run the backend

```bash
node src/index.js
```

* Server runs on http://localhost:3000
* Demo prompt automatically runs and prints:
   * Parsed intent from AI
   * Estimated probability of arriving on time

## API Endpoints

* `GET /api/risk?route_id=ROUTE&stop_id=STOP` → Returns risk score & delay model
* `POST /api/nlp` → Parse natural language input into structured intent

## Notes for Judges

* Fallback logic ensures realistic outputs even with missing data.
* Fully demoable without real API keys or database.
* Focuses on AI-driven planning + risk estimation.

## Quick Demo Tip

To see your AI + risk engine in action instantly:

```bash
node src/index.js
```

Check the console output for parsed intent and arrival probability.


