interface TabMessage {
  action: 'startSelection' | 'stopSelection';
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
      const activeTab = tabs[0];
      if (activeTab?.id) {
        const message: TabMessage = { action: 'startSelection' };
        chrome.tabs.sendMessage(activeTab.id, message, function (response) {
          if (response && response.success) {
            startButton.disabled = true;
            stopButton.disabled = false;
            showStatus(
              'Element selection started. Click on any element to capture it.',
              'success',
            );
          } else {
            showStatus('Failed to start element selection.', 'error');
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

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
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
