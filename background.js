console.log("Loading background.js");

// Create context menu when extension starts
chrome.runtime.onInstalled.addListener(() => {
  console.log("Creating context menu...");
  chrome.contextMenus.create({
    id: "markdown-capture-start",
    title: "Start Markdown Selection", 
    contexts: ["page"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Context menu creation failed:", chrome.runtime.lastError);
    } else {
      console.log("Context menu created successfully");
    }
  });
});

// Also create context menu on startup (not just install)
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension startup - ensuring context menu exists");
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "markdown-capture-start",
      title: "Start Markdown Selection", 
      contexts: ["page"]
    });
  });
});

// Create context menu immediately when background script loads
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: "markdown-capture-start",
    title: "Start Markdown Selection", 
    contexts: ["page"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Context menu creation failed:", chrome.runtime.lastError);
    } else {
      console.log("Context menu created on script load");
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked:", info.menuItemId);
  if (info.menuItemId === "markdown-capture-start") {
    console.log("Starting selection from context menu");
    chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
  }
});

// Background script for handling file saving
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  if (message.action === "saveMarkdown") {
    saveMarkdownFile(
      message.content,
      message.url,
      message.title,
      sender.tab.id,
    );
    sendResponse({ success: true });
    return true; // Keep message channel open for async response
  }
});

async function saveMarkdownFile(content, url, title, tabId) {
  console.log("Saving markdown", url);
  try {
    // Get configuration
    const config = await chrome.storage.sync.get([
      "saveDirectory",
      "filenameTemplate",
    ]);
    const directory = config.saveDirectory || "~/Downloads";
    const template = config.filenameTemplate || "{title}_{timestamp}.md";

    // Generate filename with directory path
    const baseFilename = generateFilename(template, title, url);
    const filename = generateFullPath(directory, baseFilename);

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
      "data:text/markdown;charset=utf-8," + encodeURIComponent(fullContent);

    console.log("Saving markdown to ", filename);
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError);
          notifyCapture(
            tabId,
            "captureError",
            chrome.runtime.lastError.message,
          );
        } else {
          console.log("Download started with ID:", downloadId);
          notifyCapture(tabId, "captureComplete");
        }
      },
    );
  } catch (error) {
    console.error("Error saving markdown:", error);
    notifyCapture(tabId, "captureError", error.message);
  }
}

function generateFilename(template, title, url) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const cleanTitle = title
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
  const domain = new URL(url).hostname.replace("www.", "");

  return template
    .replace("{title}", cleanTitle)
    .replace("{timestamp}", timestamp)
    .replace("{domain}", domain)
    .replace("{date}", new Date().toISOString().split("T")[0]);
}

function generateFullPath(directory, filename) {
  // Chrome downloads API has limitations with custom paths
  // We can only suggest a relative path from the default download directory
  if (directory === "~/Downloads" || directory === "") {
    return filename;
  }

  // Convert directory path to relative path format
  let relativePath = directory
    .replace(/^~\/Downloads\//, "") // Remove ~/Downloads/ prefix
    .replace(/^~\//, "") // Remove ~/ prefix
    .replace(/\/$/, ""); // Remove trailing slash

  // Ensure the path is safe (no .. or absolute paths)
  relativePath = relativePath.replace(/\.\./g, "").replace(/^\//, "");

  return relativePath ? `${relativePath}/${filename}` : filename;
}

function notifyCapture(tabId, action, error = null) {
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
