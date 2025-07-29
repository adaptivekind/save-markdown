import { htmlToMarkdown } from './htmlToMarkdown';
import { initializePageDebugBox, showPageDebug } from './debugPage';
import {
  initializeStatusWindow,
  showDownloadStatus,
  setStatusWindowEnabled,
} from './statusWindow';
import { getDownloadPath } from './downloadUtils';
import {
  createElementDebugBox,
  removeElementDebugBox,
  getElementDebugBoxElement,
} from './debugElement';
import { generateXPath, getElementByXPath } from './xpathGenerator';
import {
  createRuleFromElement,
  findSaveElements,
  findAllSaveElements,
  toggleSaveRule,
} from './saveRules';
import { findSuggestedElement } from './suggestedRules';
import { SaveRule } from './types';

let isCreateSaveRuleActive = false;
let overlay: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;
let lastHoveredElement: HTMLElement | null = null;

interface TabMessage {
  action:
    | 'showDebug'
    | 'capture'
    | 'startCreateSaveRule'
    | 'stopAutoCapture'
    | 'checkSuggestedStatus'
    | 'updateStatusWindow'
    | 'fileSaved';
  message?: string;
  frameId?: number;
  pageUrl?: string;
  enabled?: boolean;
  filename?: string;
  downloadId?: number;
  relativeFilename?: string;
  absolutePath?: string;
  targetElementInfo?: {
    linkUrl?: string;
    srcUrl?: string;
    selectionText?: string;
  };
}

interface SaveMarkdownMessage {
  action: 'saveMarkdown';
  content: string;
  url: string;
  title: string;
}

interface RuntimeMessage {
  action: 'captureComplete' | 'captureError';
  error?: string;
  filename?: string;
}

// Initialize page debug box
initializePageDebugBox();

// Initialize status window
initializeStatusWindow();

// Initialize auto capture on page load
initializeAutoCapture();

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener(
  (
    request: TabMessage | RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (request.action === 'showDebug' && 'message' in request) {
      showPageDebug(request.message || 'Debug message');
      return false;
    } else if (request.action === 'captureComplete') {
      const filename = (request as RuntimeMessage).filename;
      showPageDebug(
        `Capture completed successfully${filename ? `: ${filename}` : ''}`,
      );
      if (filename) {
        showCaptureCompleteNotification(filename);
      }
      return false;
    } else if (request.action === 'captureError') {
      showPageDebug(`Capture error: ${request.error || 'Unknown error'}`);
      return false;
    } else if (request.action === 'capture') {
      try {
        handleAutoCapture(request);
        sendResponse({ success: true, message: 'Auto capture rule created' });
      } catch (error) {
        showPageDebug(
          `Error creating auto capture rule: ${(error as Error).message}`,
        );
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true;
    } else if (request.action === 'startCreateSaveRule') {
      try {
        startCreateSaveRule();
        showPageDebug('Auto capture mode started');
        sendResponse({ success: true, message: 'Auto capture mode started' });
      } catch (error) {
        showPageDebug(
          `Error starting auto capture mode: ${(error as Error).message}`,
        );
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true;
    } else if (request.action === 'stopAutoCapture') {
      try {
        stopAutoCapture();
        showPageDebug('Auto capture mode stopped');
        sendResponse({ success: true, message: 'Auto capture mode stopped' });
      } catch (error) {
        showPageDebug(
          `Error stopping auto capture mode: ${(error as Error).message}`,
        );
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true;
    } else if (request.action === 'checkSuggestedStatus') {
      try {
        // Check if there's a suggested element on the page
        const hasSuggestedElement =
          document.querySelector('[data-markdown-suggested="true"]') !== null;
        sendResponse({ hasSuggestedElement });
      } catch (error) {
        sendResponse({ hasSuggestedElement: false });
      }
      return true;
    } else if (request.action === 'updateStatusWindow') {
      try {
        // Update status window enabled state
        if (typeof request.enabled === 'boolean') {
          setStatusWindowEnabled(request.enabled);
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false });
      }
      return true;
    } else if (request.action === 'fileSaved') {
      try {
        // Handle file saved notification
        if (request.absolutePath) {
          // Use absolute path if provided
          showPageDebug(`File saved: ${request.relativeFilename}`);
          showDownloadStatus(request.absolutePath);
        } else if (request.downloadId && request.relativeFilename) {
          // Fallback: resolve absolute filename from downloadId if absolute path not provided
          getDownloadPath(request.downloadId)
            .then(absolutePath => {
              showPageDebug(`File saved: ${request.relativeFilename}`);
              showDownloadStatus(absolutePath);
            })
            .catch(() => {
              // Fallback to relative filename if resolution fails
              showPageDebug(`File saved: ${request.relativeFilename}`);
              showDownloadStatus(request.relativeFilename);
            });
        } else if (request.relativeFilename) {
          // Fallback case without downloadId
          showPageDebug(`File saved: ${request.relativeFilename}`);
          showDownloadStatus(request.relativeFilename);
        } else if (request.filename) {
          // Legacy support for direct filename
          showPageDebug(`File saved: ${request.filename}`);
          showDownloadStatus(request.filename);
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false });
      }
      return true;
    }

    // Return false for unhandled messages
    return false;
  },
);

function startCreateSaveRule(): void {
  if (isCreateSaveRuleActive) return;

  isCreateSaveRuleActive = true;
  document.body.style.cursor = 'copy';

  // Create overlay with different styling for select capture
  overlay = document.createElement('div');
  overlay.id = 'markdown-select-capture-overlay';
  overlay.style.cssText = `
    position: absolute;
    border: 2px dashed #28a745;
    background: rgba(40, 167, 69, 0.1);
    pointer-events: none;
    z-index: 10000;
    display: none;
  `;
  document.body.appendChild(overlay);

  // Add event listeners
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
}

function stopAutoCapture(): void {
  if (!isCreateSaveRuleActive) return;

  isCreateSaveRuleActive = false;
  document.body.style.cursor = '';

  // Remove overlay
  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  // Remove debug box
  removeElementDebugBox();

  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);
}

