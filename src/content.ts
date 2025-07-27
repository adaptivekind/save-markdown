import { htmlToMarkdown } from './htmlToMarkdown';
import { initializePageDebugBox, showPageDebug } from './pageDebugBox';
import {
  createElementDebugBox,
  removeElementDebugBox,
  getElementDebugBoxElement,
} from './elementDebugBox';
import { generateXPath } from './xpathGenerator';
import {
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
  });
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
