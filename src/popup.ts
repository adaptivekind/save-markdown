interface RuntimeMessage {
  action: 'captureComplete' | 'captureError';
  error?: string;
  filename?: string;
}

document.addEventListener('DOMContentLoaded', function () {
  const settingsLink = document.getElementById(
    'settingsLink',
  ) as HTMLAnchorElement;
  const helpLink = document.getElementById('helpLink') as HTMLAnchorElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const autoCaptureToggle = document.getElementById(
    'autoCaptureToggle',
  ) as HTMLDivElement;

  // Check for suggested rules status on page load
  checkSuggestedRulesStatus();

  settingsLink.addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  helpLink.addEventListener('click', function (e) {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/ianhomer/save-markdown',
    });
  });

  // Load current auto capture setting and set toggle state
  chrome.storage.sync.get(['enableAutoCapture'], function (result) {
    const isEnabled = result.enableAutoCapture !== false; // Default to true
    updateToggleState(isEnabled);
  });

  // Handle auto capture toggle click
  autoCaptureToggle.addEventListener('click', function () {
    chrome.storage.sync.get(['enableAutoCapture'], function (result) {
      const currentState = result.enableAutoCapture !== false; // Default to true
      const newState = !currentState;

      chrome.storage.sync.set({ enableAutoCapture: newState }, function () {
        updateToggleState(newState);
        showStatus(
          `Markdown saving ${newState ? 'enabled' : 'disabled'}`,
          'success',
        );
      });
    });
  });

  function updateToggleState(isEnabled: boolean): void {
    if (isEnabled) {
      autoCaptureToggle.classList.add('active');
    } else {
      autoCaptureToggle.classList.remove('active');
    }
  }

  function showStatus(message: string, type: 'success' | 'error'): void {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  function sendDebugToPage(message: string, tabId: number): void {
    chrome.tabs
      .sendMessage(tabId, {
        action: 'showDebug',
        message: message,
      })
      .catch(() => {
        // Content script might not be ready, ignore error
      });
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        sendDebugToPage(
          `Popup: Runtime message - ${JSON.stringify(message)}`,
          activeTab.id,
        );
      }
    });

    if (message.action === 'captureComplete') {
      const statusMessage = message.filename
        ? `Element captured and saved as: ${message.filename}`
        : 'Element captured and saved successfully!';
      showStatus(statusMessage, 'success');
    } else if (message.action === 'captureError') {
      showStatus(
        'Error saving captured element: ' + (message.error || 'Unknown error'),
        'error',
      );
    }
  });

  async function checkSuggestedRulesStatus(): Promise<void> {
    try {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        async function (tabs) {
          const activeTab = tabs[0];
          if (!activeTab?.id) return;

          // Send message to content script to check for suggested rules
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: 'checkSuggestedStatus' },
            response => {
              if (chrome.runtime.lastError) {
                // Content script might not be ready, ignore error
                return;
              }

              if (response?.hasSuggestedElement) {
                showStatus('Suggested save element found on page', 'success');
              }
            },
          );
        },
      );
    } catch (error) {
      // Ignore errors - this is just informational
    }
  }
});