function handleMouseOver(e: MouseEvent): void {
  if (!isCreateSaveRuleActive || !overlay) return;

  const element = e.target as HTMLElement;
  if (element === overlay || element === getElementDebugBoxElement()) return;

  lastHoveredElement = element;

  const rect = element.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';

  // Show element debug box
  createElementDebugBox(element);
}

function handleMouseOut(): void {
  if (!isCreateSaveRuleActive || !overlay) return;
  overlay.style.display = 'none';
  removeElementDebugBox();
}

function handleClick(e: MouseEvent): void {
  if (!isCreateSaveRuleActive) return;

  e.preventDefault();
  e.stopPropagation();

  selectedElement = e.target as HTMLElement;

  // Create save rule mode
  createSaveRule(selectedElement);
  stopAutoCapture();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (isCreateSaveRuleActive) {
      stopAutoCapture();
    }
  }
}

async function createSaveRule(element: HTMLElement): Promise<void> {
  // Generate and show XPath before creating the rule
  const xpath = generateXPath(element);
  showPageDebug(
    `Auto capture rule created for ${element.tagName.toLowerCase()}\nXPath saved: ${xpath}`,
  );

  await createRuleFromElement(element);

  // Refresh auto capture elements
  await initializeAutoCapture();
}

// Auto capture functions
async function initializeAutoCapture(): Promise<void> {
  // Check if auto capture is enabled
  const settings = await chrome.storage.sync.get([
    'enableAutoCapture',
    'enableSuggestedRules',
  ]);
  const isAutoSaveEnabled = settings.enableAutoCapture !== false; // Default to true
  const areSuggestedRulesEnabled = settings.enableSuggestedRules !== false; // Default to true

  if (!isAutoSaveEnabled) {
    showPageDebug('Auto capture is disabled');
    return;
  }

  const enabledMatches = await findSaveElements();
  const allMatches = await findAllSaveElements();

  // Highlight all auto capture elements (enabled and disabled)
  highlightSaveElements(allMatches);

  // Auto capture only enabled elements on page load
  for (const match of enabledMatches) {
    showPageDebug(`Auto capturing: ${match.rule.name}`);
    await capture(match.element);
  }

  // If no auto save rules exist and suggested rules are enabled, check for suggested elements
  if (allMatches.length === 0 && areSuggestedRulesEnabled) {
    const suggestedMatch = await findSuggestedElement();
    if (suggestedMatch) {
      highlightSuggestedElement(suggestedMatch);
    }
  }
}

