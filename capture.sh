#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR for screenshot output}"
PLAYWRIGHT_DIR="${HOME}/.local/share/omgithub-playwright"

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p test -f "$PLAYWRIGHT_DIR/linux.json"

/usr/bin/time -p node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = path.join(process.env.HOME, '.local/share/omgithub-playwright');
const playwrightRequire = createRequire(path.join(runtime, 'package.json'));
const { chromium } = playwrightRequire('playwright');
const config = JSON.parse(fs.readFileSync(path.join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'));
if (process.platform === 'linux') process.env.DISPLAY ||= ':' + fs.readFileSync(path.join(runtime, 'display'), 'utf8').trim();
const url = process.env.CAPTURE_URL;
const output = process.env.CAPTURE_DIR;
const temporary = (message, cause) => Object.assign(new Error(message, cause ? { cause } : undefined), { exitCode: 75 });
let browser;
(async () => {
  try {
    try {
      browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 });
    } catch (error) {
      throw temporary(`Could not launch capture browser: ${error.message}`, error);
    }

    for (const [device, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      let page;
      try {
        page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: device === 'mobile' ? 2 : 1, isMobile: device === 'mobile', hasTouch: device === 'mobile' });
      } catch (error) {
        throw temporary(`Could not create ${device} browser page: ${error.message}`, error);
      }
      page.setDefaultTimeout(20000);
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      let response;
      try {
        response = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      } catch (error) {
        throw temporary(`Navigation failed for ${device}: ${error.message}`, error);
      }
      if (!response) throw temporary(`No navigation response for ${device}.`);
      if (response.status() >= 500 || [408, 429].includes(response.status())) throw temporary(`Preview temporarily returned HTTP ${response.status()}.`);
      if (!response.ok()) throw Object.assign(new Error(`Preview returned HTTP ${response.status()}.`), { exitCode: 1 });

      try {
        await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('canvas').waitFor({ state: 'attached', timeout: 20000 });
        await page.waitForFunction(() => {
          const canvas = document.querySelector('canvas');
          return canvas && canvas.width > 0 && canvas.height > 0;
        }, { timeout: 15000 });
      } catch (error) {
        throw Object.assign(new Error(`The game did not render on ${device}: ${error.message}`), { exitCode: 1 });
      }

      const play = page.locator('#play');
      if (await play.isVisible().catch(() => false)) {
        try { await play.dispatchEvent('click'); }
        catch (error) { throw Object.assign(new Error(`The game start control failed on ${device}: ${error.message}`), { exitCode: 1 }); }
      }
      await page.waitForTimeout(1200);
      if (pageErrors.length) throw Object.assign(new Error(`JavaScript error on ${device}: ${pageErrors.join('; ')}`), { exitCode: 1 });
      try {
        await page.screenshot({ path: path.join(output, `final-${device}.png`), timeout: 30000 });
      } catch (error) {
        if (!browser.isConnected() || error.name === 'TimeoutError') throw temporary(`Screenshot capture failed on ${device}: ${error.message}`, error);
        throw error;
      }
      await page.close();
      console.log(`Captured ${device} view at ${width}x${height}.`);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = error.exitCode || 1;
  } finally {
    if (browser) {
      try { await browser.close(); }
      catch (error) { console.error(`Could not close capture browser: ${error.message}`); process.exitCode ||= 75; }
    }
  }
})();
NODE
