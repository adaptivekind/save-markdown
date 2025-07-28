/**
 * Generic rule manager for handling CRUD operations in the options page
 */

import { SaveRule } from './types';

export interface RuleManagerConfig {
  containerSelector: string;
  noRulesMessageSelector: string;
  rulePrefix: string;
  ruleClass: string;
  showCreatedDate?: boolean;
  showPriority?: boolean;
  allowPriorityEdit?: boolean;
}

export abstract class BaseRuleManager {
  protected config: RuleManagerConfig;
  protected statusCallback: (
    message: string,
    type: 'success' | 'error',
  ) => void;

  constructor(
    config: RuleManagerConfig,
    statusCallback: (message: string, type: 'success' | 'error') => void,
  ) {
    this.config = config;
    this.statusCallback = statusCallback;
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract getRules(): Promise<SaveRule[]>;
  protected abstract deleteRule(id: string): Promise<void>;
  protected abstract updateRule(
    id: string,
    updates: Partial<SaveRule>,
  ): Promise<void>;

  /**
   * Display rules in the UI
   */
  public displayRules(rules: SaveRule[]): void {
    const container = document.getElementById(this.config.containerSelector);
    const noRulesMessage = document.getElementById(
      this.config.noRulesMessageSelector,
    );

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
      this.setupRuleEventListeners(rule);
    });
  }

  /**
   * Create HTML for a single rule
   */
  protected createRuleHTML(rule: SaveRule): string {
    const displayInfo = this.createDisplayInfo(rule);
    const editForm = this.createEditForm(rule);

    return `
      <div class="${this.config.ruleClass}" id="${this.config.rulePrefix}-${rule.id}">
        <div class="rule-header">
          <div class="rule-name">${rule.name}</div>
          <div class="rule-actions">
            <button id="edit-${this.config.rulePrefix}-${rule.id}" class="edit-rule">Edit</button>
            <button id="delete-${this.config.rulePrefix}-${rule.id}" class="delete-rule">Delete</button>
          </div>
        </div>
        <div class="rule-content" id="content-${this.config.rulePrefix}-${rule.id}">
          ${displayInfo}
        </div>
        <div class="rule-edit-form" id="edit-form-${this.config.rulePrefix}-${rule.id}" style="display: none;">
          ${editForm}
        </div>
      </div>
    `;
  }

  /**
   * Create display information section
   */
  protected createDisplayInfo(rule: SaveRule): string {
    let info = `
      <div class="rule-domain" id="domain-display-${this.config.rulePrefix}-${rule.id}">
        ${rule.domain === '*' ? 'All domains' : rule.domain}
      </div>
      <div class="rule-xpath" id="xpath-display-${this.config.rulePrefix}-${rule.id}">${rule.xpath}</div>
    `;

    if (this.config.showPriority) {
      info += `<div class="rule-priority">Priority: ${rule.priority}</div>`;
    }

    if (this.config.showCreatedDate) {
      const date = new Date(rule.created).toLocaleDateString();
      info += `<div class="rule-date">Created: ${date}</div>`;
    }

    return info;
  }

  /**
   * Create edit form section
   */
  protected createEditForm(rule: SaveRule): string {
    const priorityField = this.config.allowPriorityEdit
      ? `
      <div class="form-row">
        <div class="form-group">
          <label for="domain-edit-${this.config.rulePrefix}-${rule.id}">Domain:</label>
          <input type="text" id="domain-edit-${this.config.rulePrefix}-${rule.id}" class="edit-field" value="${rule.domain}" placeholder="* for all domains">
        </div>
        <div class="form-group">
          <label for="priority-edit-${this.config.rulePrefix}-${rule.id}">Priority:</label>
          <input type="number" id="priority-edit-${this.config.rulePrefix}-${rule.id}" class="edit-field priority-input" value="${rule.priority}" min="1" max="1000">
        </div>
      </div>
    `
      : `
      <label for="domain-edit-${this.config.rulePrefix}-${rule.id}">Domain:</label>
      <input type="text" id="domain-edit-${this.config.rulePrefix}-${rule.id}" class="edit-field" value="${rule.domain}">
    `;

    return `
      <label for="name-edit-${this.config.rulePrefix}-${rule.id}">Rule Name:</label>
      <input type="text" id="name-edit-${this.config.rulePrefix}-${rule.id}" class="edit-field" value="${rule.name}" placeholder="Enter a descriptive name for this rule">
      
      ${priorityField}
      
      <label for="xpath-edit-${this.config.rulePrefix}-${rule.id}">XPath:</label>
      <textarea id="xpath-edit-${this.config.rulePrefix}-${rule.id}" class="edit-field xpath">${rule.xpath}</textarea>
      
      <div class="edit-actions">
        <button id="save-${this.config.rulePrefix}-${rule.id}" class="save-rule-button">Save</button>
        <button id="cancel-${this.config.rulePrefix}-${rule.id}" class="cancel-rule">Cancel</button>
      </div>
    `;
  }

  /**
   * Setup event listeners for a rule
   */
  protected setupRuleEventListeners(rule: SaveRule): void {
    const deleteButton = document.getElementById(
      `delete-${this.config.rulePrefix}-${rule.id}`,
    );
    const editButton = document.getElementById(
      `edit-${this.config.rulePrefix}-${rule.id}`,
    );
    const saveButton = document.getElementById(
      `save-${this.config.rulePrefix}-${rule.id}`,
    );
    const cancelButton = document.getElementById(
      `cancel-${this.config.rulePrefix}-${rule.id}`,
    );

    deleteButton?.addEventListener('click', () => this.handleDelete(rule.id));
    editButton?.addEventListener('click', () => this.enterEditMode(rule.id));
    saveButton?.addEventListener('click', () => this.handleSave(rule.id));
    cancelButton?.addEventListener('click', () => this.cancelEdit(rule.id));
  }

  /**
   * Enter edit mode for a rule
   */
  protected enterEditMode(id: string): void {
    const ruleElement = document.getElementById(
      `${this.config.rulePrefix}-${id}`,
    );
    const contentElement = document.getElementById(
      `content-${this.config.rulePrefix}-${id}`,
    );
    const editFormElement = document.getElementById(
      `edit-form-${this.config.rulePrefix}-${id}`,
    );

    if (ruleElement && contentElement && editFormElement) {
      ruleElement.classList.add('edit-mode');
      contentElement.style.display = 'none';
      editFormElement.style.display = 'block';
    }
  }

  /**
   * Cancel edit mode
   */
  protected cancelEdit(id: string): void {
    const ruleElement = document.getElementById(
      `${this.config.rulePrefix}-${id}`,
    );
    const contentElement = document.getElementById(
      `content-${this.config.rulePrefix}-${id}`,
    );
    const editFormElement = document.getElementById(
      `edit-form-${this.config.rulePrefix}-${id}`,
    );

    if (ruleElement && contentElement && editFormElement) {
      ruleElement.classList.remove('edit-mode');
      contentElement.style.display = 'block';
      editFormElement.style.display = 'none';

      // Reload rules to reset form values
      this.loadAndDisplayRules();
    }
  }

  /**
   * Handle delete action
   */
  protected async handleDelete(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      await this.deleteRule(id);
      await this.loadAndDisplayRules();
      this.statusCallback('Rule deleted successfully', 'success');
    } catch (error) {
      this.statusCallback('Failed to delete rule', 'error');
    }
  }

  /**
   * Handle save action
   */
  protected async handleSave(id: string): Promise<void> {
    const nameInput = document.getElementById(
      `name-edit-${this.config.rulePrefix}-${id}`,
    ) as HTMLInputElement;
    const domainInput = document.getElementById(
      `domain-edit-${this.config.rulePrefix}-${id}`,
    ) as HTMLInputElement;
    const xpathInput = document.getElementById(
      `xpath-edit-${this.config.rulePrefix}-${id}`,
    ) as HTMLTextAreaElement;
    const priorityInput = document.getElementById(
      `priority-edit-${this.config.rulePrefix}-${id}`,
    ) as HTMLInputElement;

    if (!nameInput || !domainInput || !xpathInput) {
      this.statusCallback(
        'Failed to save rule: form elements not found',
        'error',
      );
      return;
    }

    const updates: Partial<SaveRule> = {
      name: nameInput.value.trim(),
      domain: domainInput.value.trim(),
      xpath: xpathInput.value.trim(),
    };

    if (this.config.allowPriorityEdit && priorityInput) {
      updates.priority = parseInt(priorityInput.value) || 50;
    }

    // Validate inputs
    if (!updates.name) {
      this.statusCallback('Rule name cannot be empty', 'error');
      return;
    }

    if (!updates.domain) {
      this.statusCallback('Domain cannot be empty', 'error');
      return;
    }

    if (!updates.xpath) {
      this.statusCallback('XPath cannot be empty', 'error');
      return;
    }

    if (updates.priority && (updates.priority < 1 || updates.priority > 1000)) {
      this.statusCallback('Priority must be between 1 and 1000', 'error');
      return;
    }

    try {
      await this.updateRule(id, updates);
      await this.loadAndDisplayRules();
      this.statusCallback('Rule updated successfully', 'success');
    } catch (error) {
      this.statusCallback('Failed to update rule', 'error');
    }
  }

  /**
   * Load and display rules
   */
  public async loadAndDisplayRules(): Promise<void> {
    try {
      const rules = await this.getRules();
      this.displayRules(rules);
    } catch (error) {
      this.statusCallback('Failed to load rules', 'error');
    }
  }
}