function highlightSaveElements(
  matches: { element: HTMLElement; rule: SaveRule }[],
): void {
  matches.forEach(({ element, rule }) => {
    element.style.outline = '2px solid #007cba';
    element.style.outlineOffset = '2px';
    element.setAttribute('data-markdown-capture', 'true');
    element.setAttribute('data-rule-id', rule.id);

    // Add label div to top-right of element
    addAutoCaptureLabel(element, rule);
  });
}

function highlightSuggestedElement(match: {
  element: HTMLElement;
  rule: SaveRule;
}): void {
  const { element, rule } = match;

  // Add dashed blue border
  element.style.outline = '2px dashed #007cba';
  element.style.outlineOffset = '2px';
  element.setAttribute('data-markdown-suggested', 'true');
  element.setAttribute('data-suggested-rule-id', rule.id);

  // Add suggested save label
  addSuggestedSaveLabel(element, rule);
}

function addAutoCaptureLabel(element: HTMLElement, rule: SaveRule): void {
  // Create main container
  const container = document.createElement('div');
  container.className = 'markdown-capture-container';
  container.style.cssText = `
    position: absolute;
    top: -2px;
    right: -2px;
    z-index: 10001;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
  `;

  // Create label container
  const label = document.createElement('div');
  label.className = 'markdown-capture-label';
  label.style.cssText = `
    background: ${rule.enabled ? '#007cba' : '#666666'};
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 0 0 0 4px;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  `;

  // Create toggle switch
  const toggle = document.createElement('div');
  toggle.className = 'capture-toggle';
  toggle.style.cssText = `
    width: 16px;
    height: 10px;
    background: ${rule.enabled ? '#28a745' : '#dc3545'};
    border-radius: 5px;
    position: relative;
    transition: background-color 0.2s ease;
  `;

  const toggleSlider = document.createElement('div');
  toggleSlider.style.cssText = `
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: ${rule.enabled ? '7px' : '1px'};
    transition: left 0.2s ease;
  `;
  toggle.appendChild(toggleSlider);

  // Create text
  const text = document.createElement('span');
  text.textContent = rule.enabled ? 'AUTO SAVE' : 'MANUAL SAVE';

  // Create manual capture button (only shown when rule is disabled)
  const manualCaptureButton = document.createElement('div');
  manualCaptureButton.className = 'manual-capture-button';
  manualCaptureButton.style.cssText = `
    background: #28a745;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 0 0 4px 4px;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    cursor: pointer;
    text-align: center;
    display: ${rule.enabled ? 'none' : 'block'};
    transition: background-color 0.2s ease;
  `;
  manualCaptureButton.textContent = 'SAVE (ONCE)';

  // Add click handler for toggle
  label.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const newState = await toggleSaveRule(rule.id);

      // Update visual state
      toggle.style.background = newState ? '#28a745' : '#dc3545';
      toggleSlider.style.left = newState ? '7px' : '1px';
      label.style.background = newState ? '#007cba' : '#666666';
      text.textContent = newState ? 'AUTO SAVE' : 'MANUAL SAVE';
      manualCaptureButton.style.display = newState ? 'none' : 'block';

      // Update rule object
      rule.enabled = newState;

      showPageDebug(
        `Capture rule ${newState ? 'enabled' : 'disabled'}: ${rule.name}`,
      );
    } catch (error) {
      showPageDebug(
        `Failed to toggle capture rule: ${(error as Error).message}`,
      );
    }
  });

  // Add right-click context menu handler
  label.addEventListener('contextmenu', async e => {
    e.preventDefault();
    e.stopPropagation();

    showSaveRuleContextMenu(e, rule, element, container);
  });

  // Add click handler for manual capture button
  manualCaptureButton.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await capture(element);
      showPageDebug(`Manual capture completed: ${rule.name}`);

      // Brief visual feedback
      manualCaptureButton.style.background = '#007cba';
      setTimeout(() => {
        manualCaptureButton.style.background = '#28a745';
      }, 200);
    } catch (error) {
      showPageDebug(`Failed to manually capture: ${(error as Error).message}`);
      manualCaptureButton.style.background = '#dc3545';
      setTimeout(() => {
        manualCaptureButton.style.background = '#28a745';
      }, 1000);
    }
  });

  // Assemble label
  label.appendChild(toggle);
  label.appendChild(text);

  // Assemble container
  container.appendChild(label);
  container.appendChild(manualCaptureButton);

  // Make sure the parent element has relative positioning
  const originalPosition = element.style.position;
  if (!originalPosition || originalPosition === 'static') {
    element.style.position = 'relative';
    element.setAttribute(
      'data-original-position',
      originalPosition || 'static',
    );
  }

  // Add container to element
  element.appendChild(container);
}

