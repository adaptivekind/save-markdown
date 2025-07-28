/**
 * Module for saving markdown content to files via Chrome Downloads API
 */

import { generateFilename, generateDownloadPath } from './filename';
import { wrapWithMetadata } from './htmlToMarkdown';
import { notify } from './notify';

interface Config {
  saveDirectory?: string;
  filenameTemplate?: string;
  useDomainSubfolder?: boolean;
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

    // Extract domain for subfolder if enabled
    const domainSubfolder = useDomainSubfolder
      ? new URL(url).hostname.replace('www.', '').replace(/\./g, '-')
      : undefined;

    const filename = generateDownloadPath(
      directory,
      baseFilename,
      domainSubfolder,
    );

    // Add metadata to content
    const fullContent = wrapWithMetadata(content, {
      url,
      title,
    });

    // Create data URL for download (works in service workers)
    const dataUrl =
      'data:text/markdown;charset=utf-8,' + encodeURIComponent(fullContent);

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'overwrite',
      },
      () => {
        if (chrome.runtime.lastError) {
          notify(tabId, 'captureError', chrome.runtime.lastError.message);
        } else {
          notify(tabId, 'captureComplete', null, filename);
        }
      },
    );
  } catch (error) {
    notify(tabId, 'captureError', (error as Error).message);
  }
}
