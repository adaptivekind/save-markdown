/**
 * HTML to Markdown conversion utilities
 */

export interface CaptureMetadata {
  url: string;
  title: string;
  date?: Date;
}

/**
 * Converts an HTML element and its children to Markdown format
 */
export function htmlToMarkdown(element: HTMLElement): string {
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const elementNode = node as HTMLElement;
    const tagName = elementNode.tagName.toLowerCase();
    const children = Array.from(elementNode.childNodes)
      .map(processNode)
      .join('');

    switch (tagName) {
      case 'h1':
        return `# ${children}\n\n`;
      case 'h2':
        return `## ${children}\n\n`;
      case 'h3':
        return `### ${children}\n\n`;
      case 'h4':
        return `#### ${children}\n\n`;
      case 'h5':
        return `##### ${children}\n\n`;
      case 'h6':
        return `###### ${children}\n\n`;
      case 'p':
        return `${children}\n\n`;
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'code':
        return `\`${children}\``;
      case 'pre':
        return `\`\`\`\n${children}\n\`\`\`\n\n`;
      case 'a': {
        const href = elementNode.getAttribute('href');
        return href ? `[${children}](${href})` : children;
      }
      case 'img': {
        const src = elementNode.getAttribute('src');
        const alt = elementNode.getAttribute('alt') || '';
        return src ? `![${alt}](${src})` : '';
      }
      case 'ul':
        return `${children}\n`;
      case 'ol':
        return `${children}\n`;
      case 'li': {
        const parent = elementNode.parentElement;
        const isOrdered = parent && parent.tagName.toLowerCase() === 'ol';
        const prefix = isOrdered ? '1. ' : '- ';
        return `${prefix}${children}\n`;
      }
      case 'blockquote':
        return `> ${children}\n\n`;
      case 'br':
        return '\n';
      case 'hr':
        return '---\n\n';
      case 'table':
        return processTable(elementNode as HTMLTableElement);
      default:
        return children;
    }
  }

  function processTable(table: HTMLTableElement): string {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';

    let markdown = '';
    let isFirstRow = true;

    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      const rowContent = Array.from(cells)
        .map(cell => processNode(cell).trim())
        .join(' | ');
      markdown += `| ${rowContent} |\n`;

      if (isFirstRow) {
        const separator = Array.from(cells)
          .map(() => '---')
          .join(' | ');
        markdown += `| ${separator} |\n`;
        isFirstRow = false;
      }
    });

    return markdown + '\n';
  }

  return processNode(element);
}

/**
 * Wraps markdown content with metadata header and footer
 */
export function wrapWithMetadata(
  content: string,
  metadata: CaptureMetadata,
): string {
  const captureDate = metadata.date || new Date();
  const dateString = captureDate.toISOString();

  return `<!-- Captured from: ${metadata.url} -->
<!-- Date: ${dateString} -->
<!-- Title: ${metadata.title} -->

# ${metadata.title}

${content}

---
*Captured with Markdown Capture extension*`;
}
