// Load all models when the document loads
async function loadAllModels() {
  const modelFolder =
    "./Data/model_results_unphased_all_PRS/linear_regression/onnx_models";
  const modelPromises = [];

  for (let i = 1; i <= 22; i++) {
    const modelPath = `${modelFolder}/final_model_chr${i}.onnx`;
    modelPromises.push(
      fetch(modelPath)
        .then((response) => response.arrayBuffer())
        .then((buffer) => ort.InferenceSession.create(buffer))
    );
  }

  const models = await Promise.all(modelPromises);
  document.models = models.reduce((acc, model, index) => {
    acc[`chr${index + 1}`] = model;
    return acc;
  }, {});

  console.log("All models loaded successfully.");
}

function preprocessDataForChromosome(chrNumber, data) {
  const chrPrefix = `chr${chrNumber}_`;
  const filteredData = {};

  for (const key in data) {
    if (key.startsWith(chrPrefix) && key.endsWith("_combined")) {
      filteredData[key] = data[key] === null ? 0 : data[key];
    }
  }

  const inputData = Object.values(filteredData);

  if (inputData.length === 0) {
    alert(
      `No data available for chromosome ${chrNumber} with '_combined' suffix.`
    );
    return null;
  }

  return inputData;
}

// Make predictions with the specified chromosome model and input data
async function makePredictions(chrNumber, inputData) {
  if (!document.models || !document.models[`chr${chrNumber}`]) {
    alert(
      `Please load all models and ensure the model for chromosome ${chrNumber} is available.`
    );
    return;
  }

  const model = document.models[`chr${chrNumber}`];

  if (!Array.isArray(inputData) || inputData.length === 0) {
    alert("Please provide valid input data.");
    return;
  }

  const tensor = new ort.Tensor("float32", Float32Array.from(inputData), [
    1,
    inputData.length,
  ]);
  const feeds = { input: tensor };
  const results = await model.run(feeds);
  const output = results.output.data;

  return output;
}

export { loadAllModels, makePredictions, preprocessDataForChromosome };
