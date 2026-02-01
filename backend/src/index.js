require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

app.use(require("./api/health"));
app.use(require("./api/prediction"));
app.use(require("./api/weather"));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

const riskRouter = require("./api/risk");
app.use("/api", riskRouter);
