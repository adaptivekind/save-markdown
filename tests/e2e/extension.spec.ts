/* eslint-disable no-console */
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadsPath = './target/e2e-downloads';

test.describe('Save Markdown Extension E2E', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    test.setTimeout(30_000);

    // Build the extension first
    const pathToExtension = path.join(__dirname, '../../dist');

    // Launch browser with extension
    context = await chromium.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
      downloadsPath,
    });

    // Get extension ID from chrome://extensions
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    extensionId = background.url().split('/')[2];
  });

  test.afterAll(async () => {
    if (process.env.WAIT_AFTER_TEST === 'true') {
      test.setTimeout(120_000);
      await new Promise(() => {});
    }
    await context.close();
  });

  test('should create save rule and save markdown when page is visited', async () => {
    // Open extension options page
    const optionsUrl = `chrome-extension://${extensionId}/options.html`;
    const page = await context.newPage();
    await page.goto(optionsUrl);

    // Wait for options page to load
    await page.waitForSelector('#addSuggestedRule', { timeout: 10000 });

    // Click "Add Suggested Rule" button
    await page.click('#addSuggestedRule');

    // Wait for the form to appear
    await page.waitForSelector('#addSuggestedRuleForm', { timeout: 5000 });

    // Fill in the form fields
    const nameInput = page.locator('#suggestedRuleName');
    await nameInput.fill('Test Article Rule');

    const domainInput = page.locator('#suggestedRuleDomain');
    await domainInput.fill('*');

    const xpathInput = page.locator('#suggestedRuleXPath');
    await xpathInput.fill('//article[@id="main-content"]');

    // Save the rule
    await page.click('#saveSuggestedRule');

    // Enable status window using the toggle in options page
    const statusWindowSelect = page.locator('#showStatusWindow');
    await statusWindowSelect.selectOption('true');

    // Save the options to ensure the setting is persisted
    await page.click('#saveOptions');

    // Close options page and navigate to test page
    await page.close();

    // Serve the test HTML file and navigate to it
    const testPagePath = path.join(__dirname, 'fixtures/test-page.html');
    const testPage = await context.newPage();
    const session = await context.newCDPSession(testPage);
    await session.send('Browser.setDownloadBehavior', {
      downloadPath: downloadsPath,
      behavior: 'allowAndName',
    });

    await testPage.goto(`file://${testPagePath}`);

    // Look for the suggested save element and click "ADD SAVE RULE" to convert it to auto-save
    const suggestedElement = testPage.locator('.add-save-rule-button').first();

    await suggestedElement.click();

    // Check if the status window is visible on the page
    const statusWindow = testPage.locator('#markdown-save-status-window');
    await expect(statusWindow).toBeVisible({ timeout: 5000 });

    // Verify the status window contains a success message
    const statusItem = statusWindow.locator('div[role="status"]').first();
    await expect(statusItem).toBeVisible();

    // Check if status item contains expected elements
    const filenameElement = statusItem.locator('.filename');
    await expect(filenameElement).toBeVisible();

    // Extract the filename from the status window for verification
    const downloadedFilename = (await filenameElement.textContent())?.trim();
    expect(downloadedFilename).toBe('test-page-for-markdown-extension.md');

    // Playwright sets GUID for download file https://playwright.dev/docs/api/class-download. Currently can't find a way to get
    // this progromatically. page.waitForEvent('download') does not work for calls
    // dow Chrome download API in background. For we'll find a recent download in the last
    // 5 seconds. This is not as robust as we would like, however this can be refactored later
    // when a better way is found.

    // Find the latest markdown file in the downloads directory
    const files = fs.readdirSync(downloadsPath);
    const markdownFiles = files
      .map(file => ({
        name: file,
        path: path.join(downloadsPath, file),
        mtime: fs.statSync(path.join(downloadsPath, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Verify at least one markdown file was found
    expect(markdownFiles.length).toBeGreaterThan(0);

    const latestFile = markdownFiles[0];

    // Assert that the file was created in the last 10 seconds
    const now = new Date();
    const fileAge = now.getTime() - latestFile.mtime.getTime();
    const tenSecondsInMs = 5 * 1000;

    console.log('File age in milliseconds:', fileAge);
    expect(fileAge).toBeLessThan(tenSecondsInMs);

    // Read the content of the latest downloaded file
    const markdownContent = fs.readFileSync(latestFile.path, 'utf-8');

    // Verify the markdown content contains expected elements
    expect(markdownContent).toContain('# Introduction');
    expect(markdownContent).toContain('## Features');
    expect(markdownContent).toContain('**Bold text**');
    expect(markdownContent).toContain('*Italic text*');
    expect(markdownContent).toContain('`Inline code`');
    expect(markdownContent).toContain('[External links](https://example.com)');
    expect(markdownContent).toContain('> This is a blockquote');

    // Clean up - remove the test file
    fs.unlinkSync(latestFile.path);

    await testPage.close();
  });
});
