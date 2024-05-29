import { processFiles } from "./23andMe.js";
import { loadAllModels, makePredictions, preprocessDataForChromosome} from "./load_model.js";

async function imputePRS313() {
    const ttandMeData = await processFiles();
    alert('Data processed successfully. Check the console for details.');
    
    const PRS313_snps = [];
    for (let i = 1; i <= 22; i++) {
        const inputData = preprocessDataForChromosome(i, ttandMeData);
        predictions = await makePredictions(i, inputData);
        PRS313_snps.push(predictions);
        debugger
    }
  }

document.addEventListener("DOMContentLoaded", () => {
  loadAllModels();
  document
    .getElementById("processFiles")
    .addEventListener("click", imputePRS313);
});


