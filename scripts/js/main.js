import { process23andMeData, readAndmeFile } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome } from "./load_model.js";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { Chart, registerables } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm";
Chart.register(...registerables);

function simulateAlleleDosages(maf) {
  return (Math.random() < maf ? 1 : 0) + (Math.random() < maf ? 1 : 0);
}

function replaceNaNWithSimulation(arr, mafData) {
  return arr.map((snp) => {
    if (isNaN(snp.value)) {
      const mafEntry = mafData.find((row) => row.SNP === snp.key);
      if (mafEntry) {
        const maf = parseFloat(mafEntry.MAF);
        return { key: snp.key, value: simulateAlleleDosages(maf) };
      }
    }
    return snp;
  });
}

async function loadBetaValues() {
  const response = await fetch("https://raw.githubusercontent.com/aaronge-2020/DeepImpute/main/Data/PRS313_with_23andMe.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 0 });
}

async function loadTrueLabelsHeaders(chrNumber) {
  const response = await fetch(`https://raw.githubusercontent.com/aaronge-2020/DeepImpute/main/Data/y_test_labels_unphased/chr${chrNumber}_true_labels_y_test.csv`);
  const csvText = await response.text();
  return Papa.parse(csvText, { header: false }).data[0];
}

function calculatePRS313Scores(dosages, betaValues, trueLabelsHeaders) {
  const scores = {
    "Overall Breast Cancer": 0,
    "ER-positive": 0,
    "ER-negative": 0,
    "hybrid ER-positive": 0,
    "hybrid ER-negative": 0,
  };

  dosages.forEach((dosage, index) => {
    const [chromosome, position] = trueLabelsHeaders[index + 1].match(/chr(\d+)_(\d+)_/).slice(1, 3);
    const betaRow = betaValues.find(row => row["Chromosome"] === parseInt(chromosome) && row["Positionb"] === parseInt(position.replace(/,/g, "")));

    if (betaRow) {
      scores["Overall Breast Cancer"] += dosage * parseFloat(betaRow["Overall Breast Cancer"]);
      scores["ER-positive"] += dosage * parseFloat(betaRow["ER-positive"]);
      scores["ER-negative"] += dosage * parseFloat(betaRow["ER-negative"]);
      scores["hybrid ER-positive"] += dosage * parseFloat(betaRow["hybrid ER-negative"]);
      scores["hybrid ER-negative"] += dosage * parseFloat(betaRow["hybrid ER-positive"]);
    }
  });

  return scores;
}

async function imputePRS313(ttandMeData) {
  const betaValues = await loadBetaValues();
  const X = parseInt(document.getElementById("numTrials").value, 10);
  document.getElementById("totalSimulations").textContent = X;
  document.getElementById("progressCount").textContent = 0;

  const simulatedResults = [];
  const fetchPromises = [];

  for (let i = 1; i <= 22; i++) {
    fetchPromises.push(fetch(`https://raw.githubusercontent.com/aaronge-2020/DeepImpute/main/Data/MAF_calculations/23AndMe_PRS313_merged_chr${i}_MAF.csv`).then(res => res.text()).then(text => Papa.parse(text, { header: true }).data));
    fetchPromises.push(loadTrueLabelsHeaders(i));
  }

  const results = await Promise.all(fetchPromises);
  const mafDataArray = results.filter((_, index) => index % 2 === 0);
  const trueLabelsHeadersArray = results.filter((_, index) => index % 2 !== 0);

  for (let sim = 0; sim < X; sim++) {
    const allDosages = [];
    const allHeaders = [];

    for (let i = 1; i <= 22; i++) {
      let inputData = preprocessDataForChromosome(i, ttandMeData[`chr${i}`].non_PRS313);
      if (!inputData) continue;

      const mafData = mafDataArray[i - 1];
      const trueLabelsHeaders = trueLabelsHeadersArray[i - 1];

      const simulatedData = replaceNaNWithSimulation(inputData, mafData);
      const inputDataValues = simulatedData.map((snp) => snp.value);

      if (inputDataValues) {
        const predictions = await makePredictions(i, inputDataValues);
        const roundedPredictions = predictions.map(Math.round);

        const actualDosages = trueLabelsHeaders.slice(1).map((header, index) => {
          const [chr, pos, ref, alt] = header.split("_");
          const snpKey = `${chr}_${pos}_${ref}_${alt}_combined_PRS313`;
          return isNaN(ttandMeData[`${chr}`].PRS313[snpKey]) ? roundedPredictions[index] : ttandMeData[`${chr}`].PRS313[snpKey];
        });

        allDosages.push(...actualDosages);
        allHeaders.push(...trueLabelsHeaders.slice(1));
      }
    }

    const scores = calculatePRS313Scores(allDosages, betaValues, ["header", ...allHeaders]);
    simulatedResults.push(scores);
    console.log(`Simulation ${sim + 1} PRS313 Scores:`, scores);
    document.getElementById("progressCount").textContent = sim + 1;
  }

  displayResults(simulatedResults);
}

function calculateSummaryStatistics(data) {
  const mean = data.reduce((acc, val) => acc + val, 0) / data.length;
  const sortedData = data.sort((a, b) => a - b);
  const median = sortedData.length % 2 === 0 ? (sortedData[sortedData.length / 2 - 1] + sortedData[sortedData.length / 2]) / 2 : sortedData[Math.floor(sortedData.length / 2)];
  const variance = data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / data.length;
  return { mean, median, stdDev: Math.sqrt(variance), min: Math.min(...data), max: Math.max(...data) };
}

function displayResults(simulatedResults) {
  const phenotypes = ['Overall Breast Cancer', 'ER-positive', 'ER-negative', 'hybrid ER-positive', 'hybrid ER-negative'];
  const container = document.getElementById('results');
  

  let rowDiv = document.createElement('div');
  rowDiv.className = 'row';

  phenotypes.forEach((phenotype, index) => {
      const data = simulatedResults.map(result => result[phenotype]);

      // Calculate summary statistics
      const summary = calculateSummaryStatistics(data);

      const cardDiv = document.createElement('div');
      cardDiv.className = 'col-lg-4 col-md-6 col-sm-12 mb-4';

      const card = document.createElement('div');
      card.className = 'card shadow-sm h-100';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'card-header bg-primary text-white';
      cardHeader.textContent = phenotype;

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body d-flex flex-column';

      const summaryList = document.createElement('ul');
      summaryList.className = 'list-unstyled mb-4';
      summaryList.innerHTML = `
          <li><strong>Mean:</strong> ${summary.mean.toFixed(2)}</li>
          <li><strong>Median:</strong> ${summary.median.toFixed(2)}</li>
          <li><strong>Standard Deviation:</strong> ${summary.stdDev.toFixed(2)}</li>
          <li><strong>Min:</strong> ${summary.min.toFixed(2)}</li>
          <li><strong>Max:</strong> ${summary.max.toFixed(2)}</li>`;

      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container flex-grow-1';
      const chartCanvas = document.createElement('canvas');
      chartContainer.appendChild(chartCanvas);

      cardBody.appendChild(summaryList);
      cardBody.appendChild(chartContainer);
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      cardDiv.appendChild(card);
      rowDiv.appendChild(cardDiv);

      // Create binned histogram chart
      createBinnedHistogram(chartCanvas, phenotype, data);

      if ((index + 1) % 3 === 0) {
          container.appendChild(rowDiv);
          rowDiv = document.createElement('div');
          rowDiv.className = 'row';
      }
  });

  if (rowDiv.children.length > 0) {
      container.appendChild(rowDiv);
  }

  document.getElementById('loading').style.display = 'none';
  document.getElementById('results').style.display = 'flex';
}

function createBinnedHistogram(ctx, phenotype, data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binCount = 10;
  const binWidth = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => min + i * binWidth);

  const frequencies = new Array(binCount).fill(0);
  data.forEach(value => {
    const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binWidth));
    frequencies[binIndex]++;
  });

  const labels = bins.map(bin => `${bin.toFixed(2)}`);
  const histogramData = {
    labels: labels,
    datasets: [{
      label: phenotype,
      data: frequencies,
      backgroundColor: "rgba(75, 192, 192, 0.2)",
      borderColor: "rgba(75, 192, 192, 1)",
      borderWidth: 1,
    }],
  };

  new Chart(ctx, {
    type: "bar",
    data: histogramData,
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Frequency" },
        },
        x: {
          title: { display: true, text: "PRS Score Range" },
        },
      },
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllModels();
  document.getElementById("processFiles").addEventListener("click", async () => {
    const andmeDataFile = document.getElementById("andmeDataFile").files[0];
    if (andmeDataFile) {
      const container = document.getElementById('results');
      container.innerHTML = ''; // Clear previous results
      document.getElementById("loading").style.display = "flex";
      try {
        const andmeDataContent = await readAndmeFile(andmeDataFile);
        const chromosomeWiseData = await process23andMeData(andmeDataContent);
        await imputePRS313(chromosomeWiseData);
        document.getElementById("loading").style.display = "none";
        document.getElementById("results").style.display = "block";
      } catch (error) {
        console.error("Error processing file:", error);
        document.getElementById("loading").style.display = "none";
      }
    } else {
      alert("Please upload a 23andMe data file.");
    }
  });
});

const numTrialsSlider = document.getElementById("numTrials");
const numTrialsValueLabel = document.getElementById("numTrialsValue");
numTrialsSlider.addEventListener("input", () => {
  numTrialsValueLabel.textContent = numTrialsSlider.value;
});
