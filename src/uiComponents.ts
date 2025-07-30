/**
 * UI Component Factory for shared label and button creation
 */

import { SaveRule } from './types';
import { htmlToMarkdown } from './htmlToMarkdown';
import { toggleSaveRule, createRuleFromElement } from './saveRules';

// Common font and styling constants
const COMMON_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const LABEL_BASE_STYLES = `
  color: white;
  font-family: ${COMMON_FONT_FAMILY};
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const CONTAINER_BASE_STYLES = `
  position: absolute;
  top: -2px;
  right: -2px;
  z-index: 10001;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

export interface LabelConfig {
  text: string;
  backgroundColor: string;
  borderRadius?: string;
  additionalStyles?: string;
  clickHandler?: () => void;
}

export interface ContainerConfig {
  className: string;
  additionalStyles?: string;
}

/**
 * Creates a styled container element
 */
export function createContainer(config: ContainerConfig): HTMLElement {
  const container = document.createElement('div');
  container.className = config.className;
  container.style.cssText =
    CONTAINER_BASE_STYLES + (config.additionalStyles || '');
  return container;
}

/**
 * Creates a styled label element
 */
export function createLabel(config: LabelConfig): HTMLElement {
  const label = document.createElement('div');
  label.style.cssText = `
    ${LABEL_BASE_STYLES}
    background: ${config.backgroundColor};
    border-radius: ${config.borderRadius || '0 0 0 4px'};
    ${config.additionalStyles || ''}
  `;
  label.textContent = config.text;

  if (config.clickHandler) {
    label.style.cursor = 'pointer';
    label.addEventListener('click', config.clickHandler);
  }

  return label;
}

/**
 * Creates a styled button element
 */
export function createButton(config: LabelConfig): HTMLElement {
  const button = document.createElement('div');
  button.style.cssText = `
    ${LABEL_BASE_STYLES}
    background: ${config.backgroundColor};
    border-radius: ${config.borderRadius || '0 0 4px 0'};
    cursor: pointer;
    text-align: center;
    ${config.additionalStyles || ''}
  `;
  button.textContent = config.text;

  if (config.clickHandler) {
    button.addEventListener('click', config.clickHandler);
  }

  return button;
}

/**
 * Creates an auto capture label for save rules
 */
export function createAutoCaptureLabel(
  element: HTMLElement,
  rule: SaveRule,
): void {
  const container = createContainer({
    className: 'markdown-capture-container',
  });

  // Create rule status label
  const statusLabel = createLabel({
    text: rule.enabled ? 'AUTO SAVE' : 'DISABLED',
    backgroundColor: rule.enabled ? '#007cba' : '#666666',
    additionalStyles: `
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    `,
  });

  // Create save button
  const saveButton = createButton({
    text: 'SAVE',
    backgroundColor: '#28a745',
    clickHandler: async () => {
      const markdown = htmlToMarkdown(element);

      // Send to background script for saving
      chrome.runtime.sendMessage({
        action: 'saveMarkdown',
        content: markdown,
        url: window.location.href,
        title: document.title,
      });
    },
  });

  // Create toggle button
  const toggleButton = createButton({
    text: rule.enabled ? 'DISABLE' : 'ENABLE',
    backgroundColor: rule.enabled ? '#dc3545' : '#28a745',
    clickHandler: async () => {
      await toggleSaveRule(rule.id);
      // Remove and recreate the label to reflect new state
      container.remove();
      window.location.reload(); // Simple approach to refresh the UI
    },
  });

  container.appendChild(statusLabel);
  container.appendChild(saveButton);
  container.appendChild(toggleButton);

  // Store original position to restore later
  const originalPosition = element.style.position;
  if (
    originalPosition !== 'relative' &&
    originalPosition !== 'absolute' &&
    originalPosition !== 'fixed'
  ) {
    element.style.position = 'relative';
    element.setAttribute(
      'data-original-position',
      originalPosition || 'static',
    );
  }

  element.appendChild(container);
}

/**
 * Creates a suggested save label for suggested rules
 */
export function createSuggestedSaveLabel(element: HTMLElement): void {
  const container = createContainer({
    className: 'markdown-suggested-container',
  });

  // Create "SUGGESTED SAVE" label
  const suggestedLabel = createLabel({
    text: 'SUGGESTED SAVE',
    backgroundColor: '#007cba',
    additionalStyles: 'text-align: center;',
  });

  // Create manual save button
  const saveButton = createButton({
    text: 'SAVE',
    backgroundColor: '#28a745',
    clickHandler: async () => {
      const markdown = htmlToMarkdown(element);

      // Send to background script for saving
      chrome.runtime.sendMessage({
        action: 'saveMarkdown',
        content: markdown,
        url: window.location.href,
        title: document.title,
      });
    },
  });

  // Create "ADD SAVE RULE" button
  const addRuleButton = createButton({
    text: 'ADD SAVE RULE',
    backgroundColor: '#007cba',
    borderRadius: '0 0 4px 4px',
    additionalStyles: 'font-size: 8px;',
    clickHandler: async () => {
      await createRuleFromElement(element);
      // Remove suggested label since we now have an auto rule
      container.remove();
      window.location.reload(); // Simple approach to refresh the UI
    },
  });

  container.appendChild(suggestedLabel);
  container.appendChild(saveButton);
  container.appendChild(addRuleButton);

  // Store original position to restore later
  const originalPosition = element.style.position;
  if (
    originalPosition !== 'relative' &&
    originalPosition !== 'absolute' &&
    originalPosition !== 'fixed'
  ) {
    element.style.position = 'relative';
    element.setAttribute(
      'data-original-position',
      originalPosition || 'static',
    );
  }

  element.appendChild(container);
}

/**
 * Removes all markdown labels from an element
 */
export function removeMarkdownLabels(element: HTMLElement): void {
  const containers = element.querySelectorAll(
    '.markdown-capture-container, .markdown-suggested-container',
  );
  containers.forEach(container => container.remove());

  // Restore original position if it was stored
  const originalPosition = element.getAttribute('data-original-position');
  if (originalPosition) {
    element.style.position = originalPosition;
    element.removeAttribute('data-original-position');
  }
}

/**
 * Color constants for consistent theming
 */
export const Colors = {
  PRIMARY: '#007cba',
  SUCCESS: '#28a745',
  DANGER: '#dc3545',
  DISABLED: '#666666',
  WHITE: '#ffffff',
} as const;
