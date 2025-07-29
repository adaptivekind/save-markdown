/**
 * Module for saving markdown content to files via Chrome Downloads API
 */

import { sendDebugMessage } from './debugPage';
import { generateFilename, generateDownloadPath } from './filename';
import { wrapWithMetadata } from './htmlToMarkdown';
import { notify } from './notify';

interface Config {
  saveDirectory?: string;
  filenameTemplate?: string;
  useDomainSubfolder?: boolean;
  showStatusWindow?: boolean;
}

/**
 * Saves markdown content to a file using Chrome Downloads API
 */
export async function saveMarkdownFile(
  content: string,
  url: string,
  title: string,
  tabId: number,
): Promise<void> {
  try {
    // Get configuration
    const config = (await chrome.storage.sync.get([
      'saveDirectory',
      'filenameTemplate',
      'useDomainSubfolder',
      'showStatusWindow',
    ])) as Config;
    const directory = config.saveDirectory || '~/Downloads';
    const template = config.filenameTemplate || '{title}_{timestamp}.md';
    const useDomainSubfolder = config.useDomainSubfolder !== false;

    // Generate filename with directory path
    const baseFilename = generateFilename({
      template,
      title,
      url,
      maxTitleLength: 50,
    });

    const filename = generateDownloadPath(
      directory,
      baseFilename,
      url,
      useDomainSubfolder,
    );

    // Add metadata to content
    const fullContent = wrapWithMetadata(content, {
      url,
      title,
    });

    // Create data URL for download (works in service workers)
    const dataUrl =
      'data:text/markdown;charset=utf-8,' + encodeURIComponent(fullContent);

    sendDebugMessage(tabId, undefined, `Calling download for ${filename}`);

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'overwrite',
      },
      async downloadId => {
        if (chrome.runtime.lastError) {
          notify(tabId, 'captureError', chrome.runtime.lastError.message);
        } else if (downloadId) {
          // Query the download item to get the absolute file path
          sendDebugMessage(
            tabId,
            'captureComplete',
            `Download ID : ${downloadId}`,
          );

          // Send fileSaved message to content script with downloadId and relative filename
          chrome.tabs
            .sendMessage(tabId, {
              action: 'fileSaved',
              downloadId: downloadId,
              relativeFilename: filename,
            })
            .catch(() => {
              // Content script might not be ready, ignore error
            });

          // Also send legacy notification for backward compatibility
          notify(tabId, 'captureComplete', null, filename);
        } else {
          // Send fileSaved message to content script without downloadId (fallback case)
          chrome.tabs
            .sendMessage(tabId, {
              action: 'fileSaved',
              relativeFilename: filename,
            })
            .catch(() => {
              // Content script might not be ready, ignore error
            });

          // Also send legacy notification for backward compatibility
          notify(tabId, 'captureComplete', null, filename);
        }
      },
    );
  } catch (error) {
    notify(tabId, 'captureError', (error as Error).message);
  }
}
