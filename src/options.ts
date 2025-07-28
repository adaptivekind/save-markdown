import { ExtensionOptions } from './types';
import {
  getSaveRules,
  removeSaveRule,
  updateSaveRule,
  SaveRule,
} from './saveRules';

const defaultOptions: ExtensionOptions = {
  saveDirectory: '~/Downloads',
  filenameTemplate: '{title}.md',
  useDomainSubfolder: true,
  includeMetadata: true,
  metadataTemplate: `---
Source: {url}
Captured: {date}
Title: {title}
---

`,
  preserveFormatting: true,
  autoDownload: true,
  debugMode: false,
  enableAutoCapture: true,
};

class OptionsManager {
  private statusElement: HTMLElement;

  constructor() {
    this.statusElement = document.getElementById('status') as HTMLElement;
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadOptions();
    this.setupEventListeners();
    this.updateFilenamePreview();
    await this.loadSaveRules();
  }

  private setupEventListeners(): void {
    const saveButton = document.getElementById('saveOptions');
    const resetButton = document.getElementById('resetOptions');
    const exportButton = document.getElementById('exportOptions');
    const importButton = document.getElementById('importOptions');
    const importFile = document.getElementById(
      'importFile',
    ) as HTMLInputElement;
    const filenameTemplate = document.getElementById(
      'filenameTemplate',
    ) as HTMLInputElement;

    saveButton?.addEventListener('click', () => this.saveOptions());
    resetButton?.addEventListener('click', () => this.resetOptions());
    exportButton?.addEventListener('click', () => this.exportOptions());
    importButton?.addEventListener('click', () => importFile.click());
    importFile?.addEventListener('change', e => this.importOptions(e));
    filenameTemplate?.addEventListener('input', () =>
      this.updateFilenamePreview(),
    );
  }

