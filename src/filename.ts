/**
 * Utilities for generating filenames for captured markdown content
 */

export interface FilenameVariables {
  title: string;
  timestamp: string;
  domain: string;
  date: string;
}

export interface FilenameOptions {
  template: string;
  title: string;
  url: string;
  maxTitleLength?: number;
}

/**
 * Generates filename variables from page metadata
 */
export function createFilenameVariables(
  title: string,
  url: string,
): FilenameVariables {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const dateString = now.toISOString().split('T')[0]!;
  const cleanTitle = sanitizeTitle(title);
  const domain = extractDomain(url);

  return {
    title: cleanTitle,
    timestamp,
    domain,
    date: dateString,
  };
}

/**
 * Generates a filename from a template and variables
 */
export function generateFilename(options: FilenameOptions): string {
  const { template, title, url, maxTitleLength = 50 } = options;

  const variables = createFilenameVariables(title, url);

  // Truncate title if too long
  const truncatedTitle = variables.title.substring(0, maxTitleLength);

  return template
    .replace(/\{title\}/g, truncatedTitle)
    .replace(/\{timestamp\}/g, variables.timestamp)
    .replace(/\{domain\}/g, variables.domain)
    .replace(/\{date\}/g, variables.date);
}

/**
 * Generates the full file path for Chrome downloads API
 */
export function generateDownloadPath(
  directory: string,
  filename: string,
): string {
  // Chrome downloads API has limitations with custom paths
  // We can only suggest a relative path from the default download directory
  if (directory === '~/Downloads' || directory === '') {
    return filename;
  }

  // Convert directory path to relative path format
  let relativePath = directory
    .replace(/^~\/Downloads\//, '') // Remove ~/Downloads/ prefix
    .replace(/^~\//, '') // Remove ~/ prefix
    .replace(/\/$/, ''); // Remove trailing slash

  // Ensure the path is safe (no .. or absolute paths)
  relativePath = sanitizePath(relativePath);

  return relativePath ? `${relativePath}/${filename}` : filename;
}

/**
 * Sanitizes a title for use in filenames using kebab-case
 */
function sanitizeTitle(title: string): string {
  return title
    .toLowerCase() // Convert to lowercase
    .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .trim();
}

/**
 * Extracts domain from URL, removing www prefix and replacing dots with hyphens
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').replace(/\./g, '-');
  } catch {
    return 'unknown-domain';
  }
}

/**
 * Sanitizes a file path to prevent directory traversal
 */
function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove .. patterns
    .replace(/^\//, '') // Remove leading slash
    .trim();
}
