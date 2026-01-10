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
      timeout: 120000   // ⬅ 2 MINUTE launch timeout
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000
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
        status:true,
        original:data.found,
        player:final
      });
    }

    return res.json({
      status:false,
      msg:"Download link not found",
      all_links:data.all
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
