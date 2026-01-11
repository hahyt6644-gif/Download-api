const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { execSync } = require('child_process');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Dynamically finds the Chrome binary on Render's filesystem
 */
function findChromePath() {
    try {
        // This command searches the Render cache specifically for the chrome executable
        const path = execSync('find /opt/render/.cache/puppeteer -name chrome -type f | head -n 1')
            .toString()
            .trim();
        
        if (path && fs.existsSync(path)) {
            return path;
        }
        return null;
    } catch (e) {
        console.error("Error finding Chrome path:", e);
        return null;
    }
}

app.get('/render', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send({ error: 'Please provide a URL parameter (?url=...)' });
    }

    let browser;
    try {
        const chromePath = findChromePath();
        console.log(`Attempting to launch Chrome from: ${chromePath}`);

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: chromePath, // Use the auto-discovered path
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // Setup page
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        console.log(`Navigating to: ${targetUrl}`);
        
        // 1. Load the page (wait until basic network is quiet)
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // 2. WAIT FOR 10 SECONDS
        console.log('Waiting 10 seconds for JS to fully render...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 3. Get the "DevTools Elements" HTML
        const html = await page.content();

        await browser.close();
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        if (browser) await browser.close();
        res.status(500).json({ 
            error: 'Rendering failed', 
            message: error.message,
            detected_path: findChromePath()
        });
    }
});

app.listen(PORT, () => {
    console.log(`API Server live on port ${PORT}`);
});
