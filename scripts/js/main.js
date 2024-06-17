import { process23andMeData, readAndmeFile } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome } from "./load_model.js";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { Chart, registerables } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm";
Chart.register(...registerables);

// Function to simulate allele dosages based on MAF
function simulateAlleleDosages(maf) {
  const maternalAllele = Math.random() < maf ? 1 : 0;
  const paternalAllele = Math.random() < maf ? 1 : 0;
  const dosage = maternalAllele + paternalAllele;
  return dosage;
}

// Function to replace NaN values with a simulated allele dosage for one run
function replaceNaNWithSimulation(arr, mafData) {
  return arr.map(snp => {
    if (isNaN(snp.value)) {
      const mafEntry = mafData.find(row => row.SNP === snp.key);
      if (mafEntry) {
        const maf = parseFloat(mafEntry.MAF);
        return { key: snp.key, value: simulateAlleleDosages(maf) };
      }
    }
    return snp;
  });
}

// Function to load and parse the beta values from the XLSX file
async function loadBetaValues() {
  const response = await fetch('../../../Data/PRS313_with_23andMe.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const betaValues = XLSX.utils.sheet_to_json(sheet, { header: 0 });
  return betaValues;
}

// Function to load and parse the headers of the true labels CSV file for a specific chromosome
async function loadTrueLabelsHeaders(chrNumber) {
  const response = await fetch(`../../../Data/y_test_labels_unphased/chr${chrNumber}_true_labels_y_test.csv`);
  const csvText = await response.text();
  const parsedData = Papa.parse(csvText, { header: false });
  return parsedData.data[0]; // The first row contains the headers
}

// Function to calculate PRS313 scores
function calculatePRS313Scores(dosages, betaValues, trueLabelsHeaders) {
  const scores = {
    'Overall Breast Cancer': 0,
    'ER-positive': 0,
    'ER-negative': 0,
    'hybrid ER-positive': 0,
    'hybrid ER-negative': 0
  };

  dosages.forEach((dosage, index) => {
    const snpInfo = trueLabelsHeaders[index + 1]; // Skipping the first header (row index 0)
    const [chromosome, position] = snpInfo.match(/chr(\d+)_(\d+)_/).slice(1, 3);

    const betaRow = betaValues.find(row => row["Chromosome"] === parseInt(chromosome) && row["Positionb"] === parseInt(position.replace(/,/g, '')));
    if (betaRow) {
      scores['Overall Breast Cancer'] += dosage * parseFloat(betaRow["Overall Breast Cancerd"]);
      scores['ER-positive'] += dosage * parseFloat(betaRow["ER-positivee"]);
      scores['ER-negative'] += dosage * parseFloat(betaRow["ER-negativef"]);
      scores['hybrid ER-positive'] += dosage * parseFloat(betaRow["hybrid ER-negativeh"]);
      scores['hybrid ER-negative'] += dosage * parseFloat(betaRow["hybrid ER-positiveg"]);
    } else {
      console.log(`No beta value found for SNP ${snpInfo}`);
    }
  });

  return scores;
}

async function imputePRS313(ttandMeData) {

  // Load the 23andMe data 

  const betaValues = await loadBetaValues();
  const X = 50; // Number of simulations

  const simulatedResults = [];

  for (let sim = 0; sim < X; sim++) {
    const allDosages = [];
    const allHeaders = [];

    for (let i = 1; i <= 22; i++) {
      let inputData = preprocessDataForChromosome(i, ttandMeData[`chr${i}`].non_PRS313);
      if (!inputData) continue;

      const mafData = await fetch(`../../../Data/MAF_calculations/23AndMe_PRS313_merged_chr${i}_MAF.csv`)
                            .then(response => response.text())
                            .then(text => Papa.parse(text, { header: true }).data);

      const trueLabelsHeaders = await loadTrueLabelsHeaders(i);

      const simulatedData = replaceNaNWithSimulation(inputData, mafData);
      const inputDataValues = simulatedData.map(snp => snp.value);

      if (inputDataValues) {
        const predictions = await makePredictions(i, inputDataValues);
        const roundedPredictions = predictions.map(Math.round);

        // Replace imputed values with actual values where available
        const actualDosages = trueLabelsHeaders.slice(1).map((header, index) => {
          const [chr, pos, ref, alt] = header.split('_');
          const snpKey = `${chr}_${pos}_${ref}_${alt}_combined_PRS313`;
          if (!isNaN(ttandMeData[`${chr}`].PRS313[snpKey])) {
            return ttandMeData[`${chr}`].PRS313[snpKey];
          } else {
            return roundedPredictions[index];
          }
        });

        allDosages.push(...actualDosages);
        allHeaders.push(...trueLabelsHeaders.slice(1));
      }
    }

    const scores = calculatePRS313Scores(allDosages, betaValues, ['header', ...allHeaders]);
    simulatedResults.push(scores);
    console.log(`Simulation ${sim + 1} PRS313 Scores:`, scores);
  }

  displayResults(simulatedResults);
}

function displayResults(simulatedResults) {
  const phenotypes = ['Overall Breast Cancer', 'ER-positive', 'ER-negative', 'hybrid ER-positive', 'hybrid ER-negative'];
  const container = document.getElementById('results');
  container.innerHTML = ''; // Clear previous results

  let rowDiv = document.createElement('div');
  rowDiv.className = 'row';

  phenotypes.forEach((phenotype, index) => {
    const data = simulatedResults.map(result => result[phenotype]);

    if (index % 2 === 0 && index !== 0) {
      container.appendChild(rowDiv);
      rowDiv = document.createElement('div');
      rowDiv.className = 'row';
    }

    const colDiv = document.createElement('div');
    colDiv.className = 'col-lg-6 col-md-6 col-sm-12 mb-4';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';

    const cardBodyDiv = document.createElement('div');
    cardBodyDiv.className = 'card-body';

    const ctx = document.createElement('canvas');
    ctx.style.height = '400px'; // Set a fixed height for the canvas

    cardBodyDiv.appendChild(ctx);
    cardDiv.appendChild(cardBodyDiv);
    colDiv.appendChild(cardDiv);
    rowDiv.appendChild(colDiv);

    createBinnedHistogram(ctx, phenotype, data);
  });

  container.appendChild(rowDiv);
  document.getElementById('loading').style.display = 'none';
  document.getElementById('results').style.display = 'block';
}

function createBinnedHistogram(ctx, phenotype, data) {
  // Calculate the bin edges
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binCount = 10; // Number of bins
  const binWidth = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => min + i * binWidth);

  // Calculate frequencies for each bin
  const frequencies = new Array(binCount).fill(0);
  data.forEach(value => {
    const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binWidth));
    frequencies[binIndex]++;
  });

  const labels = bins.map((bin, i) => `${bin.toFixed(2)}`);

  const histogramData = {
    labels: labels,
    datasets: [{
      label: phenotype,
      data: frequencies,
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  };

  const config = {
    type: 'bar',
    data: histogramData,
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Frequency'
          }
        },
        x: {
          title: {
            display: true,
            text: 'PRS Score Range'
          }
        }
      }
    }
  };

  new Chart(ctx, config);
}



document.addEventListener("DOMContentLoaded", () => {
  loadAllModels();
  document
    .getElementById("processFiles")
    .addEventListener("click", async () => {

      const andmeDataFile = document.getElementById('andmeDataFile').files[0];

      if (andmeDataFile) {
          document.getElementById('loading').style.display = 'flex';
    
          try {
              const andmeDataContent = await readAndmeFile(andmeDataFile);
              const chromosomeWiseData = await process23andMeData(andmeDataContent);
    
              // Display or use `chromosomeWiseData` as required
              console.log(chromosomeWiseData);
    


              await imputePRS313(chromosomeWiseData);
              document.getElementById('loading').style.display = 'none';
              document.getElementById('results').style.display = 'block';

          } catch (error) {
              console.error('Error processing file:', error);
              document.getElementById('loading').style.display = 'none';
          }
      } else {
          alert('Please upload a 23andMe data file.');
      }
      
    });
});
