/**
 * Status window module for displaying download completion status on the page
 */

let statusWindow: HTMLElement | null = null;
let statusEnabled = false;

/**
 * Initializes the status window with settings from storage
 */
export function initializeStatusWindow(): void {
  chrome.storage.sync.get(
    ['showStatusWindow'],
    (result: { [key: string]: boolean }) => {
      statusEnabled = result.showStatusWindow === true;
      if (statusEnabled) {
        createStatusWindow();
      }
    },
  );
}

/**
 * Creates the status window container if it doesn't exist
 */
function createStatusWindow(): void {
  if (statusWindow) return;

  statusWindow = document.createElement('div');
  statusWindow.id = 'markdown-save-status-window';
  statusWindow.setAttribute('role', 'status');
  statusWindow.setAttribute('aria-live', 'polite');
  statusWindow.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    width: 350px;
    max-height: 400px;
    background: rgba(255, 255, 255, 0.95);
    color: #333;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    z-index: 10000;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(4px);
  `;

  document.body.appendChild(statusWindow);
}

/**
 * Shows a download completion status with the absolute file path
 */
export function showDownloadStatus(filename?: string): void {
  if (!statusEnabled) return;

  if (!statusWindow) {
    createStatusWindow();
  }

  if (!statusWindow) return;

  const statusItem = document.createElement('div');
  statusItem.setAttribute('role', 'status');
  statusItem.setAttribute('aria-label', `File saved: ${filename}`);
  statusItem.style.cssText = `
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    word-wrap: break-word;
    font-size: 13px;
  `;

  const timestamp = new Date().toLocaleTimeString();
  statusItem.innerHTML = `
    <div style="color: #28a745; font-weight: 500; margin-bottom: 4px;">
      ✓ File saved at <span class="timestamp">${timestamp}</span>
    </div>
    <div class="filename" style="color: #666; font-family: monospace; font-size: 12px;">
      ${filename}
    </div>
  `;

  // Add to the top of the status window
  statusWindow.insertBefore(statusItem, statusWindow.firstChild);

  // Keep only last 10 status items
  const items = statusWindow.querySelectorAll('div[role="status"]');
  if (items.length > 10) {
    for (let i = 10; i < items.length; i++) {
      items[i]?.remove();
    }
  }

  // Auto-hide individual status after 10 seconds
  setTimeout(() => {
    if (statusItem.parentNode) {
      statusItem.style.opacity = '0.5';
    }
  }, 10000);
}

/**
 * Updates the status window enabled state
 */
export function setStatusWindowEnabled(enabled: boolean): void {
  statusEnabled = enabled;
  if (!enabled && statusWindow) {
    statusWindow.remove();
    statusWindow = null;
  } else if (enabled && !statusWindow) {
    createStatusWindow();
  }
}

/**
 * Gets the current status window enabled state
 */
export function isStatusWindowEnabled(): boolean {
  return statusEnabled;
}

/**
 * Clears all status items from the window
 */
export function clearStatusWindow(): void {
  if (statusWindow) {
    statusWindow.innerHTML = '';
  }
}