  private async loadOptions(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(defaultOptions);
      this.populateForm(result as ExtensionOptions);
    } catch (error) {
      this.showStatus('Failed to load options', 'error');
    }
  }

  private populateForm(options: ExtensionOptions): void {
    (document.getElementById('saveDirectory') as HTMLInputElement).value =
      options.saveDirectory;
    (document.getElementById('filenameTemplate') as HTMLInputElement).value =
      options.filenameTemplate;
    (document.getElementById('useDomainSubfolder') as HTMLSelectElement).value =
      String(options.useDomainSubfolder);
    (document.getElementById('includeMetadata') as HTMLSelectElement).value =
      String(options.includeMetadata);
    (document.getElementById('metadataTemplate') as HTMLTextAreaElement).value =
      options.metadataTemplate;
    (document.getElementById('preserveFormatting') as HTMLSelectElement).value =
      String(options.preserveFormatting);
    (document.getElementById('autoDownload') as HTMLSelectElement).value =
      String(options.autoDownload);
    (document.getElementById('debugMode') as HTMLSelectElement).value = String(
      options.debugMode,
    );
    (document.getElementById('enableAutoCapture') as HTMLSelectElement).value =
      String(options.enableAutoCapture);
  }

  private getFormData(): ExtensionOptions {
    return {
      saveDirectory: (
        document.getElementById('saveDirectory') as HTMLInputElement
      ).value,
      filenameTemplate: (
        document.getElementById('filenameTemplate') as HTMLInputElement
      ).value,
      useDomainSubfolder:
        (document.getElementById('useDomainSubfolder') as HTMLSelectElement)
          .value === 'true',
      includeMetadata:
        (document.getElementById('includeMetadata') as HTMLSelectElement)
          .value === 'true',
      metadataTemplate: (
        document.getElementById('metadataTemplate') as HTMLTextAreaElement
      ).value,
      preserveFormatting:
        (document.getElementById('preserveFormatting') as HTMLSelectElement)
          .value === 'true',
      autoDownload:
        (document.getElementById('autoDownload') as HTMLSelectElement).value ===
        'true',
      debugMode:
        (document.getElementById('debugMode') as HTMLSelectElement).value ===
        'true',
      enableAutoCapture:
        (document.getElementById('enableAutoCapture') as HTMLSelectElement)
          .value === 'true',
    };
  }

  private async saveOptions(): Promise<void> {
    try {
      const options = this.getFormData();
      await chrome.storage.sync.set(options);
      this.showStatus('Options saved successfully!', 'success');
    } catch (error) {
      this.showStatus('Failed to save options', 'error');
    }
  }

  private async resetOptions(): Promise<void> {
    if (
      confirm('Reset all options to default values? This cannot be undone.')
    ) {
      try {
        await chrome.storage.sync.set(defaultOptions);
        this.populateForm(defaultOptions);
        this.updateFilenamePreview();
        this.showStatus('Options reset to defaults', 'success');
      } catch (error) {
        this.showStatus('Failed to reset options', 'error');
      }
    }
  }

  private async exportOptions(): Promise<void> {
    try {
      const options = this.getFormData();
      const dataStr = JSON.stringify(options, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = 'save-markdown-settings.json';
      link.click();

      this.showStatus('Settings exported successfully!', 'success');
    } catch (error) {
      this.showStatus('Failed to export settings', 'error');
    }
  }

  private async importOptions(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const options = JSON.parse(text) as ExtensionOptions;

      // Validate imported options
      if (!this.validateOptions(options)) {
        throw new Error('Invalid settings file format');
      }

      await chrome.storage.sync.set(options);
      this.populateForm(options);
      this.updateFilenamePreview();
      this.showStatus('Settings imported successfully!', 'success');
    } catch (error) {
      this.showStatus(
        'Failed to import settings: Invalid file format',
        'error',
      );
    }
  }

  private validateOptions(options: unknown): options is ExtensionOptions {
    if (typeof options !== 'object' || options === null) return false;

    const opt = options as Record<string, unknown>;
    return (
      typeof opt.saveDirectory === 'string' &&
      typeof opt.filenameTemplate === 'string' &&
      typeof opt.useDomainSubfolder === 'boolean' &&
      typeof opt.includeMetadata === 'boolean' &&
      typeof opt.metadataTemplate === 'string' &&
      typeof opt.preserveFormatting === 'boolean' &&
      typeof opt.autoDownload === 'boolean' &&
      typeof opt.debugMode === 'boolean' &&
      typeof opt.enableAutoCapture === 'boolean'
    );
  }

  private updateFilenamePreview(): void {
    const template =
      (document.getElementById('filenameTemplate') as HTMLInputElement).value ||
      defaultOptions.filenameTemplate;
    const preview = this.generateFilenamePreview(template);
    const previewElement = document.getElementById('filenamePreview');
    if (previewElement) {
      previewElement.textContent = `Preview: ${preview}`;
    }
  }

  private generateFilenamePreview(template: string): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const date = now.toISOString().slice(0, 10);

    return template
      .replace('{title}', 'Example Page Title')
      .replace('{timestamp}', timestamp)
      .replace('{domain}', 'example-com')
      .replace('{date}', date);
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
    this.statusElement.style.display = 'block';

    setTimeout(() => {
      this.statusElement.style.display = 'none';
    }, 3000);
  }

  private async loadSaveRules(): Promise<void> {
    try {
      const rules = await getSaveRules();
      this.displaySaveRules(rules);
    } catch (error) {
      this.showStatus('Failed to load save rules', 'error');
    }
  }

  private displaySaveRules(rules: SaveRule[]): void {
    const container = document.getElementById('saveRules');
    const noRulesMessage = document.getElementById('noRulesMessage');

    if (!container || !noRulesMessage) return;

    if (rules.length === 0) {
      container.style.display = 'none';
      noRulesMessage.style.display = 'block';
      return;
    }

    container.style.display = 'block';
    noRulesMessage.style.display = 'none';

    container.innerHTML = rules.map(rule => this.createRuleHTML(rule)).join('');

    // Add event listeners for each rule
    rules.forEach(rule => {
      const deleteButton = document.getElementById(`delete-${rule.id}`);
      const editButton = document.getElementById(`edit-${rule.id}`);
      const saveButton = document.getElementById(`save-${rule.id}`);
      const cancelButton = document.getElementById(`cancel-${rule.id}`);

      deleteButton?.addEventListener('click', () => this.deleteRule(rule.id));
      editButton?.addEventListener('click', () => this.enterEditMode(rule.id));
      saveButton?.addEventListener('click', () => this.saveRule(rule.id));
      cancelButton?.addEventListener('click', () => this.cancelEdit(rule.id));
    });
  }

  private createRuleHTML(rule: SaveRule): string {
    const date = new Date(rule.created).toLocaleDateString();
    return `
      <div class="save-rule-item" id="rule-${rule.id}">
        <div class="rule-header">
          <div class="rule-name">${rule.name}</div>
          <div class="rule-actions">
            <button id="edit-${rule.id}" class="edit-rule">Edit</button>
            <button id="delete-${rule.id}" class="delete-rule">Delete</button>
          </div>
        </div>
        <div class="rule-content" id="content-${rule.id}">
          <div class="rule-domain" id="domain-display-${rule.id}">${rule.domain}</div>
          <div class="rule-xpath" id="xpath-display-${rule.id}">${rule.xpath}</div>
          <div class="rule-date">Created: ${date}</div>
        </div>
        <div class="rule-edit-form" id="edit-form-${rule.id}" style="display: none;">
          <label for="name-edit-${rule.id}">Rule Name:</label>
          <input type="text" id="name-edit-${rule.id}" class="edit-field" value="${rule.name}" placeholder="Enter a descriptive name for this rule">
          
          <label for="domain-edit-${rule.id}">Domain:</label>
          <input type="text" id="domain-edit-${rule.id}" class="edit-field" value="${rule.domain}">
          
          <label for="xpath-edit-${rule.id}">XPath:</label>
          <textarea id="xpath-edit-${rule.id}" class="edit-field xpath">${rule.xpath}</textarea>
          
          <div class="edit-actions">
            <button id="save-${rule.id}" class="save-rule-button">Save</button>
            <button id="cancel-${rule.id}" class="cancel-rule">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  private async deleteRule(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this save rule?')) {
      return;
    }

    try {
      await removeSaveRule(id);
      await this.loadSaveRules();
      this.showStatus('Save rule deleted successfully', 'success');
    } catch (error) {
      this.showStatus('Failed to delete save rule', 'error');
    }
  }

  private enterEditMode(id: string): void {
    const ruleElement = document.getElementById(`rule-${id}`);
    const contentElement = document.getElementById(`content-${id}`);
    const editFormElement = document.getElementById(`edit-form-${id}`);

    if (ruleElement && contentElement && editFormElement) {
      ruleElement.classList.add('edit-mode');
      contentElement.style.display = 'none';
      editFormElement.style.display = 'block';
    }
  }

  private cancelEdit(id: string): void {
    const ruleElement = document.getElementById(`rule-${id}`);
    const contentElement = document.getElementById(`content-${id}`);
    const editFormElement = document.getElementById(`edit-form-${id}`);

    if (ruleElement && contentElement && editFormElement) {
      ruleElement.classList.remove('edit-mode');
      contentElement.style.display = 'block';
      editFormElement.style.display = 'none';

      this.loadSaveRules();
    }
  }

  private async saveRule(id: string): Promise<void> {
    const nameInput = document.getElementById(
      `name-edit-${id}`,
    ) as HTMLInputElement;
    const domainInput = document.getElementById(
      `domain-edit-${id}`,
    ) as HTMLInputElement;
    const xpathInput = document.getElementById(
      `xpath-edit-${id}`,
    ) as HTMLTextAreaElement;

    if (!nameInput || !domainInput || !xpathInput) {
      this.showStatus('Failed to save rule: form elements not found', 'error');
      return;
    }

    const newName = nameInput.value.trim();
    const newDomain = domainInput.value.trim();
    const newXpath = xpathInput.value.trim();

    // Validate inputs
    if (!newName) {
      this.showStatus('Rule name cannot be empty', 'error');
      return;
    }

    if (!newDomain) {
      this.showStatus('Domain cannot be empty', 'error');
      return;
    }

    if (!newXpath) {
      this.showStatus('XPath cannot be empty', 'error');
      return;
    }

    try {
      await updateSaveRule(id, {
        name: newName,
        domain: newDomain,
        xpath: newXpath,
      });

      await this.loadSaveRules();
      this.showStatus('Save rule updated successfully', 'success');
    } catch (error) {
      this.showStatus('Failed to update save rule', 'error');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
