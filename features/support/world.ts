/* eslint-disable no-console */
import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import { Page } from '@playwright/test';

class CustomWorld extends World {
  public page?: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async attachScreenshot(page: Page, name: string): Promise<void> {
    if (page && !page.isClosed()) {
      try {
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png',
        });

        this.attach(screenshot, {
          mediaType: 'image/png',
          fileName: `${name}.png`,
        });
      } catch (error) {
        console.warn(`Failed to take screenshot for ${name}:`, error);
      }
    }
  }
}

setWorldConstructor(CustomWorld);

export { CustomWorld };
