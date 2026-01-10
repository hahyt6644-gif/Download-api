const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();

app.get("/api", async (req, res) => {
  try {

    const url = req.query.url;
    if (!url) {
      return res.json({ status:false, msg:"URL required" });
    }

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--single-process",
        "--no-zygote"
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      timeout: 120000
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    const result = await page.evaluate(() => {

      const html = document.documentElement.outerHTML;
      const links = [...document.querySelectorAll("a")];

      let found = null;

      links.forEach(a => {
        if (
          a.href.includes("iteraplay.tera-api") &&
          a.href.includes("/download?")
        ) {
          found = a.href;
        }
      });

      return { found, html };
    });

    await browser.close();

    // ✅ FOUND
    if (result.found) {

      const final =
        "https://playterabox.com/player?url=" +
        encodeURIComponent(result.found);

      return res.json({
        status:true,
        original:result.found,
        player:final
      });
    }

    // ❌ NOT FOUND → SEND HTML
    return res.json({
      status:false,
      msg:"Download link not found",
      html: result.html
    });

  } catch(err){
    return res.json({
      status:false,
      error: err.toString()
    });
  }
});

app.listen(process.env.PORT || 10000, () => {
  console.log("API running");
});
