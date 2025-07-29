/* eslint-disable no-console */
import {
  Given,
  When,
  Then,
  Before,
  After,
  DataTable,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';
import { chromium, BrowserContext, Page, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import { CustomWorld } from '../support/world';

setDefaultTimeout(60_000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const downloadsPath = './target/e2e-downloads';

let context: BrowserContext;
let page: Page;
let extensionId: string;
let downloadedFilename: string | null = null;
let downloadedFilenames: string[] = [];

Before(async function () {
  // Build the extension first
  const pathToExtension = join(__dirname, '../../dist');

  // Launch browser with extension
  // Note: Chrome extensions often have issues in headless mode, so we force headed mode
  const isHeadless = process.env.HEADED !== 'true' || process.env.CI === 'true';
  context = await chromium.launchPersistentContext('', {
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
    downloadsPath,
    headless: isHeadless,
    ...devices['Desktop Chrome'],
    channel: 'chrome',
  });

  // Get extension ID from chrome://extensions
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker', {
      timeout: 15_000,
    });
  }

  extensionId = background.url().split('/')[2] || '';
});

After(async function () {
  // Clean up downloaded files if they exist
  for (const filename of downloadedFilenames) {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
  }
  if (downloadedFilename && fs.existsSync(downloadedFilename)) {
    fs.unlinkSync(downloadedFilename);
  }

  // Reset for next test
  downloadedFilenames = [];
  downloadedFilename = null;

  if (page) {
    await page.close();
  }
  if (context) {
    await context.close();
  }
});

Given(
  'I have the extension loaded in the browser',
  async function (this: CustomWorld) {
    // Extension is already loaded in the Before hook
    assert(extensionId, 'Extension should be loaded');
  },
);

When('I open the extension options page', async function (this: CustomWorld) {
  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  page = await context.newPage();
  this.page = page; // Set page reference for screenshots
  await page.goto(optionsUrl);

  // Wait for options page to load
  await page.waitForSelector('#addSuggestedRule', { timeout: 10000 });
});

When('I enable the status window', async function (this: CustomWorld) {
  // Enable status window using the toggle in options page - check current state first
  const statusWindowSelect = page.locator('#showStatusWindow');
  const currentValue = await statusWindowSelect.inputValue();

  if (currentValue !== 'true') {
    await statusWindowSelect.selectOption('true');
  }
});

When('I save the options', async function (this: CustomWorld) {
  // Save the options to ensure the setting is persisted
  await page.click('#saveOptions');
});

When('I navigate to the test page', async function (this: CustomWorld) {
  // Close options page and navigate to test page
  await page.close();

  // Serve the test HTML file and navigate to it
  const testPagePath = join(__dirname, '../fixtures/test-page.html');
  page = await context.newPage();
  this.page = page; // Set page reference for screenshots
  const session = await context.newCDPSession(page);
  await session.send('Browser.setDownloadBehavior', {
    downloadPath: downloadsPath,
    behavior: 'allowAndName',
  });

  await page.goto(`file://${testPagePath}`);
});

When('I click the save rule button', async function (this: CustomWorld) {
  // Look for various possible save rule buttons on the test page
  const possibleSelectors = [
    '.add-save-rule-button',
    'button:has-text("Save Rule")',
    'button:has-text("ADD SAVE RULE")',
    'button:has-text("Save")',
    '[data-action="save-rule"]',
    '.save-rule-btn',
    '.suggested-save-rule button',
  ];

  let elementFound = false;

  for (const selector of possibleSelectors) {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 3000 });
      await element.click();
      elementFound = true;
      break;
    } catch (error) {
      // Continue to next selector
      continue;
    }
  }

  if (!elementFound) {
    // If no button found, log current page state for debugging
    console.log('Current page URL:', await page.url());
    console.log(
      'Available buttons:',
      await page.locator('button').allTextContents(),
    );
    console.log(
      'Available clickable elements:',
      await page.locator('[role="button"], .button, .btn').allTextContents(),
    );
    throw new Error('Could not find save rule button on the page');
  }
});

Then('the status window should be visible', async function (this: CustomWorld) {
  // Check if the status window is visible on the page
  const statusWindow = page.locator('#markdown-save-status-window');
  const isVisible = await statusWindow.isVisible({ timeout: 5000 });
  assert(isVisible, 'Status window should be visible');
});

Then(
  'the status window should show a success message',
  async function (this: CustomWorld) {
    // Verify the status window contains a success message
    const statusWindow = page.locator('#markdown-save-status-window');

    // Wait for status item to appear with timeout
    const statusItem = statusWindow.locator('div[role="status"]').first();
    await statusItem.waitFor({ state: 'visible', timeout: 10000 });

    // Check if status item contains expected elements
    const filenameElement = statusItem.locator('.filename');
    await filenameElement.waitFor({ state: 'visible', timeout: 5000 });
  },
);

Then('a markdown file should be saved', async function (this: CustomWorld) {
  // Extract the filename from the status window for verification
  const statusWindow = page.locator('#markdown-save-status-window');
  const statusItem = statusWindow.locator('div[role="status"]').first();
  const filenameElement = statusItem.locator('.filename');

  downloadedFilename = (await filenameElement.textContent())?.trim() || null;
  assert(downloadedFilename, 'Downloaded filename should be available');
  assert(
    downloadedFilename.includes('e2e-downloads'),
    'Filename should contain e2e-downloads path',
  );

  // Verify the file exists
  const fileExists = fs.existsSync(downloadedFilename);
  assert(fileExists, `File should exist at path: ${downloadedFilename}`);
});

Then(
  'the markdown file should contain:',
  async function (this: CustomWorld, dataTable: DataTable) {
    assert(downloadedFilename, 'Downloaded filename should be available');

    // Read the content of the downloaded file
    const markdownContent = fs.readFileSync(downloadedFilename, 'utf-8');

    // Verify the markdown content contains expected elements
    const expectedContent = dataTable.raw().flat();

    for (const content of expectedContent) {
      assert(
        markdownContent.includes(content),
        `Markdown content should contain: ${content}`,
      );
    }
  },
);

When(
  'I enable auto save for the suggested rule',
  async function (this: CustomWorld) {
    // On the test page, look for the "ADD SAVE RULE" button for the suggested rule
    const addSaveRuleButton = page.locator('.add-save-rule-button').first();
    await addSaveRuleButton.waitFor({ state: 'visible', timeout: 5000 });
    await addSaveRuleButton.click();
  },
);

When('I reload the page', async function (this: CustomWorld) {
  await page.reload();
});
