const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to find Chrome on Render's disk
function getChromePath() {
    try {
        // This command finds the actual executable path dynamically
        return execSync('find /opt/render/.cache/puppeteer -name chrome | head -n 1').toString().trim();
    } catch (e) {
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
        const executablePath = getChromePath();
        console.log(`Using Chrome at: ${executablePath}`);

        browser = await puppeteer.launch({
            headless: "new",
            executablePath: executablePath, 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // Emulate a standard desktop browser
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navigating to: ${targetUrl}`);
        
        // Wait for initial load
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // --- THE 10 SECOND WAIT ---
        console.log('Waiting 10 seconds for all JS elements to render...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Capture the fully rendered "Elements" HTML
        const renderedHtml = await page.content();

        await browser.close();
        
        res.setHeader('Content-Type', 'text/html');
        res.send(renderedHtml);

    } catch (error) {
        console.error("ERROR:", error.message);
        if (browser) await browser.close();
        res.status(500).send({ 
            error: 'Rendering failed', 
            message: error.message,
            tip: "Ensure your Render Build Command is: npm install && npx puppeteer browsers install chrome"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
