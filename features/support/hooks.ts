import { AfterStep } from '@cucumber/cucumber';
import { CustomWorld } from './world';

AfterStep(async function (this: CustomWorld, { pickle, pickleStep }) {
  // Take screenshots for all scenarios that have a page
  if (this.page) {
    const stepName = pickleStep.text.replace(/[^a-zA-Z0-9]/g, '_');
    const scenarioName = pickle.name.replace(/[^a-zA-Z0-9]/g, '_');
    const screenshotName = `${scenarioName}_${stepName}`;

    await this.attachScreenshot(this.page, screenshotName);
  }
});