function addSuggestedSaveLabel(element: HTMLElement, rule: SaveRule): void {
  // Create main container
  const container = document.createElement('div');
  container.className = 'markdown-suggested-container';
  container.style.cssText = `
    position: absolute;
    top: -2px;
    right: -2px;
    z-index: 10001;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
  `;

  // Create "SUGGESTED SAVE" label
  const suggestedLabel = document.createElement('div');
  suggestedLabel.className = 'markdown-suggested-label';
  suggestedLabel.style.cssText = `
    background: #007cba;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 0 0 0 4px;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    text-align: center;
  `;
  suggestedLabel.textContent = 'SUGGESTED SAVE';

  // Create manual save button
  const saveButton = document.createElement('div');
  saveButton.className = 'suggested-save-button';
  saveButton.style.cssText = `
    background: #28a745;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 0 0 4px 0;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.2s ease;
  `;
  saveButton.textContent = 'SAVE (ONCE)';

  // Create "ADD SAVE RULE" button
  const addRuleButton = document.createElement('div');
  addRuleButton.className = 'add-save-rule-button';
  addRuleButton.style.cssText = `
    background: #6c757d;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 0 0 4px 4px;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.2s ease;
  `;
  addRuleButton.textContent = 'ADD SAVE RULE';

  // Add click handler for save button
  saveButton.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await capture(element);
      showPageDebug(`Suggested save completed: ${rule.name}`);

      // Brief visual feedback
      saveButton.style.background = '#007cba';
      setTimeout(() => {
        saveButton.style.background = '#28a745';
      }, 200);
    } catch (error) {
      showPageDebug(
        `Failed to save suggested element: ${(error as Error).message}`,
      );
      saveButton.style.background = '#dc3545';
      setTimeout(() => {
        saveButton.style.background = '#28a745';
      }, 1000);
    }
  });

  // Add click handler for add rule button
  addRuleButton.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const domain = window.location.hostname.replace('www.', '');
      const { addSaveRule } = await import('./saveRules');

      // Create auto save rule from suggested rule
      await addSaveRule(domain, rule.xpath, `Auto save: ${rule.name}`);

      showPageDebug(`Auto save rule created for ${domain}: ${rule.name}`);

      // Remove suggested highlighting and refresh auto capture
      cleanupSuggestedElement(element, container);
      await initializeAutoCapture();

      // Brief visual feedback
      addRuleButton.style.background = '#007cba';
      setTimeout(() => {
        addRuleButton.style.background = '#6c757d';
      }, 200);
    } catch (error) {
      showPageDebug(
        `Failed to create auto save rule: ${(error as Error).message}`,
      );
      addRuleButton.style.background = '#dc3545';
      setTimeout(() => {
        addRuleButton.style.background = '#6c757d';
      }, 1000);
    }
  });

  // Assemble container
  container.appendChild(suggestedLabel);
  container.appendChild(saveButton);
  container.appendChild(addRuleButton);

  // Make sure the parent element has relative positioning
  const originalPosition = element.style.position;
  if (!originalPosition || originalPosition === 'static') {
    element.style.position = 'relative';
    element.setAttribute(
      'data-original-position',
      originalPosition || 'static',
    );
  }

  // Add container to element
  element.appendChild(container);
}

function cleanupSuggestedElement(
  element: HTMLElement,
  container: HTMLElement,
): void {
  // Remove the suggested container
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }

  // Remove suggested-related attributes
  element.removeAttribute('data-markdown-suggested');
  element.removeAttribute('data-suggested-rule-id');

  // Remove outline styling
  element.style.outline = '';
  element.style.outlineOffset = '';

  // Restore original position if it was changed
  const originalPosition = element.getAttribute('data-original-position');
  if (originalPosition) {
    element.style.position =
      originalPosition === 'static' ? '' : originalPosition;
    element.removeAttribute('data-original-position');
  }
}

