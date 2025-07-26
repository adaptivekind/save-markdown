let isSelectionActive = false;
let overlay: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;

interface TabMessage {
  action: 'startSelection' | 'stopSelection';
}

interface SaveMarkdownMessage {
  action: 'saveMarkdown';
  content: string;
  url: string;
  title: string;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (
    request: TabMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    console.log('onMessage content.ts', request);
    if (request.action === 'startSelection') {
      startElementSelection();
      sendResponse({ success: true });
    } else if (request.action === 'stopSelection') {
      stopElementSelection();
      sendResponse({ success: true });
    }
  },
);

function startElementSelection(): void {
  if (isSelectionActive) return;
  console.log('Starting Element Selection');

  isSelectionActive = true;
  document.body.style.cursor = 'crosshair';

  // Create overlay
  overlay = document.createElement('div');
  overlay.id = 'markdown-capture-overlay';
  overlay.style.cssText = `
    position: absolute;
    border: 2px dashed #007cba;
    background: rgba(0, 124, 186, 0.1);
    pointer-events: none;
    z-index: 10000;
    display: none;
  `;
  document.body.appendChild(overlay);

  // Add event listeners
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
}

function stopElementSelection(): void {
  if (!isSelectionActive) return;

  isSelectionActive = false;
  document.body.style.cursor = '';

  // Remove overlay
  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);
}

function handleMouseOver(e: MouseEvent): void {
  if (!isSelectionActive || !overlay) return;

  const element = e.target as HTMLElement;
  if (element === overlay) return;

  const rect = element.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}

function handleMouseOut(): void {
  if (!isSelectionActive || !overlay) return;
  overlay.style.display = 'none';
}

function handleClick(e: MouseEvent): void {
  if (!isSelectionActive) return;
  console.log('Handling Click');

  e.preventDefault();
  e.stopPropagation();

  selectedElement = e.target as HTMLElement;
  captureElement(selectedElement);
  stopElementSelection();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    stopElementSelection();
  }
}

function captureElement(element: HTMLElement): void {
  // Convert element to markdown
  const markdown = htmlToMarkdown(element);
  console.log('markdown', markdown);

  // Send to background script for saving
  const message: SaveMarkdownMessage = {
    action: 'saveMarkdown',
    content: markdown,
    url: window.location.href,
    title: document.title,
  };
  chrome.runtime.sendMessage(message);
}

function htmlToMarkdown(element: HTMLElement): string {
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
