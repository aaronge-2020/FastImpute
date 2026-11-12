# FastImpute interface redesign

Job: select a local genotype file, configure simulations, run the existing model, and inspect or export the five score distributions.

The reference is a scientific desktop analysis tool, with Tabler's form workspace as the primary implementation. Must-haves: a static browser deployment; accessible local file selection; numeric trial controls; honest loading and failure states; compact five-phenotype results; responsive charts and exports. Constraints: retain the existing JavaScript/ONNX calculation, GitHub Pages hosting, and local handling of genetic data. No accounts, upload service, clinical interpretation, or new scientific method.

Skills used: clone-website (including primary-baseline and inspection-guide), frontend-design, Uncodixfy, imagegen, webapp-testing, humanizer, test-driven-development, verification-before-completion. The installed catalog was checked for interface redesign, file input, and application testing. Level 2 applies to the interface foundation. Literature and method selection are out of scope: the scientific method is retained.

## Search and decision

Searches included “genomics analysis web interface open source scientific UI bootstrap”, “Galaxy bioinformatics interface open source alternative user interface”, “Tabler dashboard form wizard”, “scientific analysis dashboard”, “local file upload”, and “interactive histogram”. GitHub searches used in:name,description,readme; stars:>100; pushed:>2025-11-11; topic:bootstrap/file-upload/charts; language:HTML/JavaScript; license:MIT; archived:false; sorted by stars and updated. These restrictive web-index searches were noisy, so the known upstream repositories, GitHub file-upload and chart topics, npm package metadata, and actual demos were checked directly.

Directory checks: OpenAlternative, opensourcealternative.to, AlternativeTo, LibHunt FilePond alternatives, sindresorhus/awesome, and awesome-selfhosted. The first three did not yield a closer static implementation; the self-hosted list is not a fit for this client-only tool. Firsthand discussion: Reddit's Nuxt file-upload discussion (1cs2vki) and reactjs alternatives discussion (xxo9vw) identify FilePond and Dropzone as practical choices. Those discussions informed discovery only; implementation and license decisions use the original repositories.

