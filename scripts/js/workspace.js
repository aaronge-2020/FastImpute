import {
  displayResults,
  initializeResults,
  hasResults,
} from "./results-view.js";
const byId = (id) => document.getElementById(id);
let selectedFile;
let running = false;
let pond;

function showError(message) {
  byId("analysisError").textContent = message;
  byId("analysisError").hidden = false;
  byId("analysisError").focus({ preventScroll: true });
}
function clearError() {
  byId("analysisError").hidden = true;
}
function selected(file) {
  selectedFile = file;
  clearError();
  byId("fileStatus").textContent = file
    ? `${(file.size / 1048576).toFixed(1)} MB selected. Ready to analyze.`
    : "";
  if (hasResults()) byId("resultState").textContent = "Previous analysis";
}
function setBusy(busy) {
  running = busy;
  byId("setupFields").disabled = busy;
  byId("processFiles").disabled = busy;
  byId("processFiles").querySelector("span").textContent = busy
    ? "Running analysis…"
    : "Run analysis";
  if (pond) pond.disabled = busy;
  document
    .querySelector(".results-card")
    .setAttribute("aria-busy", String(busy));
}
function showProgress(stage, detail) {
  byId("progressStage").textContent = stage;
  byId("progressDetail").textContent = detail;
}

function setupFileInput() {
  const fileInput = byId("andmeDataFile");
  if (!window.FilePond) {
    fileInput.addEventListener("change", () => selected(fileInput.files[0]));
    return;
  }
  pond = FilePond.create(fileInput, {
    allowMultiple: false,
    maxFiles: 1,
    allowReplace: true,
    allowRevert: false,
    allowProcess: false,
    instantUpload: false,
    server: null,
    credits: false,
    labelIdle:
      '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z"/><path d="M14 3v6h5M8 14h8m-8 3h5"/></svg><span>Drop your 23andMe file here</span><span class="filepond--label-action">Choose file</span>',
    labelFileProcessingComplete: "Ready",
    beforeAddFile: (item) => {
      if (!/\.txt$/i.test(item.file.name) || !item.file.size) {
        showError("Choose a non-empty 23andMe .txt file.");
        return false;
      }
      return true;
    },
    onaddfile: (error, item) => {
      if (error) showError("The file could not be read. Choose it again.");
      else selected(item.file);
    },
    onremovefile: () => selected(undefined),
  });
}

async function useExample() {
  clearError();
  byId("useExample").disabled = true;
  byId("processFiles").disabled = true;
  byId("useExample").textContent = "Loading example…";
  byId("fileStatus").textContent = "Loading the public example genotype file.";
  try {
    const response = await fetch("./test_files/11576.23andme.9465.txt");
    if (!response.ok) throw new Error("Example unavailable");
    const file = new File([await response.blob()], "example-23andme.txt", {
      type: "text/plain",
    });
    if (pond) await pond.addFile(file);
    else selected(file);
  } catch {
    showError(
      "Could not load the example file. Check your connection or choose a local .txt file.",
    );
    byId("fileStatus").textContent = "";
  } finally {
    byId("useExample").disabled = false;
    byId("processFiles").disabled = false;
    byId("useExample").textContent = "Use example data";
  }
}

