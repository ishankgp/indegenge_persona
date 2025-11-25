
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set viewport to a reasonable desktop size
    await page.setViewport({ width: 1280, height: 800 });

    const baseUrl = 'http://localhost:5173';
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');

    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    try {
        // 1. Dashboard / Home
        console.log('Navigating to Home...');
        await page.goto(baseUrl, { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });
        console.log('Captured dashboard.png');

        // 2. Analytics (Default)
        console.log('Navigating to Analytics...');
        await page.goto(`${baseUrl}/analytics`, { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotsDir, 'analytics.png') });
        console.log('Captured analytics.png');

        // 3. Analytics (Load Previous Run)
        console.log('Attempting to load previous run in Analytics...');
        // Wait for the Select trigger to be available
        try {
            await page.waitForSelector('button[role="combobox"]', { timeout: 5000 });
            await page.click('button[role="combobox"]'); // Click the select trigger

            // Wait for options to appear and click the first one
            await page.waitForSelector('div[role="option"]', { timeout: 5000 });
            const options = await page.$$('div[role="option"]');
            if (options.length > 0) {
                await options[0].click();
                // Click the "Load" button. Assuming it's the button next to the select.
                // Based on code: <Button onClick={handleLoadSimulation}>Load</Button>
                // We can search for a button with text "Load"
                const buttons = await page.$$('button');
                for (const button of buttons) {
                    const text = await page.evaluate(el => el.textContent, button);
                    if (text.includes('Load')) {
                        await button.click();
                        break;
                    }
                }

                // Wait for data to load (toast or content change)
                await new Promise(r => setTimeout(r, 2000)); // Simple wait for demo
                await page.screenshot({ path: path.join(screenshotsDir, 'analytics_previous_run.png') });
                console.log('Captured analytics_previous_run.png');
            } else {
                console.log('No saved simulations found to load.');
            }
        } catch (e) {
            console.log('Could not load previous run (maybe no saved runs?):', e.message);
        }

        // 4. Brand Library (Select Brand)
        console.log('Navigating to Brand Library...');
        await page.goto(`${baseUrl}/brand-library`, { waitUntil: 'networkidle0' });

        try {
            // Wait for brand select trigger
            await page.waitForSelector('button[role="combobox"]', { timeout: 5000 });
            await page.click('button[role="combobox"]');

            // Wait for options
            await page.waitForSelector('div[role="option"]', { timeout: 5000 });
            const brandOptions = await page.$$('div[role="option"]');
            if (brandOptions.length > 0) {
                await brandOptions[0].click();
                // Wait for content to load
                await new Promise(r => setTimeout(r, 1000));
                await page.screenshot({ path: path.join(screenshotsDir, 'brand_library_selected.png') });
                console.log('Captured brand_library_selected.png');
            } else {
                console.log('No brands found to select.');
            }
        } catch (e) {
            console.log('Could not select brand:', e.message);
        }

    } catch (error) {
        console.error('Error capturing screenshots:', error);
    } finally {
        await browser.close();
    }
})();