| Implementation | Fit | Stars / forks | Last push | Release | License | Runtime and decision |
|---|---|---|---|---|---|---|
| [Tabler](https://github.com/tabler/tabler) | 6/6 interface capabilities, with application adapter | 42,051 / 4,433 | 2026-11-10 | @tabler/core 1.7.4, 2026-11-08 | MIT | Static CSS/JS; primary form, page, card, table, and responsive layout implementation |
| [FilePond](https://github.com/pqina/filepond) | File selection, keyboard access, removal and replacement | 16,395 / 851 | 2026-11-11 | npm 4.32.14, 2026-11-11 | MIT | Small vanilla JS dependency; retain its complete file controller, configure without a server |
| [Chart.js](https://github.com/chartjs/Chart.js) | Results display, resize, tooltip, exportable canvas | 67,790 / 11,970 | 2026-11-09 | Latest 4.6.1; retain project's 4.4.3 | MIT | Existing library retained; use its actual bar chart controller rather than a new renderer |

Repository open issue/PR counts at inspection were 107, 146, and 649 respectively. All are active and unarchived. FilePond's GitHub latest release points to old 4.28.2, while npm and current source show actively maintained 4.32.14; npm is the pin. Tabler has source tests in core/js/tests, FilePond has Jest tests, and Chart.js has browser tests. These are established dependencies, not a claim that all upstream issues are resolved. Maintenance statistics do not establish accessibility or correctness in this application; local journeys are the acceptance check.

Additional health checks from GitHub: contributor pagination (including anonymous contributors) indicated 165 for Tabler, 93 for FilePond, and 529 for Chart.js. The issue search for closures since 2026-08-13 returned 173, 1, and 7 issues respectively. FilePond issue 1083 includes collaborator replies in October 2026; Chart.js issue 9158 includes member replies from 2021 and recent follow-up from a user. The sampled Tabler issue 3569 did not contain a maintainer reply, so no response-time claim is made from that sample. FilePond's low recent issue closure count is a maintenance risk despite its current releases. Source identities recorded by npm: FilePond 4.32.14 at `2a2e2871f2fe1428bec102857d3fb5d8b2877aff`; Chart.js 4.4.3 at `3d0801299283cb6cb8e777e0cd45e6172cc43966`.

Galaxy/Galaksio would replace the scientific backend and add a server. Full admin frameworks such as AdminLTE/CoreUI add unused account/dashboard flows. Uppy adds a transport-oriented plugin system this single-file local workflow does not require. No alternative covers the application's chromosome models and scoring, so those remain the existing implementation.

## Primary baseline and direct reuse

Tabler source is pinned to `85e7da0193cf498dd72a6bfd651ce2a784d3e0a2` (@tabler/core 1.7.4). The complete, unchanged author source archive was downloaded and extracted at `C:/Users/Aaron Ge/AppData/Local/Temp/fastimpute-ui-reference-20261111/source/tabler-85e7da0193cf498dd72a6bfd651ce2a784d3e0a2`. Source: https://github.com/tabler/tabler/tree/85e7da0193cf498dd72a6bfd651ce2a784d3e0a2 .

Inspected: preview/pages/form-layout.astro, shared/components/cards/form/Layout.astro, shared/ui/FormGroup.astro, shared/layouts/{DefaultLayout,BaseLayout}.astro, core/js/tabler.ts, core/js/src, core/js/tests, core/scss, package manifests and dependencies. The full source remains inspectable, not a screenshot-only substitute.

The unchanged official form-layout HTML and all 94 requested assets were copied verbatim into the scratch `unchanged/` directory. Run `python -m http.server 4174 --bind 127.0.0.1` there; open /form-layout.html. The published CSS/JS package was installed unchanged. Original screenshots are in evidence/. The source demo's form controls, select, focus, validation layout and responsive columns are inspected before adaptation. The baseline includes many demo-only forms; its production adaptation replaces those data fields with the existing tool's data fields and removes demo accounts, themes and menus.

The integrated app retains Tabler's page/page-wrapper/container-xl structure, card/header/body/footer composition, native form controls, row/grid behavior, table styles, and bundled Bootstrap/Tabler controllers. The published CSS and JS are copied verbatim to vendor/tabler. They are not rewritten. Primary adaptations are isolated in styles/workspace.css and index.html. The original source and compiled snapshot remain unchanged in scratch.

Secondary contributions: FilePond's full published controller and stylesheet are copied verbatim to vendor/filepond; it supplies actual drag/drop, chooser, selected-file state, replacement/removal, screen-reader status, and file retrieval. Server transport and instant upload are disabled. Chart.js 4.4.3 is copied verbatim to vendor/chartjs; its actual bar renderer, tooltip, scales, resize and destruction lifecycle display the existing simulation data. No additional chart framework is introduced.

Original work is limited to application integration: file validation, trial synchronization, binding the existing inference loop to progress state, mapping returned scores into a table and selected histogram, CSV export, and methodology content based on the project README. Reusing these foundations avoids maintaining a custom uploader, chart renderer, or CSS component library.

Runtime adapter changes: the existing unversioned ONNX Runtime CDN dependency is now pinned to 1.20.1, with one WASM thread for compatibility without cross-origin isolation. Loading is awaited before inference, and the model promise is reset after a failure so retry works. The original genotype preparation, allele sampling, prediction rounding, observed-dosage substitution, and beta-weighted score calculations are retained. The inference loop yields between trials to let progress repaint. The UI histogram adds a finite plotting domain when all trial scores are identical; this does not change the scores. Statistical summaries retain the original population-variance definition and avoid sorting the caller's array in place.

## Visual direction

The first generated teal concept was rejected. Aaron selected navy and white with restrained blue accents. The second concept is saved as concept-navy.png; its illustrative values are design material only and never seed the working results. Tokens: navy #172f55, chart/focus blue #3966a5, background #f4f6f9, white #ffffff, text #242c39, border #dce1e8. IBM Plex Sans provides local typography. Rounded corners are limited to 6px; gradients, colored section banners and repeated result cards are removed.

Route map: / is the analysis workspace; /#methodology opens the methodology panel without discarding the current file or results. The source repository link retains its real destination. Publication uses the repository's existing GitHub Pages deployment from `main`, at https://aaronge-2020.github.io/FastImpute/.

See VALIDATION.md for measured checks, screenshot comparisons, and unresolved dependencies.