function showSaveRuleContextMenu(
  e: MouseEvent,
  rule: SaveRule,
  element: HTMLElement,
  container: HTMLElement,
): void {
  // Remove any existing context menu
  removeExistingContextMenu();

  // Create context menu
  const contextMenu = document.createElement('div');
  contextMenu.id = 'capture-rule-context-menu';
  contextMenu.style.cssText = `
    position: fixed;
    top: ${e.clientY}px;
    left: ${e.clientX}px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10002;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 180px;
    overflow: hidden;
  `;

  // Create menu header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    font-weight: 600;
    color: #495057;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  header.textContent = 'Save Markdown';

  // Create rule info section
  const ruleInfo = document.createElement('div');
  ruleInfo.style.cssText = `
    padding: 8px 12px;
    border-bottom: 1px solid #dee2e6;
    background: #f8f9fa;
  `;
  ruleInfo.innerHTML = `
    <div style="font-weight: 500; color: #495057; margin-bottom: 2px;">${rule.name}</div>
    <div style="font-size: 11px; color: #6c757d;">${rule.domain}</div>
  `;

  // Create edit XPath option
  const editOption = document.createElement('div');
  editOption.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    color: #007cba;
    font-weight: 500;
    transition: background-color 0.15s ease;
    border-bottom: 1px solid #dee2e6;
  `;
  editOption.textContent = 'Edit XPath';

  // Add hover effect for edit option
  editOption.addEventListener('mouseenter', () => {
    editOption.style.background = '#f8f9fa';
  });
  editOption.addEventListener('mouseleave', () => {
    editOption.style.background = 'transparent';
  });

  // Add click handler for edit option
  editOption.addEventListener('click', () => {
    removeExistingContextMenu();
    showXPathEditModal(rule, element, container);
  });

  // Create remove option
  const removeOption = document.createElement('div');
  removeOption.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    color: #dc3545;
    font-weight: 500;
    transition: background-color 0.15s ease;
  `;
  removeOption.textContent = 'Remove Capture Rule';

  // Add hover effect for remove option
  removeOption.addEventListener('mouseenter', () => {
    removeOption.style.background = '#f8f9fa';
  });
  removeOption.addEventListener('mouseleave', () => {
    removeOption.style.background = 'transparent';
  });

  // Add click handler for remove option
  removeOption.addEventListener('click', async () => {
    try {
      await removeSaveRuleAndElement(rule, element, container);
      removeExistingContextMenu();
      showPageDebug(`Capture rule removed: ${rule.name}`);
    } catch (error) {
      showPageDebug(
        `Failed to remove capture rule: ${(error as Error).message}`,
      );
    }
  });

  // Assemble context menu
  contextMenu.appendChild(header);
  contextMenu.appendChild(ruleInfo);
  contextMenu.appendChild(editOption);
  contextMenu.appendChild(removeOption);

  // Add to page
  document.body.appendChild(contextMenu);

  // Position adjustment to keep menu on screen
  const rect = contextMenu.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  if (rect.right > windowWidth) {
    contextMenu.style.left = `${e.clientX - rect.width}px`;
  }
  if (rect.bottom > windowHeight) {
    contextMenu.style.top = `${e.clientY - rect.height}px`;
  }

  // Add click outside to close
  const closeMenu = (event: Event) => {
    if (!contextMenu.contains(event.target as Node)) {
      removeExistingContextMenu();
      document.removeEventListener('click', closeMenu);
    }
  };

  // Delay adding the listener to prevent immediate closing
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);

  // Close on escape key
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      removeExistingContextMenu();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

