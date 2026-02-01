/**
 * Error function approximation
 * Abramowitz & Stegun formula 7.1.26
 */
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x));

  return sign * y;
}

/**
 * Standard normal cumulative distribution function Φ(z)
 */
function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Probability that delay ≤ buffer_minutes
 */
function probabilityOnTime({ mean, stddev, bufferMinutes }) {
  if (mean == null || stddev == null || stddev === 0) {
    // no data → assume uncertainty but not zero
    return 0.7;
  }

  const z = (bufferMinutes - mean) / stddev;
  return normalCDF(z);
}

module.exports = {
  normalCDF,
  probabilityOnTime,
    erf
};
