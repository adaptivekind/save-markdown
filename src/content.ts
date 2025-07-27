import { htmlToMarkdown } from './htmlToMarkdown';
import { initializePageDebugBox, showPageDebug } from './pageDebugBox';
import {
  createElementDebugBox,
  removeElementDebugBox,
  getElementDebugBoxElement,
} from './elementDebugBox';
import { generateXPath } from './xpathGenerator';
import {
  AutoCaptureRule,
  createRuleFromElement,
  findAutoCaptureElements,
} from './autoCaptureRules';

let isSelectionActive = false;
let overlay: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;
let autoCaptureElements: HTMLElement[] = [];
let lastHoveredElement: HTMLElement | null = null;

interface TabMessage {
  action: 'startSelection' | 'stopSelection' | 'showDebug' | 'autoCapture';
  message?: string;
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
      showPageDebug('Capture completed successfully');
      return false;
    } else if (request.action === 'captureError') {
      showPageDebug(`Capture error: ${request.error || 'Unknown error'}`);
      return false;
    } else if (request.action === 'autoCapture') {
      try {
        handleAutoCapture();
        sendResponse({ success: true, message: 'Auto capture rule created' });
      } catch (error) {
        showPageDebug(
          `Error creating auto capture rule: ${(error as Error).message}`,
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

function handleMouseOver(e: MouseEvent): void {
  if (!isSelectionActive || !overlay) return;
  showPageDebug('Handling mouse over');

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
  showPageDebug('Adding element debug box');
  createElementDebugBox(element);
}

function handleMouseOut(): void {
  if (!isSelectionActive || !overlay) return;
  overlay.style.display = 'none';
  removeElementDebugBox();
}

function handleClick(e: MouseEvent): void {
  if (!isSelectionActive) return;
  console.log('Handling Click');

  e.preventDefault();
  e.stopPropagation();

  selectedElement = e.target as HTMLElement;
  captureElement(selectedElement);
  stopElementSelection();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    stopElementSelection();
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

// Auto capture functions
async function initializeAutoCapture(): Promise<void> {
  try {
    const matches = await findAutoCaptureElements();
    autoCaptureElements = matches.map(match => match.element);

    // Show notification if auto capture rules are active
    if (matches.length > 0) {
      showAutoCaptureNotification(matches);
    }

    // Highlight auto capture elements
    highlightAutoCaptureElements();

    // Auto capture elements on page load
    for (const match of matches) {
      showPageDebug(`Auto capturing: ${match.rule.name}`);
      await autoCapture(match.element);
    }
  } catch (error) {
    console.error('Failed to initialize auto capture:', error);
  }
}

function highlightAutoCaptureElements(): void {
  autoCaptureElements.forEach(element => {
    element.style.outline = '2px solid #007cba';
    element.style.outlineOffset = '2px';
    element.setAttribute('data-markdown-auto-capture', 'true');

    // Add label div to top-right of element
    addAutoCaptureLabel(element);
  });
}

function addAutoCaptureLabel(element: HTMLElement): void {
  // Create label element
  const label = document.createElement('div');
  label.className = 'markdown-capture-label';
  label.textContent = 'MARKDOWN CAPTURE';
  label.style.cssText = `
    position: absolute;
    top: -2px;
    right: -2px;
    background: #007cba;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 0 0 0 4px;
    z-index: 10001;
    pointer-events: none;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  `;

  // Make sure the parent element has relative positioning
  const originalPosition = element.style.position;
  if (!originalPosition || originalPosition === 'static') {
    element.style.position = 'relative';
    element.setAttribute(
      'data-original-position',
      originalPosition || 'static',
    );
  }

  // Add label to element
  element.appendChild(label);
}

async function handleAutoCapture(): Promise<void> {
  if (!lastHoveredElement) {
    throw new Error('No element selected for auto capture');
  }

  await createRuleFromElement(lastHoveredElement);
  showPageDebug(
    `Auto capture rule created for ${lastHoveredElement.tagName.toLowerCase()}`,
  );

  // Refresh auto capture elements
  await initializeAutoCapture();
}

async function autoCapture(element: HTMLElement): Promise<void> {
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

// Auto capture notification functions
function showAutoCaptureNotification(
  matches: { element: HTMLElement; rule: AutoCaptureRule }[],
): void {
  // Remove any existing notification
  removeAutoCaptureNotification();

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'markdown-capture-auto-notification';
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
    max-width: 300px;
    text-align: left;
  `;

  // Set notification text

  const matchesToString = matches
    .map(match => `${match.rule.domain} (${match.rule.xpath})`)
    .join('<br/>');
  notification.innerHTML = `
    <div style="display: flex; align-items: left; gap: 8px;">
      <div>Markdown saved<br/><small>${matchesToString}</small></div>
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
      removeAutoCaptureNotification();
    }, 300);
  }, 2700);
}

function removeAutoCaptureNotification(): void {
  const existing = document.getElementById(
    'markdown-capture-auto-notification',
  );
  if (existing) {
    existing.remove();
  }
}
