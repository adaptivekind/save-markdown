interface TabMessage {
  action: 'startSelection' | 'stopSelection';
}

interface RuntimeMessage {
  action: 'captureComplete' | 'captureError';
  error?: string;
}

interface ExtensionOptions {
  debugMode?: boolean;
}

let debugMode = true; // Default to true

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
  const debugDiv = document.getElementById('debug') as HTMLDivElement;

  // Load debug mode setting
  chrome.storage.sync.get(['debugMode'], (result: ExtensionOptions) => {
    debugMode = result.debugMode ?? true;
    if (debugMode) {
      showDebug('Debug mode enabled');
    }
  });

  startButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        const message: TabMessage = { action: 'startSelection' };
        chrome.tabs.sendMessage(activeTab.id, message, function (response) {
          showDebug(`Start selection response: ${JSON.stringify(response)}`);
          if (response && response.success) {
            startButton.disabled = true;
            stopButton.disabled = false;
            showStatus(
              'Element selection started. Click on any element to capture it.',
              'success',
            );
          } else {
            showStatus('Failed to start element selection.', 'error');
            showDebug(`Failed response: ${JSON.stringify(response)}`);
          }
        });
      }
    });
  });

  stopButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        const message: TabMessage = { action: 'stopSelection' };
        chrome.tabs.sendMessage(activeTab.id, message, function (response) {
          showDebug(`Stop selection response: ${JSON.stringify(response)}`);
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
      url: 'https://github.com/anthropics/claude-code/blob/main/README.md',
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

  function showDebug(message: string): void {
    if (!debugMode) return;

    const timestamp = new Date().toLocaleTimeString();
    const debugMessage = `[${timestamp}] ${message}\n`;

    debugDiv.textContent = debugMessage + (debugDiv.textContent || '');
    debugDiv.style.display = 'block';

    // Keep only last 10 lines
    const lines = debugDiv.textContent.split('\n');
    if (lines.length > 10) {
      debugDiv.textContent = lines.slice(0, 10).join('\n');
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
    showDebug(`Runtime message: ${JSON.stringify(message)}`);

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
