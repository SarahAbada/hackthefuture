const { probabilityOnTime } = require("../src/utils/probability");

// Mean delay 5 min, stddev 2 min, buffer 5 min
console.log(probabilityOnTime({
  mean: 5,
  stddev: 2,
  bufferMinutes: 5
}));
// ≈ 0.50

// Buffer much larger than mean
console.log(probabilityOnTime({
  mean: 5,
  stddev: 2,
  bufferMinutes: 10
}));
// ≈ 0.993

// Buffer smaller than mean
console.log(probabilityOnTime({
  mean: 5,
  stddev: 2,
  bufferMinutes: 2
}));
// ≈ 0.07
