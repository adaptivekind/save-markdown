/**
 * Notification utilities for communicating between background script and content scripts
 */

/**
 * Sends notification messages to content script, popup, and debug output
 */
export function notify(
  tabId: number,
  action: string,
  error: string | null = null,
  filename?: string,
): void {
  chrome.tabs.sendMessage(tabId, {
    action: action,
    error: error,
    filename: filename,
  });

  // Send debug info to content script
  chrome.tabs
    .sendMessage(tabId, {
      action: 'showDebug',
      message: `Background: ${action}${error ? ` - ${error}` : ''}`,
    })
    .catch(() => {
      // Content script might not be ready, ignore error
    });

  // Also notify popup if it's open
  chrome.runtime
    .sendMessage({
      action: action,
      error: error,
      filename: filename,
    })
    .catch(() => {
      // Popup might not be open, ignore error
    });
}
