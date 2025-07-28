/**
 * Domain utilities module for URL processing
 */

/**
 * Extracts domain from URL, removing www prefix
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown-domain';
  }
}
