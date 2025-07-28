/* eslint-disable no-console */
import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Save Markdown Extension E2E', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    test.setTimeout(5_000);

    // Build the extension first
    const pathToExtension = path.join(__dirname, '../../dist');

    // Launch browser with extension
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
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

    // Wait for success message or form to close
    await page.waitForTimeout(1000);

    // Close popup and navigate to test page
    await page.close();

    // Serve the test HTML file and navigate to it
    const testPagePath = path.join(__dirname, 'fixtures/test-page.html');
    const testPage = await context.newPage();
    await testPage.goto(`file://${testPagePath}`);

    // Wait for the extension to process the page and show suggested elements
    await testPage.waitForTimeout(2000);

    // Look for the suggested save element and click "ADD SAVE RULE" to convert it to auto-save
    const suggestedElement = testPage.locator('.add-save-rule-button').first();

    const session = await context.newCDPSession(testPage);
    await session.send('Browser.setDownloadBehavior', {
      behavior: 'default',
      eventsEnabled: true,
    });
    // const downloadPromise = testPage.waitForEvent('download');
    // console.log('Download promise set up');
    testPage.on('download', download => download.path().then(console.log));
    await suggestedElement.click();

    console.log('Awaiting download');
    // const download = await downloadPromise;
    // console.log(download);

    // Check if markdown file was saved in Downloads folder
    await testPage.waitForTimeout(2000);
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const files = fs.readdirSync(downloadsPath);
    console.log(downloadsPath);

    // Look for a markdown file that was recently created
    const markdownFiles = files.filter(
      file => file.endsWith('.md') && file.toLowerCase().includes('test'),
    );

    // Verify at least one markdown file was created
    expect(markdownFiles.length).toBeGreaterThan(0);

    // Read the content of the most recent markdown file
    const mostRecentFile = markdownFiles
      .map(file => ({
        name: file,
        path: path.join(downloadsPath, file),
        mtime: fs.statSync(path.join(downloadsPath, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];

    const markdownContent = fs.readFileSync(mostRecentFile.path, 'utf-8');

    // Verify the markdown content contains expected elements
    expect(markdownContent).toContain('# Introduction');
    expect(markdownContent).toContain('## Features');
    expect(markdownContent).toContain('**Bold text**');
    expect(markdownContent).toContain('*Italic text*');
    expect(markdownContent).toContain('`Inline code`');
    expect(markdownContent).toContain('[External links](https://example.com)');
    expect(markdownContent).toContain('> This is a blockquote');

    // Clean up - remove the test file
    fs.unlinkSync(mostRecentFile.path);

    await testPage.close();
  });
});
