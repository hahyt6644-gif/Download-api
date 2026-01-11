const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/dom", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.send("URL missing");

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // wait 10 sec
    await page.waitForTimeout(10000);

    const html = await page.evaluate(() =>
      document.documentElement.outerHTML
    );

    await browser.close();

    res.set("Content-Type", "text/html");
    res.send(html);

  } catch (e) {
    res.send("ERROR: " + e.message);
  }
});

app.listen(PORT, () => {
  console.log("API running on", PORT);
});
