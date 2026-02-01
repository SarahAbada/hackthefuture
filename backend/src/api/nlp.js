const express = require("express");
const router = express.Router();
const { interpretUserQuery } = require("../nlp/cerebrasClient");

router.post("/nlp", async (req, res) => {
  try {
    const { text } = req.body;
    const intent = await interpretUserQuery(text);
    res.json(intent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