function removeExistingContextMenu(): void {
  const existingMenu = document.getElementById('capture-rule-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
}

function showXPathEditModal(
  rule: SaveRule,
  element: HTMLElement,
  container: HTMLElement,
): void {
  // Remove any existing modal
  removeExistingModal();

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'xpath-edit-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10003;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create modal header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px 24px 16px;
    border-bottom: 1px solid #dee2e6;
  `;
  header.innerHTML = `
    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #212529;">Edit XPath</h3>
    <p style="margin: 8px 0 0; font-size: 14px; color: #6c757d;">Modify the XPath selector for this capture rule</p>
  `;

  // Create modal body
  const body = document.createElement('div');
  body.style.cssText = `
    padding: 20px 24px;
  `;

  // Rule info
  const ruleInfo = document.createElement('div');
  ruleInfo.style.cssText = `
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
  `;
  ruleInfo.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 4px;">${rule.name}</div>
    <div style="font-size: 12px; color: #6c757d;">${rule.domain}</div>
  `;

  // XPath input section
  const xpathLabel = document.createElement('label');
  xpathLabel.style.cssText = `
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
    color: #212529;
  `;
  xpathLabel.textContent = 'XPath Selector:';

  const xpathInput = document.createElement('textarea');
  xpathInput.style.cssText = `
    width: 100%;
    min-height: 80px;
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    resize: vertical;
    box-sizing: border-box;
  `;
  xpathInput.value = rule.xpath;

  // Status message
  const statusMessage = document.createElement('div');
  statusMessage.style.cssText = `
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    display: none;
  `;

  // Test button
  const testButton = document.createElement('button');
  testButton.style.cssText = `
    margin-top: 12px;
    padding: 6px 12px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  `;
  testButton.textContent = 'Test XPath';

  testButton.addEventListener('click', () => {
    testXPath(xpathInput.value, statusMessage);
  });

  // Assemble body
  body.appendChild(ruleInfo);
  body.appendChild(xpathLabel);
  body.appendChild(xpathInput);
  body.appendChild(statusMessage);
  body.appendChild(testButton);

  // Create modal footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 16px 24px 20px;
    border-top: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  `;

  const cancelButton = document.createElement('button');
  cancelButton.style.cssText = `
    padding: 8px 16px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  `;
  cancelButton.textContent = 'Cancel';

  const saveButton = document.createElement('button');
  saveButton.style.cssText = `
    padding: 8px 16px;
    background: #007cba;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  `;
  saveButton.textContent = 'Save Changes';

  // Add event listeners
  cancelButton.addEventListener('click', removeExistingModal);

  saveButton.addEventListener('click', async () => {
    const newXPath = xpathInput.value.trim();
    if (newXPath && newXPath !== rule.xpath) {
      try {
        await updateSaveRuleXPath(rule, newXPath, element, container);
        removeExistingModal();
        showPageDebug(`XPath updated for rule: ${rule.name}`);
      } catch (error) {
        showErrorMessage(
          statusMessage,
          `Failed to update XPath: ${(error as Error).message}`,
        );
      }
    } else {
      removeExistingModal();
    }
  });

  footer.appendChild(cancelButton);
  footer.appendChild(saveButton);

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // Add to page
  document.body.appendChild(overlay);

  // Focus on input
  xpathInput.focus();
  xpathInput.select();

  // Close on overlay click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      removeExistingModal();
    }
  });

  // Close on escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      removeExistingModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

function removeExistingModal(): void {
  const existingModal = document.getElementById('xpath-edit-overlay');
  if (existingModal) {
    existingModal.remove();
  }
}

function testXPath(xpath: string, statusElement: HTMLElement): void {
  try {
    const element = getElementByXPath(xpath);
    if (element) {
      showSuccessMessage(
        statusElement,
        `✓ XPath is valid and matches 1 element`,
      );

      // Briefly highlight the matched element
      const originalOutline = element.style.outline;
      const originalOutlineOffset = element.style.outlineOffset;
      element.style.outline = '3px solid #28a745';
      element.style.outlineOffset = '2px';

      setTimeout(() => {
        element.style.outline = originalOutline;
        element.style.outlineOffset = originalOutlineOffset;
      }, 2000);
    } else {
      showErrorMessage(statusElement, '✗ XPath does not match any elements');
    }
  } catch (error) {
    showErrorMessage(
      statusElement,
      `✗ Invalid XPath: ${(error as Error).message}`,
    );
  }
}

function showSuccessMessage(element: HTMLElement, message: string): void {
  element.style.cssText = `
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    display: block;
  `;
  element.textContent = message;
}

function showErrorMessage(element: HTMLElement, message: string): void {
  element.style.cssText = `
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    display: block;
  `;
  element.textContent = message;
}

async function updateSaveRuleXPath(
  rule: SaveRule,
  newXPath: string,
  element: HTMLElement,
  container: HTMLElement,
): Promise<void> {
  // Import the updateSaveRule function
  const { updateSaveRule } = await import('./saveRules');

  // Validate the new XPath first
  const testElement = getElementByXPath(newXPath);

  if (!testElement) {
    throw new Error('XPath does not match any elements on this page');
  }

  // Update the rule in storage
  await updateSaveRule(rule.id, { xpath: newXPath });

  // Clean up the current element
  cleanupCaptureElement(element, container);

  // Refresh the auto capture elements on the page
  await initializeAutoCapture();
}

