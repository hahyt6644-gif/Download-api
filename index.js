const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
// Render sets the PORT automatically via environment variable
const PORT = process.env.PORT || 3000;

app.get('/render', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send({ error: 'Please provide a URL parameter (?url=...)' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ] 
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        console.log(`Navigating to: ${targetUrl}`);
        
        // Wait until initial network load is done
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // HARD WAIT: 10 seconds for all JS/Lazy-loading
        console.log('Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Get the "Elements" panel version of the HTML
        const renderedHtml = await page.content();

        await browser.close();
        res.setHeader('Content-Type', 'text/html');
        res.send(renderedHtml);

    } catch (error) {
        console.error("ERROR:", error.message);
        if (browser) await browser.close();
        res.status(500).send({ error: 'Rendering failed', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
