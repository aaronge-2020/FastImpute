# Interface validation, November 11, 2026

Implemented on `codex/professional-workbench`, based on FastImpute commit `63887178cacc7e33c29a3ce92d44a1e647561db0`. Aaron subsequently requested publication to `main`. The release uses the repository's existing [GitHub Pages build and deployment](https://github.com/aaronge-2020/FastImpute/actions), followed by verification of the published assets and live analysis workflow.

## Verified checks

- `npm test`: 4 tests passed. These protect histogram trial counts and upper boundaries, identical scores, the original summary definitions without input mutation, and unrounded trial-level CSV output. All four were first observed failing before implementation.
- `npm run check`: syntax checks passed for the calculation adapter and new UI modules. This is a static application and has no compilation/build step.
- `npm run test:ui -- --live`: passed using the public 17 MB example and all 22 local ONNX models. Both 10-trial and 100-trial runs were exercised. The last retained result artifact contains 100 trials and five phenotype columns, plus a header.
- `npm run test:recovery`: passed. A deliberately interrupted chromosome-model request showed an inline error and restored controls. Removing the interruption allowed retry to finish. A subsequent run replaced the five-row table, five selector options and chart without accumulating results.
- `git diff --check`: passed; Git reports the repository's normal LF-to-CRLF conversion warning for index.html.

Browser journeys cover the actual visible file chooser, unsupported extension, malformed genotype text, missing file, invalid trial count, keyboard adjustment of the trial slider, file removal, local public-example loading, disabled controls while running, progress counts, completed results, phenotype row selection, dropdown selection, CSV download, and navigation to methodology and back without losing file/settings/results.

Responsive checks use headless Chromium at widths 390, 768, 1440 and 1920 pixels. No page-level horizontal overflow remained in the tested empty or completed states. The full results table scrolls inside its own labeled, keyboard-focusable region on narrow screens. The mobile chart is bounded during resize, while Chart.js performs its responsive redraw. Keyboard scrolling of the table was verified. No browser runtime errors were observed in the final workflow run.

Captured analysis requests in `evidence/live-requests.json` were GET requests for the example, libraries, models, and reference files. No genetic-data POST was observed. This records the exercised request path; it is not a general privacy or security certification.

## Visual comparison

- `before-desktop.png`: original FastImpute page, 1440 × 1000 viewport.
- `tabler-original-form.png` and `tabler-unchanged-local.png`: original and locally replayed unchanged primary form example, 1440 × 1000. Their screenshot SHA-256 hashes are identical: `f6ba660908ebfa91d5b1f189e3918ce79b6c63596309ed72329ba97e3e03f244`.
- `filepond-original-desktop.png` and `chartjs-original-desktop.png`: secondary reference demonstrations.
- `integrated-empty-desktop.png` and `integrated-empty-mobile.png`: actual initial application state.
- `integrated-running-desktop.png`: actual model-loading/progress state.
- `integrated-results-desktop.png` and `integrated-results-mobile.png`: real public-example output, not seeded concept values.
- `model-failure.png`: controlled network failure through the real run button and loader.

The complete unchanged Tabler source and runnable published form page remain in the scratch location recorded in REUSE-AUDIT.md. Its original account/payment example content differs from this application's genotype content; the screenshots establish the unchanged baseline and compare its layout and component behavior, rather than claiming pixel equivalence between different forms. The integrated copy retains the original library controllers and is tailored to this application's workflow.

The rejected teal concept was replaced by the requested navy-and-white concept. `concept-navy.png` is the generated reference; exact prompts are in IMAGE-PROMPTS.md. The app adds the original min/max statistics, a truthful empty state, methods, and recoverable errors to that concept.

## Limits

This verifies interface behavior and execution of the existing public example. It does not establish clinical validity, score calibration, imputation accuracy on other datasets, or suitability for medical decisions. The scientific preparation and scoring formulas were retained, not independently revalidated in this UI task. Network access is still required for uncached reference tables and calculation libraries. Browser checks used Windows headless Chromium and viewport emulation; physical mobile devices, Safari, Firefox and assistive-technology listening were not tested. The 1,000-trial maximum was not benchmarked. Aaron's subjective design acceptance remains open.
