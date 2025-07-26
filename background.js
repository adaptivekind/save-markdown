// Background script for handling file saving
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveMarkdown') {
    saveMarkdownFile(message.content, message.url, message.title, sender.tab.id);
  }
});

async function saveMarkdownFile(content, url, title, tabId) {
  try {
    // Get configuration
    const config = await chrome.storage.sync.get(['saveDirectory', 'filenameTemplate']);
    const directory = config.saveDirectory || '~/Downloads';
    const template = config.filenameTemplate || '{title}_{timestamp}.md';
    
    // Generate filename
    const filename = generateFilename(template, title, url);
    
    // Add metadata to content
    const fullContent = `<!-- Captured from: ${url} -->
<!-- Date: ${new Date().toISOString()} -->
<!-- Title: ${title} -->

# ${title}

${content}

---
*Captured with Markdown Capture extension*`;
    
    // Create blob and download
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const downloadUrl = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: downloadUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        notifyCapture(tabId, 'captureError', chrome.runtime.lastError.message);
      } else {
        console.log('Download started with ID:', downloadId);
        notifyCapture(tabId, 'captureComplete');
      }
      
      // Clean up the blob URL
      URL.revokeObjectURL(downloadUrl);
    });
    
  } catch (error) {
    console.error('Error saving markdown:', error);
    notifyCapture(tabId, 'captureError', error.message);
  }
}

function generateFilename(template, title, url) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const cleanTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
  const domain = new URL(url).hostname.replace('www.', '');
  
  return template
    .replace('{title}', cleanTitle)
    .replace('{timestamp}', timestamp)
    .replace('{domain}', domain)
    .replace('{date}', new Date().toISOString().split('T')[0]);
}

function notifyCapture(tabId, action, error = null) {
  chrome.tabs.sendMessage(tabId, {
    action: action,
    error: error
  });
  
  // Also notify popup if it's open
  chrome.runtime.sendMessage({
    action: action,
    error: error
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}