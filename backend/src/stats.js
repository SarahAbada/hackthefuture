function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values, meanVal) {
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

module.exports = { mean, stdDev };
