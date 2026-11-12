export const PHENOTYPES = [
  "Overall Breast Cancer",
  "ER-positive",
  "ER-negative",
  "hybrid ER-positive",
  "hybrid ER-negative",
];
export const phenotypeLabel = (value) =>
  value
    .replace("Overall Breast Cancer", "Overall breast cancer")
    .replace(/^hybrid/, "Hybrid");

// Same mean, median and population variance definitions as the original view.
export function calculateSummaryStatistics(data) {
  const mean = data.reduce((acc, val) => acc + val, 0) / data.length;
  const sortedData = [...data].sort((a, b) => a - b);
  const median =
    sortedData.length % 2 === 0
      ? (sortedData[sortedData.length / 2 - 1] +
          sortedData[sortedData.length / 2]) /
        2
      : sortedData[Math.floor(sortedData.length / 2)];
  const variance =
    data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / data.length;
  return {
    mean,
    median,
    stdDev: Math.sqrt(variance),
    min: Math.min(...data),
    max: Math.max(...data),
  };
}

// Retains the original 10-bin histogram, with a finite domain for identical scores.
export function createHistogramBins(data, binCount = 10) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = min === max ? Math.max(Math.abs(min) * 0.01, 0.005) : 0;
  const start = min - padding;
  const binWidth = (max + padding - start) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => start + i * binWidth);
  const frequencies = new Array(binCount).fill(0);
  for (const value of data)
    frequencies[
      Math.min(
        binCount - 1,
        Math.max(0, Math.floor((value - start) / binWidth)),
      )
    ]++;
  return { bins, frequencies, binWidth };
}

export function createResultsCsv(results) {
  return (
    [
      "Trial," + PHENOTYPES.join(","),
      ...results.map((row, index) =>
        [index + 1, ...PHENOTYPES.map((key) => row[key])].join(","),
      ),
    ].join("\r\n") + "\r\n"
  );
}
