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

    /* -----------------
       WAIT FIRST 10s
    ------------------*/
    await page.waitForTimeout(10000);

    let found = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a")];
      for (let a of links) {
        if (
          a.href.includes("iteraplay.tera-api") &&
          a.href.includes("/download?")
        ) {
          return a.href;
        }
      }
      return null;
    });

    /* -----------------
       IF NOT FOUND
       WAIT EXTRA 5s
    ------------------*/
    if (!found) {

      await page.waitForTimeout(5000);

      found = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a")];
        for (let a of links) {
          if (
            a.href.includes("iteraplay.tera-api") &&
            a.href.includes("/download?")
          ) {
            return a.href;
          }
        }
        return null;
      });
    }

    /* -----------------
       IF FOUND
    ------------------*/
    if (found) {

      const final =
        "https://playterabox.com/player?url=" +
        encodeURIComponent(found);

      await browser.close();

      return res.json({
        status:true,
        original:found,
        player:final
      });
    }

    /* -----------------
       STILL NOT FOUND
       RETURN HTML
    ------------------*/
    const html = await page.content();
    await browser.close();

    return res.json({
      status:false,
      msg:"Download link not found",
      html: html
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
