import { htmlToMarkdown } from './htmlToMarkdown';
import { initializePageDebugBox, showPageDebug } from './pageDebugBox';
import {
  createElementDebugBox,
  removeElementDebugBox,
  getElementDebugBoxElement,
} from './elementDebugBox';
import { generateXPath } from './xpathGenerator';
import {
  CaptureRule,
  createRuleFromElement,
  findCaptureElements,
  findAllCaptureElements,
  toggleCaptureRule,
} from './captureRules';

let isSelectionActive = false;
let isAutoCaptureActive = false;
let overlay: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;
let lastHoveredElement: HTMLElement | null = null;

interface TabMessage {
  action:
    | 'startSelection'
    | 'stopSelection'
    | 'showDebug'
    | 'capture'
    | 'startAutoCapture'
    | 'stopAutoCapture';
  message?: string;
  frameId?: number;
  pageUrl?: string;
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

// Initialize auto capture on page load
initializeAutoCapture();

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener(
  (
    request: TabMessage | RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    console.log('onMessage content.ts', request);

    if (request.action === 'startSelection') {
      try {
        startElementSelection();
        showPageDebug('Element selection started');
        sendResponse({ success: true, message: 'Selection started' });
      } catch (error) {
        showPageDebug(`Error starting selection: ${(error as Error).message}`);
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true; // Keep message channel open for async response
    } else if (request.action === 'stopSelection') {
      try {
        stopElementSelection();
        showPageDebug('Element selection stopped');
        sendResponse({ success: true, message: 'Selection stopped' });
      } catch (error) {
        showPageDebug(`Error stopping selection: ${(error as Error).message}`);
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true; // Keep message channel open for async response
    } else if (request.action === 'showDebug' && 'message' in request) {
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
    } else if (request.action === 'startAutoCapture') {
      try {
        startSelectCapture();
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
    }

    // Return false for unhandled messages
    return false;
  },
);

function startElementSelection(): void {
  if (isSelectionActive) return;
  console.log('Starting Element Selection');

  isSelectionActive = true;
  document.body.style.cursor = 'crosshair';

  // Create overlay
  overlay = document.createElement('div');
  overlay.id = 'markdown-capture-overlay';
  overlay.style.cssText = `
    position: absolute;
    border: 2px dashed #007cba;
    background: rgba(0, 124, 186, 0.1);
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

function stopElementSelection(): void {
  if (!isSelectionActive) return;

  isSelectionActive = false;
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

function startSelectCapture(): void {
  if (isAutoCaptureActive) return;
  console.log('Starting Select Capture Mode');

  isAutoCaptureActive = true;
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
  if (!isAutoCaptureActive) return;

  isAutoCaptureActive = false;
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
  if ((!isSelectionActive && !isAutoCaptureActive) || !overlay) return;

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
  if ((!isSelectionActive && !isAutoCaptureActive) || !overlay) return;
  overlay.style.display = 'none';
  removeElementDebugBox();
}

function handleClick(e: MouseEvent): void {
  if (!isSelectionActive && !isAutoCaptureActive) return;
  console.log('Handling Click');

  e.preventDefault();
  e.stopPropagation();

  selectedElement = e.target as HTMLElement;

  if (isSelectionActive) {
    // Regular capture mode
    captureElement(selectedElement);
    stopElementSelection();
  } else if (isAutoCaptureActive) {
    // Auto capture mode - create rule instead of capturing
    createCaptureRule(selectedElement);
    stopAutoCapture();
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (isSelectionActive) {
      stopElementSelection();
    } else if (isAutoCaptureActive) {
      stopAutoCapture();
    }
  }
}

function captureElement(element: HTMLElement): void {
  // Convert element to markdown
  const markdown = htmlToMarkdown(element);
  console.log('markdown', markdown);

  const xpath = generateXPath(element);
  showPageDebug(
    `Captured element: ${element.tagName} (${markdown.length} chars)\nXPath: ${xpath}`,
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

async function createCaptureRule(element: HTMLElement): Promise<void> {
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
  try {
    // Check if auto capture is enabled
    const settings = await chrome.storage.sync.get(['enableAutoCapture']);
    const isEnabled = settings.enableAutoCapture !== false; // Default to true

    if (!isEnabled) {
      showPageDebug('Auto capture is disabled');
      return;
    }

    const enabledMatches = await findCaptureElements();
    const allMatches = await findAllCaptureElements();

    // Highlight all auto capture elements (enabled and disabled)
    highlightCaptureElements(allMatches);

    // Auto capture only enabled elements on page load
    for (const match of enabledMatches) {
      showPageDebug(`Auto capturing: ${match.rule.name}`);
      await capture(match.element);
    }
  } catch (error) {
    console.error('Failed to initialize auto capture:', error);
  }
}

function highlightCaptureElements(
  matches: { element: HTMLElement; rule: CaptureRule }[],
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

function addAutoCaptureLabel(element: HTMLElement, rule: CaptureRule): void {
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
  text.textContent = rule.enabled ? 'CAPTURE AUTO' : 'CAPTURE MANUAL';

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
  manualCaptureButton.textContent = 'SAVE';

  // Add click handler for toggle
  label.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const newState = await toggleCaptureRule(rule.id);

      // Update visual state
      toggle.style.background = newState ? '#28a745' : '#dc3545';
      toggleSlider.style.left = newState ? '7px' : '1px';
      label.style.background = newState ? '#007cba' : '#666666';
      text.textContent = newState ? 'CAPTURE AUTO' : 'CAPTURE MANUAL';
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
