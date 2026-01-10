const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// HARDCODED chrome path (from your logs)
const CHROME_PATH =
"/opt/render/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome";

app.get("/api", async (req, res) => {
  try {

    const url = req.query.url;
    if (!url) {
      return res.json({ status: false, msg: "URL required" });
    }

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: CHROME_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 10000
    });

    await page.waitForTimeout(5000);

    const data = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a")];
      let all = [];
      let found = null;

      links.forEach(a => {
        if (a.href) {
          all.push(a.href);

          if (
            a.href.includes("iteraplay.tera-api") &&
            a.href.includes("/download?")
          ) {
            found = a.href;
          }
        }
      });

      return { found, all };
    });

    await browser.close();

    if (data.found) {
      const final =
        "https://playterabox.com/player?url=" +
        encodeURIComponent(data.found);

      return res.json({
        status: true,
        original: data.found,
        player: final
      });
    }

    return res.json({
      status: false,
      msg: "Download link not found",
      all_links: data.all
    });

  } catch (err) {
    return res.json({
      status: false,
      error: err.toString()
    });
  }
});

app.listen(process.env.PORT || 10000, () => {
  console.log("API running");
});
