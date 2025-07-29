/**
 * Page debug box module for displaying debug messages in a fixed overlay
 */

let pageDebugBox: HTMLElement | null = null;
let debugMode = true;

/**
 * Initializes the page debug box with settings from storage
 */
export function initializePageDebugBox(): void {
  chrome.storage.sync.get(
    ['debugMode'],
    (result: { [key: string]: boolean }) => {
      debugMode = result.debugMode === undefined ? true : result.debugMode;
      if (debugMode) {
        createPageDebugBox();
        showPageDebug('Debug mode enabled on page load');
      }
    },
  );
}

/**
 * Creates the page debug box element if it doesn't exist
 */
function createPageDebugBox(): void {
  if (pageDebugBox) return;

  pageDebugBox = document.createElement('div');
  pageDebugBox.id = 'markdown-capture-page-debug-box';
  pageDebugBox.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
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

  document.body.appendChild(pageDebugBox);
}

/**
 * Shows a debug message in the page debug box
 */
export function showPageDebug(message: string): void {
  if (!debugMode) return;

  if (!pageDebugBox) {
    createPageDebugBox();
  }

  const timestamp = new Date().toLocaleTimeString();
  const debugMessage = `[${timestamp}] ${message}\n`;

  // Add to the beginning of the page debug box content
  const currentContent = pageDebugBox?.textContent || '';
  if (pageDebugBox) {
    pageDebugBox.textContent = debugMessage + currentContent;

    // Keep only last 20 lines
    const lines = pageDebugBox.textContent.split('\n');
    if (lines.length > 20) {
      pageDebugBox.textContent = lines.slice(0, 20).join('\n');
    }
  }
}

/**
 * Updates the debug mode setting
 */
export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  if (!enabled && pageDebugBox) {
    pageDebugBox.remove();
    pageDebugBox = null;
  }
}

/**
 * Gets the current debug mode state
 */
export function isDebugModeEnabled(): boolean {
  return debugMode;
}

/**
 * Sends debug messages to content script for display
 */
export function sendDebugMessage(
  tabId: number,
  action?: string,
  message: string | null = null,
): void {
  chrome.tabs
    .sendMessage(tabId, {
      action: 'showDebug',
      message: `Background: ${action}${message ? ` - ${message}` : ''}`,
    })
    .catch(() => {
      // Content script might not be ready, ignore error
    });
}
