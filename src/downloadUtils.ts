/**
 * Utilities for Chrome Downloads API operations
 */

/**
 * Retrieves the absolute file path for a download using retry mechanism
 */
export async function getDownloadPath(downloadId: number): Promise<string> {
  return new Promise(resolve => {
    const tryGetDownloadPath = (attempt: number = 1) => {
      chrome.downloads.search({ id: downloadId }, items => {
        const filename = items.shift()?.filename;
        if (filename) {
          resolve(filename);
        } else if (attempt < 10) {
          setTimeout(() => tryGetDownloadPath(attempt + 1), attempt * 100);
        } else {
          resolve(filename || '');
        }
      });
    };

    // Start the retry process with initial delay
    setTimeout(() => tryGetDownloadPath(), 100);
  });
}
