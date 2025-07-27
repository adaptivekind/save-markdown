import { htmlToMarkdown } from './htmlToMarkdown';

let isSelectionActive = false;
let overlay: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;
let debugOverlay: HTMLElement | null = null;
let elementDebugBox: HTMLElement | null = null;
let debugMode = true;

interface TabMessage {
  action: 'startSelection' | 'stopSelection' | 'showDebug';
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

// Initialize debug overlay and load settings
chrome.storage.sync.get(['debugMode'], (result: { [key: string]: boolean }) => {
  console.log('storage debugMode', result);
  debugMode = result.debugMode === undefined ? true : result.debugMode;
  if (debugMode) {
    console.log('Showing debug overlay');
    createDebugOverlay();
    showDebug('Debug mode enabled on page load');
  }
});

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
        showDebug('Element selection started');
        sendResponse({ success: true, message: 'Selection started' });
      } catch (error) {
        showDebug(`Error starting selection: ${(error as Error).message}`);
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true; // Keep message channel open for async response
    } else if (request.action === 'stopSelection') {
      try {
        stopElementSelection();
        showDebug('Element selection stopped');
        sendResponse({ success: true, message: 'Selection stopped' });
      } catch (error) {
        showDebug(`Error stopping selection: ${(error as Error).message}`);
        sendResponse({ success: false, error: (error as Error).message });
      }
      return true; // Keep message channel open for async response
    } else if (request.action === 'showDebug' && 'message' in request) {
      showDebug(request.message || 'Debug message');
      return false;
    } else if (request.action === 'captureComplete') {
      showDebug('Capture completed successfully');
      return false;
    } else if (request.action === 'captureError') {
      showDebug(`Capture error: ${request.error || 'Unknown error'}`);
      return false;
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
  showDebug('Handling mouse over');

  const element = e.target as HTMLElement;
  if (element === overlay || element === elementDebugBox) return;

  const rect = element.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';

  // Show debug box if in debug mode
  if (debugMode) {
    showDebug('Adding element debug box');
    createElementDebugBox(element);
  }
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

function generateXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      selector += `[@class="${current.className}"]`;
    }

    // Count siblings of the same tag
    let siblingIndex = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        siblingIndex++;
      }
      sibling = sibling.previousElementSibling;
    }

    // Check if there are multiple siblings of the same tag
    const totalSiblings =
      current.parentElement?.querySelectorAll(current.tagName.toLowerCase())
        .length || 1;
    if (totalSiblings > 1) {
      selector += `[${siblingIndex}]`;
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

function captureElement(element: HTMLElement): void {
  // Convert element to markdown
  const markdown = htmlToMarkdown(element);
  console.log('markdown', markdown);

  const xpath = generateXPath(element);
  showDebug(
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

// Debug overlay functions
function createDebugOverlay(): void {
  if (debugOverlay) return;

  debugOverlay = document.createElement('div');
  debugOverlay.id = 'markdown-capture-debug-overlay';
  debugOverlay.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 300px;
    max-height: 500px;
    background: rgba(45, 45, 45, 0.95);
    color: #ffff99;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 8px;
    border: 1px solid #007cba;
    border-radius: 4px;
    z-index: 10001;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;

  document.body.appendChild(debugOverlay);
}

function createElementDebugBox(element: HTMLElement): void {
  if (!debugMode) return;

  removeElementDebugBox();

  elementDebugBox = document.createElement('div');
  elementDebugBox.id = 'markdown-capture-element-debug';
  elementDebugBox.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    padding: 5px;
    border: 1px solid #00ff00;
    border-radius: 3px;
    z-index: 10002;
    max-width: 500px;
    word-wrap: break-word;
    white-space: pre-wrap;
    pointer-events: none;
  `;

  const rect = element.getBoundingClientRect();
  const xpath = generateXPath(element);

  elementDebugBox.textContent = `Tag: ${element.tagName.toLowerCase()}\nXPath: ${xpath}`;

  // Position the debug box with smart positioning
  const boxWidth = 300; // max-width from CSS
  const boxHeight = 60; // Approximate height
  const margin = 5;

  // Check available space in all directions
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceRight = window.innerWidth - rect.right;

  let left: number, top: number;

  // Try positioning above first
  if (spaceAbove >= boxHeight + margin) {
    left = rect.left + window.scrollX;
    top = rect.top + window.scrollY - boxHeight - margin;
  }
  // Try positioning below
  else if (spaceBelow >= boxHeight + margin) {
    left = rect.left + window.scrollX;
    top = rect.bottom + window.scrollY + margin;
  }
  // Try positioning to the right
  else if (spaceRight >= boxWidth + margin) {
    left = rect.right + window.scrollX + margin;
    top = rect.top + window.scrollY;
  }
  // Fallback: position inside element at top-right
  else {
    left = rect.right + window.scrollX - boxWidth - margin;
    top = rect.top + window.scrollY + margin;

    // Ensure it doesn't go outside the element bounds
    if (left < rect.left + window.scrollX) {
      left = rect.left + window.scrollX + margin;
    }
  }

  elementDebugBox.style.left = `${left}px`;
  elementDebugBox.style.top = `${top}px`;

  document.body.appendChild(elementDebugBox);
}

function removeElementDebugBox(): void {
  if (elementDebugBox) {
    elementDebugBox.remove();
    elementDebugBox = null;
  }
}

function showDebug(message: string): void {
  console.log('debug mode', debugMode);
  if (!debugMode) return;

  if (!debugOverlay) {
    createDebugOverlay();
  }

  const timestamp = new Date().toLocaleTimeString();
  const debugMessage = `[${timestamp}] X ${message}\n`;

  // Add to the beginning of the overlay content
  const currentContent = debugOverlay?.textContent || '';
  if (debugOverlay) {
    debugOverlay.textContent = debugMessage + currentContent;

    // Keep only last 20 lines
    const lines = debugOverlay.textContent.split('\n');
    if (lines.length > 20) {
      debugOverlay.textContent = lines.slice(0, 20).join('\n');
    }
  }
}