async function removeSaveRuleAndElement(
  rule: SaveRule,
  element: HTMLElement,
  container: HTMLElement,
): Promise<void> {
  // Import the removeSaveRule function
  const { removeSaveRule } = await import('./saveRules');

  // Remove the rule from storage
  await removeSaveRule(rule.id);

  // Clean up the element
  cleanupCaptureElement(element, container);

  // Refresh the auto capture elements on the page
  await initializeAutoCapture();
}

function cleanupCaptureElement(
  element: HTMLElement,
  container: HTMLElement,
): void {
  // Remove the capture container
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }

  // Remove capture-related attributes
  element.removeAttribute('data-markdown-capture');
  element.removeAttribute('data-rule-id');

  // Remove outline styling
  element.style.outline = '';
  element.style.outlineOffset = '';

  // Restore original position if it was changed
  const originalPosition = element.getAttribute('data-original-position');
  if (originalPosition) {
    element.style.position =
      originalPosition === 'static' ? '' : originalPosition;
    element.removeAttribute('data-original-position');
  }
}

function findTargetElementFromContext(targetInfo: {
  linkUrl?: string;
  srcUrl?: string;
  selectionText?: string;
}): HTMLElement | null {
  // Strategy 1: Find element by link URL
  if (targetInfo.linkUrl) {
    const linkElement = document.querySelector(
      `a[href="${targetInfo.linkUrl}"]`,
    ) as HTMLElement;
    if (linkElement) {
      return linkElement;
    }
  }

  // Strategy 2: Find element by image source URL
  if (targetInfo.srcUrl) {
    const imgElement = document.querySelector(
      `img[src="${targetInfo.srcUrl}"]`,
    ) as HTMLElement;
    if (imgElement) {
      return imgElement;
    }
  }

  // Strategy 3: Find element by selected text content
  if (targetInfo.selectionText && targetInfo.selectionText.trim().length > 0) {
    const textContent = targetInfo.selectionText.trim();
    // Use XPath to find elements containing the exact text
    const xpath = `//*[contains(text(), "${textContent}")]`;
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    if (result.singleNodeValue) {
      return result.singleNodeValue as HTMLElement;
    }
  }

  return null;
}

async function handleAutoCapture(request?: TabMessage): Promise<void> {
  let targetElement: HTMLElement | null = null;

  // If called from context menu, try to find the target element
  if (request?.targetElementInfo) {
    targetElement = findTargetElementFromContext(request.targetElementInfo);
    if (targetElement) {
      showPageDebug('Auto capture: Found target element from context menu');
    } else {
      showPageDebug(
        'Auto capture: Could not find target element from context, falling back to last hovered',
      );
    }
  }

  // Fall back to lastHoveredElement if no target found
  if (!targetElement) {
    targetElement = lastHoveredElement;
  }

  if (!targetElement) {
    throw new Error('No element selected for auto capture');
  }

  // Generate and show XPath before creating the rule
  const xpath = generateXPath(targetElement);
  showPageDebug(
    `Auto capture rule created for ${targetElement.tagName.toLowerCase()}\nXPath saved: ${xpath}`,
  );

  await createRuleFromElement(targetElement);

  // Refresh auto capture elements
  await initializeAutoCapture();
}

async function capture(element: HTMLElement): Promise<void> {
  const markdown = htmlToMarkdown(element);

  showPageDebug(
    `Auto captured element: ${element.tagName} (${markdown.length} chars)`,
  );

  // Send to background script for saving
  const message: SaveMarkdownMessage = {
    action: 'saveMarkdown',
    content: markdown,
    url: window.location.href,
    title: document.title,
  };
  chrome.runtime.sendMessage(message);
}

function showCaptureCompleteNotification(filename: string): void {
  // Remove any existing notification
  removeCaptureCompleteNotification();

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'markdown-capture-complete-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #007cba;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 124, 186, 0.3);
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease-in-out;
    max-width: 200px;
    text-align: left;
    word-break: break-word;
  `;

  // Set notification content
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="font-size: 16px;">✓</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 2px;">Markdown saved</div>
        <div style="font-size: 12px; opacity: 0.9;">${filename}</div>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  });

  // Start fade out after 2.7 seconds (fade takes 0.3s)
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';

    // Remove from DOM after fade completes
    setTimeout(() => {
      removeCaptureCompleteNotification();
    }, 300);
  }, 2700);
}

function removeCaptureCompleteNotification(): void {
  const existing = document.getElementById(
    'markdown-capture-complete-notification',
  );
  if (existing) {
    existing.remove();
  }
}
