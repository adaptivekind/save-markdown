import { generateFilename, generateDownloadPath } from './filename';
import { wrapWithMetadata } from './htmlToMarkdown';

interface SaveMarkdownMessage {
  action: 'saveMarkdown';
  content: string;
  url: string;
  title: string;
}

interface StartSelectionMessage {
  action: 'startSelection';
}

interface StopSelectionMessage {
  action: 'stopSelection';
}

type Message =
  | SaveMarkdownMessage
  | StartSelectionMessage
  | StopSelectionMessage;

interface Config {
  saveDirectory?: string;
  filenameTemplate?: string;
  useDomainSubfolder?: boolean;
}

// Function to create context menu
function createContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    // Create parent menu item
    chrome.contextMenus.create(
      {
        id: 'markdown-capture-parent',
        title: 'Save Markdown',
        contexts: ['page', 'selection', 'link', 'image'],
      },
      () => {
        // Create select capture menu item (always visible)
        chrome.contextMenus.create({
          id: 'markdown-capture-auto',
          parentId: 'markdown-capture-parent',
          title: 'Auto Save',
          contexts: ['page', 'selection', 'link', 'image'],
          visible: true, // Always visible
        });

        // Create options menu item
        chrome.contextMenus.create({
          id: 'markdown-capture-options',
          parentId: 'markdown-capture-parent',
          title: 'Options',
          contexts: ['page', 'selection', 'link', 'image'],
          visible: true,
        });
      },
    );
  });
}

// Create context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  updateIcon();
});

// Create context menu when extension starts up
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
  updateIcon();
});

// Update icon based on auto capture state
async function updateIcon(): Promise<void> {
  const settings = await chrome.storage.sync.get(['enableAutoCapture']);
  const isEnabled = settings.enableAutoCapture !== false; // Default to true

  const iconPath = isEnabled
    ? {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      }
    : {
        16: 'icons/icon16-disabled.png',
        48: 'icons/icon48-disabled.png',
        128: 'icons/icon128-disabled.png',
      };

  if (chrome.action && chrome.action.setIcon) {
    await chrome.action.setIcon({ path: iconPath });
  }
}

// Listen for storage changes to update icon
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.enableAutoCapture) {
    updateIcon();
  }
});

// Initialize icon immediately when script loads
updateIcon();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === 'markdown-capture-auto' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'startAutoCapture' });
    } else if (info.menuItemId === 'markdown-capture-options') {
      chrome.runtime.openOptionsPage();
    }
  },
);

// Background script for handling file saving
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (message.action === 'saveMarkdown' && sender.tab?.id) {
      saveMarkdownFile(
        message.content,
        message.url,
        message.title,
        sender.tab.id,
      );
      sendResponse({ success: true });
      return true; // Keep message channel open for async response
    }
    return false; // Don't keep channel open for other messages
  },
);

async function saveMarkdownFile(
  content: string,
  url: string,
  title: string,
  tabId: number,
): Promise<void> {
  try {
    // Get configuration
    const config = (await chrome.storage.sync.get([
      'saveDirectory',
      'filenameTemplate',
      'useDomainSubfolder',
    ])) as Config;
    const directory = config.saveDirectory || '~/Downloads';
    const template = config.filenameTemplate || '{title}_{timestamp}.md';
    const useDomainSubfolder = config.useDomainSubfolder !== false; // Default to true

    // Generate filename with directory path
    const baseFilename = generateFilename({
      template,
      title,
      url,
      maxTitleLength: 50,
    });

    // Extract domain for subfolder if enabled
    const domainSubfolder = useDomainSubfolder
      ? new URL(url).hostname.replace('www.', '').replace(/\./g, '-')
      : undefined;

    const filename = generateDownloadPath(
      directory,
      baseFilename,
      domainSubfolder,
    );

    // Add metadata to content
    const fullContent = wrapWithMetadata(content, {
      url,
      title,
    });

    // Create data URL for download (works in service workers)
    const dataUrl =
      'data:text/markdown;charset=utf-8,' + encodeURIComponent(fullContent);

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'overwrite',
      },
      () => {
        if (chrome.runtime.lastError) {
          notifyCapture(
            tabId,
            'captureError',
            chrome.runtime.lastError.message,
          );
        } else {
          notifyCapture(tabId, 'captureComplete', null, filename);
        }
      },
    );
  } catch (error) {
    notifyCapture(tabId, 'captureError', (error as Error).message);
  }
}

function notifyCapture(
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
