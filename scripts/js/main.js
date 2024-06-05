import { process23andMeData } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome} from "./load_model.js";

async function imputePRS313() {
  const ttandMeData = await process23andMeData();
  alert('Data processed successfully. Check the console for details.');
  
  debugger
  const PRS313_snps = [];
  for (let i = 1; i <= 22; i++) {
      const inputData = preprocessDataForChromosome(i, ttandMeData[`chr${i}`].non_PRS313);
      if (inputData) {
          const predictions = await makePredictions(i, inputData);
          PRS313_snps.push(predictions);
      }
  }
  console.log('PRS313 SNPs:', PRS313_snps);
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllModels();
  document
    .getElementById("processFiles")
    .addEventListener("click", imputePRS313);
});


