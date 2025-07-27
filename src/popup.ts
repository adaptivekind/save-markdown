interface TabMessage {
  action: 'startSelection' | 'stopSelection' | 'showDebug';
  message?: string;
}

interface RuntimeMessage {
  action: 'captureComplete' | 'captureError';
  error?: string;
}

document.addEventListener('DOMContentLoaded', function () {
  const startButton = document.getElementById(
    'startSelection',
  ) as HTMLButtonElement;
  const stopButton = document.getElementById(
    'stopSelection',
  ) as HTMLButtonElement;
  const settingsLink = document.getElementById(
    'settingsLink',
  ) as HTMLAnchorElement;
  const helpLink = document.getElementById('helpLink') as HTMLAnchorElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  startButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTabId = tabs[0]?.id;
      if (activeTabId) {
        const message: TabMessage = { action: 'startSelection' };
        chrome.tabs.sendMessage(activeTabId, message, function (response) {
          // Check if content script responded
          if (chrome.runtime.lastError) {
            sendDebugToPage(
              `Popup: Runtime error - ${chrome.runtime.lastError.message}`,
              activeTabId,
            );
            showStatus(
              'Content script not ready. Please refresh the page and try again.',
              'error',
            );
            return;
          }

          sendDebugToPage(
            `Popup: Start selection response - ${JSON.stringify(response)}`,
            activeTabId,
          );
          if (response && response.success) {
            startButton.disabled = true;
            stopButton.disabled = false;
            showStatus(
              'Element selection started. Click on any element to capture it.',
              'success',
            );
          } else {
            showStatus('Failed to start element selection.', 'error');
            sendDebugToPage(
              `Popup: Failed response - ${JSON.stringify(response)}`,
              activeTabId,
            );
          }
        });
      }
    });
  });

  stopButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTabId = tabs[0]?.id;
      if (activeTabId) {
        const message: TabMessage = { action: 'stopSelection' };
        chrome.tabs.sendMessage(activeTabId, message, function (response) {
          if (chrome.runtime.lastError) {
            sendDebugToPage(
              `Popup: Runtime error on stop - ${chrome.runtime.lastError.message}`,
              activeTabId,
            );
            // Content script might not be available, just reset UI
            startButton.disabled = false;
            stopButton.disabled = true;
            showStatus(
              'Selection stopped (content script not available).',
              'success',
            );
            return;
          }

          sendDebugToPage(
            `Popup: Stop selection response - ${JSON.stringify(response)}`,
            activeTabId,
          );
          if (response && response.success) {
            startButton.disabled = false;
            stopButton.disabled = true;
            showStatus('Element selection stopped.', 'success');
          }
        });
      }
    });
  });

  settingsLink.addEventListener('click', function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  helpLink.addEventListener('click', function (e) {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/ianhomer/markdown-capture',
    });
  });

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
      startButton.disabled = false;
      stopButton.disabled = true;
      showStatus('Element captured and saved successfully!', 'success');
    } else if (message.action === 'captureError') {
      showStatus(
        'Error saving captured element: ' + (message.error || 'Unknown error'),
        'error',
      );
    }
  });
});
