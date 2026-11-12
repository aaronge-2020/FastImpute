import { process23andMeData, readAndmeFile } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome } from "./load_model.js";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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
      scores["hybrid ER-positive"] += dosage * parseFloat(betaRow["hybrid ER-positive"]);
      scores["hybrid ER-negative"] += dosage * parseFloat(betaRow["hybrid ER-negative"]);
    }
  });

  return scores;
}

async function imputePRS313(ttandMeData, X, onProgress) {
  const betaValues = await loadBetaValues();

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
    onProgress(sim + 1);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return simulatedResults;
}


let modelsPromise;

function loadLibrary(name, url) {
  if (window[name]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => { script.remove(); reject(new Error('Library load timed out')); }, 60000);
    script.src = url;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Library failed to load')); };
    document.head.append(script);
  });
}

export async function runAnalysis(file, {trials, onStage, onProgress}) {
  await Promise.all([
    loadLibrary('Papa', 'https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js'),
    loadLibrary('ort', 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js')
  ]);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  onStage('Loading chromosome models', 'Preparing 22 chromosome models. Genetic data stays in this browser.');
  if (!modelsPromise) modelsPromise = loadAllModels().catch(error => { modelsPromise = undefined; throw error; });
  await modelsPromise;
  onStage('Reading genotype data', 'Matching the selected file to the model input variants.');
  const andmeDataContent = await readAndmeFile(file);
  const chromosomeWiseData = await process23andMeData(andmeDataContent);
  onStage('Running simulations', 'Loading reference frequencies and scoring each simulation trial.');
  return imputePRS313(chromosomeWiseData, trials, onProgress);
}
