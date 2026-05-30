const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173/#/caisse');
  console.log('Navigated to Caisse page.');
  
  await page.waitForTimeout(2000); // give time to load
  
  const button = await page.getByRole('button', { name: /Ouvrir la session/i }).first();
  if (await button.isVisible()) {
    console.log('Button is visible. Clicking...');
    await button.click();
    await page.waitForTimeout(1000);
    
    const modalRoot = await page.locator('#modal-root').innerHTML();
    console.log('Modal Root HTML:', modalRoot);
  } else {
    console.log('Button not visible.');
  }

  await browser.close();
})();
