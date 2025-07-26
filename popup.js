document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('startSelection');
  const stopButton = document.getElementById('stopSelection');
  const saveConfigButton = document.getElementById('saveConfig');
  const saveDirectoryInput = document.getElementById('saveDirectory');
  const filenameTemplateInput = document.getElementById('filenameTemplate');
  const statusDiv = document.getElementById('status');
  
  // Load saved configuration
  loadConfiguration();
  
  startButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelection' }, function(response) {
        if (response && response.success) {
          startButton.disabled = true;
          stopButton.disabled = false;
          showStatus('Element selection started. Click on any element to capture it.', 'success');
        } else {
          showStatus('Failed to start element selection.', 'error');
        }
      });
    });
  });
  
  stopButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopSelection' }, function(response) {
        if (response && response.success) {
          startButton.disabled = false;
          stopButton.disabled = true;
          showStatus('Element selection stopped.', 'success');
        }
      });
    });
  });
  
  saveConfigButton.addEventListener('click', function() {
    const config = {
      saveDirectory: saveDirectoryInput.value || '~/Downloads',
      filenameTemplate: filenameTemplateInput.value || '{title}_{timestamp}.md'
    };
    
    chrome.storage.sync.set(config, function() {
      showStatus('Configuration saved successfully!', 'success');
    });
  });
  
  function loadConfiguration() {
    chrome.storage.sync.get(['saveDirectory', 'filenameTemplate'], function(result) {
      saveDirectoryInput.value = result.saveDirectory || '~/Downloads';
      filenameTemplateInput.value = result.filenameTemplate || '{title}_{timestamp}.md';
    });
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureComplete') {
      startButton.disabled = false;
      stopButton.disabled = true;
      showStatus('Element captured and saved successfully!', 'success');
    } else if (message.action === 'captureError') {
      showStatus('Error saving captured element: ' + message.error, 'error');
    }
  });
});