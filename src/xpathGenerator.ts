/**
 * XPath generation utilities for HTML elements
 */

/**
 * Generates an XPath expression for the given HTML element
 * Prioritizes ID-based selectors and falls back to position-based paths
 */
export function generateXPath(element: HTMLElement): string {
  // Use ID if available for the most reliable selector
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: HTMLElement | null = element;

  // Traverse up the DOM tree to build the XPath
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    // Include class attribute if present for more specificity
    if (current.className) {
      selector += `[@class="${current.className}"]`;
    }

    // Calculate position among siblings of the same tag
    let siblingIndex = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        siblingIndex++;
      }
      sibling = sibling.previousElementSibling;
    }

    // Add position index if there are multiple siblings of the same tag
    const totalSiblings =
      current.parentElement?.querySelectorAll(current.tagName.toLowerCase())
        .length || 1;
    if (totalSiblings > 1) {
      selector += `[${siblingIndex}]`;
    }

    // Add to the beginning of the path parts
    parts.unshift(selector);
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

/**
 * Validates an XPath expression by attempting to use it in a query
 */
export function validateXPath(xpath: string): boolean {
  try {
    document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets an element using an XPath expression
 */
export function getElementByXPath(xpath: string): HTMLElement | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    return result.singleNodeValue as HTMLElement | null;
  } catch {
    return null;
  }
}

/**
 * Generates multiple XPath variations for an element (for fallback purposes)
 */
export function generateXPathVariations(element: HTMLElement): string[] {
  const variations: string[] = [];

  // Primary XPath (what generateXPath returns)
  variations.push(generateXPath(element));

  // ID-based if available
  if (element.id) {
    variations.push(`//*[@id="${element.id}"]`);
  }

  // Tag and text content if it's a text element
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length < 50) {
    variations.push(
      `//${element.tagName.toLowerCase()}[contains(text(), "${textContent}")]`,
    );
  }

  // Class-based if available
  if (element.className) {
    const classes = element.className
      .trim()
      .split(/\s+/)
      .map(cls => `contains(@class, "${cls}")`)
      .join(' and ');
    variations.push(`//${element.tagName.toLowerCase()}[${classes}]`);
  }

  // Remove duplicates
  return [...new Set(variations)];
}
