import {
  PHENOTYPES,
  phenotypeLabel,
  calculateSummaryStatistics,
  createHistogramBins,
  createResultsCsv,
} from "./results-data.js";

const byId = (id) => document.getElementById(id);
let chart;
let currentResults;
const format = (value) => value.toFixed(3);

export function hasResults() {
  return Boolean(currentResults);
}

export function showDistribution(phenotype) {
  const data = currentResults.map((result) => result[phenotype]);
  const summary = calculateSummaryStatistics(data);
  const { bins, frequencies, binWidth } = createHistogramBins(data);
  byId("phenotypeSelect").value = phenotype;
  for (const row of byId("summaryStats").rows) {
    const selected = row.dataset.phenotype === phenotype;
    row.classList.toggle("is-selected", selected);
    row.querySelector("button").setAttribute("aria-pressed", String(selected));
  }
  if (chart) chart.destroy();
  // Chart.js' original bar controller supplies scales, resize and tooltip behavior.
  chart = new Chart(byId("distributionChart"), {
    type: "bar",
    data: {
      labels: bins.map((value) => value.toFixed(3)),
      datasets: [
        {
          label: "Simulations",
          data: frequencies,
          backgroundColor: "#3966a5",
          hoverBackgroundColor: "#172f55",
          borderWidth: 0,
          barPercentage: 0.98,
          categoryPercentage: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { top: 6, right: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#172f55",
          padding: 11,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const i = items[0].dataIndex;
              return `${bins[i].toFixed(4)} to ${(bins[i] + binWidth).toFixed(4)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          title: {
            display: true,
            text: "Simulations",
            color: "#657183",
            font: { family: "IBM Plex Sans", size: 11 },
          },
          ticks: {
            precision: 0,
            color: "#657183",
            font: { family: "IBM Plex Sans", size: 10 },
          },
          grid: { color: "#edf0f5", drawTicks: false },
        },
        x: {
          title: {
            display: true,
            text: "PRS score",
            color: "#657183",
            font: { family: "IBM Plex Sans", size: 11 },
          },
          ticks: {
            color: "#657183",
            maxRotation: 0,
            maxTicksLimit: 6,
            font: { family: "IBM Plex Sans", size: 10 },
          },
          grid: { display: false },
          border: { color: "#dce1e8" },
        },
      },
    },
  });
  byId("distributionChart").setAttribute(
    "aria-label",
    `${phenotypeLabel(phenotype)}: ${data.length} simulation trials. Mean ${format(summary.mean)}, minimum ${format(summary.min)}, maximum ${format(summary.max)}.`,
  );
  byId("distributionSummary").textContent =
    `${data.length.toLocaleString()} trials. Mean ${format(summary.mean)}; scores range from ${format(summary.min)} to ${format(summary.max)}.`;
}

export function displayResults(results, file, duration) {
  if (
    !results.length ||
    results.some((row) => PHENOTYPES.some((key) => !Number.isFinite(row[key])))
  )
    throw new Error(
      "The calculation returned incomplete scores. No new results were displayed.",
    );
  currentResults = results;
  const body = byId("summaryStats");
  body.replaceChildren();
  byId("phenotypeSelect").replaceChildren();
  for (const phenotype of PHENOTYPES) {
    const row = body.insertRow();
    row.dataset.phenotype = phenotype;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "phenotype-button";
    button.textContent = phenotypeLabel(phenotype);
    button.setAttribute(
      "aria-label",
      `Show ${phenotypeLabel(phenotype)} distribution`,
    );
    button.addEventListener("click", () => showDistribution(phenotype));
    row.insertCell().append(button);
    const summary = calculateSummaryStatistics(
      results.map((result) => result[phenotype]),
    );
    for (const key of ["mean", "median", "stdDev", "min", "max"])
      row.insertCell().textContent = format(summary[key]);
    byId("phenotypeSelect").add(
      new Option(phenotypeLabel(phenotype), phenotype),
    );
  }
  byId("runFileName").textContent = file.name;
  byId("runFileName").title = file.name;
  byId("runMeta").textContent =
    `${results.length.toLocaleString()} trials • ${(duration / 1000).toFixed(1)} s`;
  byId("emptyResults").hidden = true;
  byId("results").hidden = false;
  byId("exportResults").hidden = false;
  byId("resultState").textContent = "Analysis complete";
  showDistribution(PHENOTYPES[0]);
}

export function initializeResults() {
  byId("phenotypeSelect").addEventListener("change", (event) =>
    showDistribution(event.target.value),
  );
  byId("exportResults").addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([createResultsCsv(currentResults)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "fastimpute-prs313.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
