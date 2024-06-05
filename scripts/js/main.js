import { process23andMeData } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome} from "./load_model.js";

// Write a function that replaces all NaN values with 0 in an array


function replaceNaNWithZero(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (isNaN(arr[i])) {
      arr[i] = 0;
    }
  }
}

async function imputePRS313() {
  const ttandMeData = await process23andMeData();
  
  const PRS313_snps = [];
  for (let i = 1; i <= 22; i++) {
      let inputData = preprocessDataForChromosome(i, ttandMeData[`chr${i}`].non_PRS313);
      replaceNaNWithZero(inputData)

      if (inputData) {
          const predictions = await makePredictions(i, inputData);
          const roundedPredictions = predictions.map(Math.round);
          PRS313_snps.push(roundedPredictions);
          // console.log(roundedPredictions);
      }
  }
  const totalElements = PRS313_snps.reduce((acc, list) => acc + list.length, 0);
  
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


