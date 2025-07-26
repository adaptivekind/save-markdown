console.log('Loading background.ts');

import { generateFilename, generateDownloadPath } from './filename';

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
}

// Create context menu when extension starts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Creating context menu...');
  chrome.contextMenus.create(
    {
      id: 'markdown-capture-start',
      title: 'Start Markdown Selection',
      contexts: ['page'],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Context menu creation failed:',
          chrome.runtime.lastError,
        );
      } else {
        console.log('Context menu created successfully');
      }
    },
  );
});

// Also create context menu on startup (not just install)
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup - ensuring context menu exists');
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'markdown-capture-start',
      title: 'Start Markdown Selection',
      contexts: ['page'],
    });
  });
});

// Create context menu immediately when background script loads
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create(
    {
      id: 'markdown-capture-start',
      title: 'Start Markdown Selection',
      contexts: ['page'],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Context menu creation failed:',
          chrome.runtime.lastError,
        );
      } else {
        console.log('Context menu created on script load');
      }
    },
  );
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    if (info.menuItemId === 'markdown-capture-start' && tab?.id) {
      console.log('Starting selection from context menu');
      chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
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
    console.log('Background received message:', message);
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
  console.log('Saving markdown', url);
  try {
    // Get configuration
    const config = (await chrome.storage.sync.get([
      'saveDirectory',
      'filenameTemplate',
    ])) as Config;
    const directory = config.saveDirectory || '~/Downloads';
    const template = config.filenameTemplate || '{title}_{timestamp}.md';

    // Generate filename with directory path
    const baseFilename = generateFilename({
      template,
      title,
      url,
      maxTitleLength: 50,
    });
    const filename = generateDownloadPath(directory, baseFilename);

    // Add metadata to content
    const fullContent = `<!-- Captured from: ${url} -->
<!-- Date: ${new Date().toISOString()} -->
<!-- Title: ${title} -->

# ${title}

${content}

---
*Captured with Markdown Capture extension*`;

    // Create data URL for download (works in service workers)
    const dataUrl =
      'data:text/markdown;charset=utf-8,' + encodeURIComponent(fullContent);

    console.log('Saving markdown to ', filename);
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify',
      },
      (downloadId?: number) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
          notifyCapture(
            tabId,
            'captureError',
            chrome.runtime.lastError.message,
          );
        } else {
          console.log('Download started with ID:', downloadId);
          notifyCapture(tabId, 'captureComplete');
        }
      },
    );
  } catch (error) {
    console.error('Error saving markdown:', error);
    notifyCapture(tabId, 'captureError', (error as Error).message);
  }
}

function notifyCapture(
  tabId: number,
  action: string,
  error: string | null = null,
): void {
  chrome.tabs.sendMessage(tabId, {
    action: action,
    error: error,
  });

  // Also notify popup if it's open
  chrome.runtime
    .sendMessage({
      action: action,
      error: error,
    })
    .catch(() => {
      // Popup might not be open, ignore error
    });
}
