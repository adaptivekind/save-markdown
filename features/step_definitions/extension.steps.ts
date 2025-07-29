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

When(
  'I add a new suggested rule with the following details:',
  async function (this: CustomWorld, dataTable: DataTable) {
    const data = dataTable.rowsHash();

    // Click "Add Suggested Rule" button
    await page.click('#addSuggestedRule');

    // Wait for the form to appear
    await page.waitForSelector('#addSuggestedRuleForm', { timeout: 5000 });

    // Clear and fill in the form fields
    const nameInput = page.locator('#suggestedRuleName');
    await nameInput.clear();
    await nameInput.fill(data.name || '');

    const domainInput = page.locator('#suggestedRuleDomain');
    await domainInput.clear();
    await domainInput.fill(data.domain || '');

    const xpathInput = page.locator('#suggestedRuleXPath');
    await xpathInput.clear();
    await xpathInput.fill(data.xpath || '');

    // Save the rule
    await page.click('#saveSuggestedRule');
  },
);

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

  // Wait for the action to complete
  await page.waitForTimeout(1000);
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

When('I enable auto save for the rule', async function (this: CustomWorld) {
  // Enable auto save for the last added rule - check if it's already enabled
  const autoSaveCheckbox = page
    .locator('input[type="checkbox"][name="autoSave"]')
    .last();
  const isChecked = await autoSaveCheckbox.isChecked();

  if (!isChecked) {
    await autoSaveCheckbox.check();
  }
});

When(
  'I enable auto save for the suggested rule',
  async function (this: CustomWorld) {
    // On the test page, look for the suggested rule and enable auto save
    // This could be a toggle, checkbox, or button to enable auto save for the suggestion
    const possibleSelectors = [
      '.suggested-save-rule input[type="checkbox"]',
      '.add-save-rule-button',
      'button:has-text("Enable Auto Save")',
      'button:has-text("ADD SAVE RULE")',
      '[data-action="enable-auto-save"]',
      '.suggested-rule .auto-save-toggle',
    ];

    let elementFound = false;

    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: 2000 });

        // Check if it's a checkbox that needs to be checked
        if (selector.includes('checkbox')) {
          const isChecked = await element.isChecked();
          if (!isChecked) {
            await element.check();
          }
        } else {
          // It's a button, click it
          await element.click();
        }

        elementFound = true;
        break;
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }

    if (!elementFound) {
      // If no element found, log current page state for debugging
      console.log('Current page URL:', await page.url());
      console.log('Available elements on page:');
      console.log('Buttons:', await page.locator('button').allTextContents());
      console.log(
        'Checkboxes:',
        await page.locator('input[type="checkbox"]').count(),
      );
      console.log(
        'Elements with "save" text:',
        await page.locator(':has-text("save")').allTextContents(),
      );
      throw new Error(
        'Could not find element to enable auto save for the suggested rule',
      );
    }

    // Wait for the action to complete
    await page.waitForTimeout(1000);
  },
);

When(
  'I add the save rule for the suggested rule',
  async function (this: CustomWorld) {
    // Look for the suggested save rule element that appears on the page
    // This could be a button, link, or other element that allows adding the rule
    // Try multiple possible selectors that might be used for adding a save rule
    const possibleSelectors = [
      'button:has-text("Add Save Rule")',
      'button:has-text("ADD SAVE RULE")',
      '.add-save-rule-button',
      '.suggested-save-rule button',
      '[data-action="add-save-rule"]',
      'button[title*="Add Save Rule"]',
    ];

    let elementFound = false;

    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: 2000 });
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
      throw new Error('Could not find "Add Save Rule" button on the page');
    }

    // Wait for the action to complete
    await page.waitForTimeout(1000);
  },
);

When('I reload the page', async function (this: CustomWorld) {
  await page.reload();
});
