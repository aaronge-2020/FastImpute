import { copyFile, mkdir, writeFile } from "node:fs/promises";
const copies = [
  ["@tabler/core/dist/css/tabler.min.css", "tabler/tabler.min.css"],
  ["@tabler/core/dist/js/tabler.min.js", "tabler/tabler.min.js"],
  ["filepond/dist/filepond.min.css", "filepond/filepond.min.css"],
  ["filepond/dist/filepond.min.js", "filepond/filepond.min.js"],
  ["filepond/LICENSE", "filepond/LICENSE"],
  ["chart.js/dist/chart.umd.js", "chartjs/chart.umd.js"],
  ["chart.js/LICENSE.md", "chartjs/LICENSE.md"],
  [
    "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2",
    "fonts/ibm-plex-sans-400.woff2",
  ],
  [
    "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2",
    "fonts/ibm-plex-sans-500.woff2",
  ],
  [
    "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2",
    "fonts/ibm-plex-sans-600.woff2",
  ],
  ["@fontsource/ibm-plex-sans/LICENSE", "fonts/LICENSE"],
];
for (const [source, dest] of copies) {
  await mkdir(`vendor/${dest.split("/")[0]}`, { recursive: true });
  await copyFile(`node_modules/${source}`, `vendor/${dest}`);
}
await writeFile(
  "vendor/README.md",
  "# Vendored browser dependencies\n\nUnmodified copies from the exact npm versions in package-lock.json. Run `npm ci && npm run vendor` to reproduce. Licenses are adjacent. Application overrides live in styles/workspace.css.\n",
);
console.log(`Copied ${copies.length} pinned library, font and license files.`);
