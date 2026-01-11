const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

// Function to find the chrome executable inside the local .cache folder
function getExecutablePath() {
    const cachePath = path.join(__dirname, '.cache', 'puppeteer');
    if (!fs.existsSync(cachePath)) return null;

    // Search recursively for the 'chrome' binary
    const findBinary = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const found = findBinary(fullPath);
                if (found) return found;
            } else if (file === 'chrome' || file === 'google-chrome') {
                return fullPath;
            }
        }
        return null;
    };
    return findBinary(cachePath);
}

app.get('/render', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send({ error: 'URL required' });

    let browser;
    try {
        const exePath = getExecutablePath();
        console.log(`Launching from: ${exePath}`);

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: exePath || undefined, // Fallback to default if not found
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // The 10 second wait you requested
        console.log("Waiting 10 seconds...");
        await new Promise(r => setTimeout(r, 10000));

        const html = await page.content();
        await browser.close();

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).send({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server live on ${PORT}`));
