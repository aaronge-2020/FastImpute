import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4173", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("button", { name: "Use example data", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#fileStatus").textContent.includes("Ready"),
  );
  await page.locator("#trialCount").fill("10");
  await page.route("**/final_model_chr1.onnx", (route) => route.abort());
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await page
    .locator("#analysisError")
    .waitFor({ state: "visible", timeout: 60000 });
  assert.match(
    await page.locator("#analysisError").innerText(),
    /connection.*try again/,
  );
  assert.equal(await page.locator("#processFiles").isEnabled(), true);
  assert.equal(await page.locator("#exportResults").isHidden(), true);
  assert.equal(await page.locator("#setupFields").isDisabled(), false);
  console.log(
    "PASS: interrupted model request gives a recoverable inline error",
  );
  await page.screenshot({
    path: "docs/design/ui-2026-11-11/evidence/model-failure.png",
    fullPage: true,
  });
  await page.unroute("**/final_model_chr1.onnx");
  for (let run = 0; run < 2; run++) {
    await page
      .getByRole("button", { name: "Run analysis", exact: true })
      .click();
    await page.locator("#loading").waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        !document.querySelector("#results").hidden ||
        !document.querySelector("#analysisError").hidden,
      {},
      { timeout: 120000 },
    );
    assert.equal(await page.locator("#analysisError").isVisible(), false);
    assert.equal(await page.locator("#summaryStats tr").count(), 5);
    assert.equal(await page.locator("#phenotypeSelect option").count(), 5);
    assert.equal(
      await page.evaluate(() =>
        Chart.getChart("distributionChart").data.datasets[0].data.reduce(
          (a, b) => a + b,
          0,
        ),
      ),
      10,
    );
  }
  console.log(
    "PASS: retry succeeds and repeated runs replace the table and chart",
  );
} finally {
  await browser.close();
}