async function submit(event) {
  event.preventDefault();
  if (running) return;
  clearError();
  if (!selectedFile)
    return showError(
      "Choose a 23andMe .txt file or use the example data before running an analysis.",
    );
  const trials = Number(byId("trialCount").value);
  if (!Number.isInteger(trials) || trials < 10 || trials > 1000)
    return showError(
      "Enter a whole number of simulation trials from 10 to 1,000.",
    );
  if (!/\.txt$/i.test(selectedFile.name) || !selectedFile.size)
    return showError("Choose a non-empty 23andMe .txt file.");
  const file = selectedFile;
  setBusy(true);
  try {
    const sample = await file.slice(0, 131072).text();
    const valid = sample
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith("#"))
      .some((line) => {
        const columns = line.trim().split("\t");
        return (
          columns.length >= 4 &&
          /^(?:[1-9]|1\d|2[0-2]|X|Y|MT)$/i.test(columns[1]) &&
          /^\d+$/.test(columns[2]) &&
          /^(?:[ACGTID]{1,2}|--)$/i.test(columns[3])
        );
      });
    if (!valid)
      throw new Error(
        "This file does not look like raw 23andMe data. Choose a tab-separated file with rsid, chromosome, position, and genotype columns.",
      );
    byId("results").hidden = true;
    byId("exportResults").hidden = true;
    byId("emptyResults").hidden = true;
    byId("loading").hidden = false;
    byId("resultState").textContent = "Analysis in progress";
    byId("totalSimulations").textContent = trials.toLocaleString();
    byId("progressCount").textContent = "0";
    byId("progressBar").style.width = "0%";
    byId("simulationProgress").setAttribute("aria-valuenow", "0");
    showProgress(
      "Preparing analysis",
      "Loading the calculation libraries. The first run may take longer.",
    );
    const started = performance.now();
    const { runAnalysis } = await import("./main.js");
    const results = await runAnalysis(file, {
      trials,
      onStage: showProgress,
      onProgress: (count) => {
        byId("progressCount").textContent = count.toLocaleString();
        const percent = Math.round((count / trials) * 100);
        byId("progressBar").style.width = `${percent}%`;
        byId("simulationProgress").setAttribute(
          "aria-valuenow",
          String(percent),
        );
        if (count === 1 || count === trials || count % 10 === 0)
          byId("progressDetail").textContent =
            `Completed ${count.toLocaleString()} of ${trials.toLocaleString()} simulation trials.`;
      },
    });
    displayResults(results, file, performance.now() - started);
    byId("resultsTitle").setAttribute("tabindex", "-1");
    byId("resultsTitle").focus({ preventScroll: true });
    if (matchMedia("(max-width:820px)").matches)
      document
        .querySelector(".results-card")
        .scrollIntoView({ block: "start" });
  } catch (error) {
    const technical = /fetch|module|network|script|load/i.test(error.message);
    showError(
      technical
        ? "The analysis could not load its model or reference files. Check your connection and try again."
        : error.message,
    );
    byId("results").hidden = !hasResults();
    byId("exportResults").hidden = !hasResults();
    byId("emptyResults").hidden = hasResults();
    byId("resultState").textContent = hasResults()
      ? "Last completed analysis"
      : "Analysis failed";
  } finally {
    byId("loading").hidden = true;
    setBusy(false);
  }
}

let activeView;
const scrollPositions = { analysis: 0, methodology: 0 };
function route() {
  const view = location.hash === "#methodology" ? "methodology" : "analysis";
  if (view === activeView) return;
  if (activeView) scrollPositions[activeView] = window.scrollY;
  byId("analysisView").hidden = view !== "analysis";
  byId("methodologyView").hidden = view !== "methodology";
  for (const name of ["analysis", "methodology"]) {
    const link = byId(`${name}Link`);
    if (name === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  document.title = `FastImpute | ${view === "analysis" ? "Genotype analysis" : "Methodology"}`;
  if (activeView) window.scrollTo(0, scrollPositions[view]);
  activeView = view;
}

setupFileInput();
initializeResults();
byId("useExample").addEventListener("click", useExample);
byId("analysisForm").addEventListener("submit", submit);
byId("numTrials").addEventListener("input", (event) => {
  byId("trialCount").value = event.target.value;
  clearError();
});
byId("trialCount").addEventListener("input", (event) => {
  const n = Number(event.target.value);
  if (Number.isInteger(n) && n >= 10 && n <= 1000) byId("numTrials").value = n;
  clearError();
});
window.addEventListener("hashchange", route);
route();
