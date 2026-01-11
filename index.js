const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/dom", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.send("URL missing");

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();

    // Mobile user-agent
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // wait 10 sec
    await page.waitForTimeout(10000);

    // auto scroll
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let h = 0;
        let t = setInterval(() => {
          window.scrollBy(0, 300);
          h += 300;
          if (h >= document.body.scrollHeight) {
            clearInterval(t);
            resolve();
          }
        }, 300);
      });
    });

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
