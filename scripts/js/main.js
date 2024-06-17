import { process23andMeData } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome } from "./load_model.js";

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

async function imputePRS313() {
  const ttandMeData = await process23andMeData();
  
  const PRS313_snps = [];
  const X = 10; // Number of simulations

  for (let i = 1; i <= 22; i++) {
    let inputData = preprocessDataForChromosome(i, ttandMeData[`chr${i}`].non_PRS313);
    if (!inputData) continue;

    const mafData = await fetch(`../../../Data/MAF_calculations/23AndMe_PRS313_merged_chr${i}_MAF.csv`)
                           .then(response => response.text())
                           .then(text => Papa.parse(text, { header: true }).data);

    const simulatedResults = [];
    for (let sim = 0; sim < X; sim++) {
      const simulatedData = replaceNaNWithSimulation(inputData, mafData);
      const inputDataValues = simulatedData.map(snp => snp.value);

      if (inputDataValues) {
        const predictions = await makePredictions(i, inputDataValues);
        simulatedResults.push(predictions.map(Math.round));
      }
    }

    PRS313_snps.push(simulatedResults);
  }
  
  const totalElements = PRS313_snps.reduce((acc, list) => acc + list[0].length, 0);
  
  console.log('PRS313 SNPs:', PRS313_snps);
  console.log('Total number of SNPs:', totalElements);

  alert('Data processed successfully. Check the console for details.');
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllModels();
  document
    .getElementById("processFiles")
    .addEventListener("click", imputePRS313);
});
