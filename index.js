const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda'); // Add this for Chrome AWS Lambda support

const app = express();

app.get('/network', async (req, res) => {
  const url = req.query.url;
  const wait = parseInt(req.query.wait || 5000);

  if (!url) return res.json({ error: "URL required" });

  // Launch browser with chrome-aws-lambda
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    args: chromium.args,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  let logs = [];

  page.on('request', r => {
    logs.push({
      type: "request",
      url: r.url(),
      method: r.method(),
      resource: r.resourceType()
    });
  });

  page.on('response', r => {
    logs.push({
      type: "response",
      url: r.url(),
      status: r.status()
    });
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // FIX: Wait for the given time
  await new Promise(r => setTimeout(r, wait));

  await browser.close();

  res.json({
    target: url,
    wait_ms: wait,
    total: logs.length,
    logs
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Running on port", PORT);
});
