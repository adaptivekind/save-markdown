interface Config {
  saveDirectory?: string;
  filenameTemplate?: string;
}

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
  const saveConfigButton = document.getElementById(
    'saveConfig',
  ) as HTMLButtonElement;
  const saveDirectoryInput = document.getElementById(
    'saveDirectory',
  ) as HTMLInputElement;
  const filenameTemplateInput = document.getElementById(
    'filenameTemplate',
  ) as HTMLInputElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load saved configuration
  loadConfiguration();

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

  saveConfigButton.addEventListener('click', function () {
    const config: Config = {
      saveDirectory: saveDirectoryInput.value || '~/Downloads',
      filenameTemplate: filenameTemplateInput.value || '{title}_{timestamp}.md',
    };

    chrome.storage.sync.set(config, function () {
      showStatus('Configuration saved successfully!', 'success');
    });
  });

  function loadConfiguration(): void {
    chrome.storage.sync.get(
      ['saveDirectory', 'filenameTemplate'],
      function (result: Config) {
        saveDirectoryInput.value = result.saveDirectory || '~/Downloads';
        filenameTemplateInput.value =
          result.filenameTemplate || '{title}_{timestamp}.md';
      },
    );
  }

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
