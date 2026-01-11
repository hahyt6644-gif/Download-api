const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/render', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send({ error: 'Please provide a URL parameter (?url=...)' });
    }

    let browser;
    try {
        // We use the exact path identified in your Render logs
        const renderPath = '/opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome';
        const localPath = '/usr/bin/google-chrome'; // Common local path for testing
        
        const executablePath = fs.existsSync(renderPath) ? renderPath : localPath;

        console.log(`Launching Chrome from: ${executablePath}`);

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: executablePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // Standard headers to look like a real user
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        console.log(`Navigating to: ${targetUrl}`);
        
        // Wait for basic network to settle
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // --- THE 10 SECOND WAIT ---
        console.log('Waiting 10 seconds for JS elements to render...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Get the "Elements" view (the serialized DOM)
        const renderedHtml = await page.content();

        await browser.close();
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(renderedHtml);

    } catch (error) {
        console.error("ERROR:", error.message);
        if (browser) await browser.close();
        res.status(500).json({ 
            error: 'Rendering failed', 
            message: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});
