import test from "node:test";
import assert from "node:assert/strict";
// Protects the plot and export against lost trials, constant scores, and rounded-away data.
const results = await import("../scripts/js/results-data.js").catch(() => ({}));
test("histogram accounts for every trial, including the upper boundary", () => {
  assert.equal(
    typeof results.createHistogramBins,
    "function",
    "histogram preparation must be available",
  );
  assert.deepEqual(
    results.createHistogramBins([0, 0, 0.5, 1], 2).frequencies,
    [2, 2],
  );
});
test("identical trial scores remain visible in the histogram", () => {
  assert.equal(typeof results.createHistogramBins, "function");
  const bins = results.createHistogramBins([0.25, 0.25, 0.25]);
  assert.equal(
    bins.frequencies.reduce((a, b) => a + b, 0),
    3,
  );
  assert.ok(bins.frequencies.every(Number.isFinite));
});
test("summary retains the original statistical definitions and input order", () => {
  assert.equal(typeof results.calculateSummaryStatistics, "function");
  const values = [4, 1, 3, 2];
  assert.deepEqual(results.calculateSummaryStatistics(values), {
    mean: 2.5,
    median: 2.5,
    stdDev: Math.sqrt(1.25),
    min: 1,
    max: 4,
  });
  assert.deepEqual(values, [4, 1, 3, 2]);
});
test("CSV exports unrounded scores for each trial and each phenotype", () => {
  assert.equal(typeof results.createResultsCsv, "function");
  const csv = results.createResultsCsv([
    {
      "Overall Breast Cancer": 0.123456789,
      "ER-positive": 2,
      "ER-negative": 3,
      "hybrid ER-positive": 4,
      "hybrid ER-negative": 5,
    },
  ]);
  assert.equal(
    csv,
    "Trial,Overall Breast Cancer,ER-positive,ER-negative,hybrid ER-positive,hybrid ER-negative\r\n1,0.123456789,2,3,4,5\r\n",
  );
});
