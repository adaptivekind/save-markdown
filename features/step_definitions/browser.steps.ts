import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { chromium, Browser, Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let browser: Browser;
let page: Page;
let pageTitle: string;

Before(async function () {
  const headless = process.env.HEADED !== 'true';
  browser = await chromium.launch({ headless });
  page = await browser.newPage();
});

After(async function () {
  if (page) {
    await page.close();
  }
  if (browser) {
    await browser.close();
  }
});

Given('I open the test page in a browser', async function () {
  const testPagePath = join(
    __dirname,
    '../../tests/e2e/fixtures/test-page.html',
  );
  await page.goto(`file://${testPagePath}`);
});

When('I check the page title', async function () {
  pageTitle = await page.title();
});

Then('the title should be {string}', async function (expectedTitle: string) {
  assert.equal(pageTitle, expectedTitle);
});
