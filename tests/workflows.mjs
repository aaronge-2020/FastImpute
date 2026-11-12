import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:4173";
const output = "docs/design/ui-2026-11-11/evidence";
const liveTrials = Number(process.env.LIVE_TRIALS || 10);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.dismiss());
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#processFiles").click();
  await page
    .locator("#analysisError")
    .waitFor({ state: "visible", timeout: 3000 });
  assert.match(
    await page.locator("#analysisError").innerText(),
    /choose|select/i,
  );
  console.log("PASS: no-file validation is visible inline");
  const chooseFile = page.waitForEvent("filechooser");
  await page.getByText("Choose file", { exact: true }).click();
  await (
    await chooseFile
  ).setFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("a,b,c"),
  });
  await page.waitForFunction(() =>
    document.querySelector("#analysisError").textContent.includes("non-empty"),
  );
  assert.match(await page.locator("#analysisError").innerText(), /\.txt/);
  console.log("PASS: unsupported files are rejected");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "not-genotypes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("This is a plain text document."),
    });
  await page.waitForFunction(() =>
    document.querySelector("#fileStatus").textContent.includes("Ready"),
  );
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector("#analysisError")
      .textContent.includes("tab-separated"),
  );
  assert.equal(await page.locator("#processFiles").isEnabled(), true);
  console.log(
    "PASS: malformed genotype content fails visibly and restores controls",
  );
  await page.locator("#trialCount").fill("0");
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  assert.match(
    await page.locator("#analysisError").innerText(),
    /whole number/,
  );
  await page.locator("#trialCount").fill("10");
  assert.equal(await page.locator("#numTrials").inputValue(), "10");
  await page.locator("#numTrials").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#trialCount").inputValue(), "11");
  console.log("PASS: number and slider synchronize with keyboard controls");
  await page.getByRole("link", { name: "Methodology", exact: true }).click();
  await page.locator("#methodologyView").waitFor({ state: "visible" });
  assert.equal(await page.locator("#methodologyView").isVisible(), true);
  await page
    .getByRole("link", { name: "Back to analysis", exact: true })
    .click();
  await page.locator("#analysisView").waitFor({ state: "visible" });
  assert.equal(await page.locator("#trialCount").inputValue(), "11");
  assert.match(await page.locator("#fileStatus").innerText(), /Ready/);
  console.log(
    "PASS: methodology navigation preserves selected file and settings",
  );
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.waitForFunction(
    () => !document.querySelector("#fileStatus").textContent,
  );
  await page.locator(".filepond--item").waitFor({ state: "detached" });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({
    path: `${output}/integrated-empty-desktop.png`,
    fullPage: true,
  });
  for (const width of [390, 768, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `page overflow at ${width}px`,
    );
    if (width === 390)
      await page.screenshot({
        path: `${output}/integrated-empty-mobile.png`,
        fullPage: true,
      });
  }
  console.log("PASS: empty workspace fits 390, 768, 1440 and 1920px viewports");
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (process.argv.includes("--live")) {
    const outgoing = [];
    page.on("request", (r) => {
      if (r.url().startsWith("http"))
        outgoing.push({ method: r.method(), url: r.url() });
    });
    await page
      .getByRole("button", { name: "Use example data", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector("#fileStatus").textContent.includes("Ready"),
      {},
      { timeout: 30000 },
    );
    await page.locator("#trialCount").fill(String(liveTrials));
    await page
      .getByRole("button", { name: "Run analysis", exact: true })
      .click();
    await page.locator("#loading").waitFor({ state: "visible" });
    assert.equal(await page.locator("#processFiles").isDisabled(), true);
    await page.screenshot({
      path: `${output}/integrated-running-desktop.png`,
      fullPage: true,
    });
    console.log(
      `RUNNING: real public example, 22 ONNX models, ${liveTrials} simulation trials`,
    );
    await page.waitForFunction(
      () =>
        !document.querySelector("#results").hidden ||
        !document.querySelector("#analysisError").hidden,
      {},
      { timeout: 180000 },
    );
    assert.equal(
      await page.locator("#analysisError").isVisible(),
      false,
      await page.locator("#analysisError").innerText(),
    );
    assert.equal(await page.locator("#summaryStats tr").count(), 5);
    assert.equal(
      await page.locator("#progressCount").innerText(),
      String(liveTrials),
    );
    await page.screenshot({
      path: `${output}/integrated-results-desktop.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Show ER-negative distribution",
        exact: true,
      })
      .click();
    assert.equal(
      await page.locator("#phenotypeSelect").inputValue(),
      "ER-negative",
    );
    await page.locator("#phenotypeSelect").selectOption("hybrid ER-positive");
    assert.match(
      await page.locator("#distributionChart").getAttribute("aria-label"),
      /Hybrid ER-positive/,
    );
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    await download.saveAs(`${output}/live-results.csv`);
    const { readFile } = await import("node:fs/promises");
    const csv = await readFile(`${output}/live-results.csv`, "utf8");
    assert.equal(csv.trim().split("\r\n").length, liveTrials + 1);
    assert.equal(csv.split("\r\n")[1].split(",").length, 6);
    assert.ok(
      csv
        .trim()
        .split("\r\n")
        .slice(1)
        .every((row) =>
          row.split(",").every((n) => Number.isFinite(Number(n))),
        ),
    );
    await page.getByRole("link", { name: "Methodology", exact: true }).click();
    await page
      .getByRole("link", { name: "Back to analysis", exact: true })
      .click();
    await page.locator("#analysisView").waitFor({ state: "visible" });
    assert.equal(await page.locator("#summaryStats tr").count(), 5);
    for (const width of [390, 768, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `results page overflow at ${width}px`,
      );
      if (width === 390) {
        await page.screenshot({
          path: `${output}/integrated-results-mobile.png`,
          fullPage: true,
        });
        await page.locator(".table-responsive").focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(
          () => document.querySelector(".table-responsive").scrollLeft > 0,
        );
      }
    }
    assert.equal(
      outgoing.some((r) => r.method !== "GET"),
      false,
      "genotype analysis must not POST genetic data",
    );
    await writeFile(
      `${output}/live-requests.json`,
      JSON.stringify(outgoing, null, 2),
    );
    console.log(
      "PASS: real inference, five rows, selected charts, CSV export, navigation and responsive results",
    );
  }
  assert.deepEqual(errors, [], "browser runtime errors");
  console.log("PASS: no browser runtime errors");
} finally {
  await browser.close();
}
