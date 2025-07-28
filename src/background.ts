import { saveMarkdownFile } from './saveMarkdown';

interface SaveMarkdownMessage {
  action: 'saveMarkdown';
  content: string;
  url: string;
  title: string;
}

type Message = SaveMarkdownMessage;

// Function to create context menu
function createContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: 'save-markdown-parent',
        title: 'Save Markdown',
        contexts: ['page', 'selection', 'link', 'image'],
      },
      () => {
        chrome.contextMenus.create({
          id: 'create-save-rule',
          parentId: 'save-markdown-parent',
          title: 'Create Save Rule',
          contexts: ['page', 'selection', 'link', 'image'],
          visible: true,
        });

        chrome.contextMenus.create({
          id: 'markdown-capture-options',
          parentId: 'save-markdown-parent',
          title: 'Edit Options',
          contexts: ['page', 'selection', 'link', 'image'],
          visible: true,
        });
      },
    );
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  updateIcon();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
  updateIcon();
});

// Update icon based on auto capture state
async function updateIcon(): Promise<void> {
  const settings = await chrome.storage.sync.get(['enableAutoCapture']);
  const isEnabled = settings.enableAutoCapture !== false;

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

chrome.contextMenus.onClicked.addListener(
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === 'create-save-rule' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'startCreateSaveRule' });
    } else if (info.menuItemId === 'markdown-capture-options') {
      chrome.runtime.openOptionsPage();
    }
  },
);

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
