let isSelectionActive = false;
let overlay = null;
let selectedElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSelection') {
    startElementSelection();
    sendResponse({ success: true });
  } else if (request.action === 'stopSelection') {
    stopElementSelection();
    sendResponse({ success: true });
  }
});

function startElementSelection() {
  if (isSelectionActive) return;
  
  isSelectionActive = true;
  document.body.style.cursor = 'crosshair';
  
  // Create overlay
  overlay = document.createElement('div');
  overlay.id = 'markdown-capture-overlay';
  overlay.style.cssText = `
    position: absolute;
    border: 2px solid #007cba;
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

function stopElementSelection() {
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

function handleMouseOver(e) {
  if (!isSelectionActive) return;
  
  const element = e.target;
  if (element === overlay) return;
  
  const rect = element.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.left = (rect.left + window.scrollX) + 'px';
  overlay.style.top = (rect.top + window.scrollY) + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}

function handleMouseOut(e) {
  if (!isSelectionActive) return;
  overlay.style.display = 'none';
}

function handleClick(e) {
  if (!isSelectionActive) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  selectedElement = e.target;
  captureElement(selectedElement);
  stopElementSelection();
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    stopElementSelection();
  }
}

function captureElement(element) {
  // Convert element to markdown
  const markdown = htmlToMarkdown(element);
  
  // Send to background script for saving
  chrome.runtime.sendMessage({
    action: 'saveMarkdown',
    content: markdown,
    url: window.location.href,
    title: document.title
  });
}

function htmlToMarkdown(element) {
  let markdown = '';
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim();
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const tagName = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(processNode).join('');
    
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
      case 'a':
        const href = node.getAttribute('href');
        return href ? `[${children}](${href})` : children;
      case 'img':
        const src = node.getAttribute('src');
        const alt = node.getAttribute('alt') || '';
        return src ? `![${alt}](${src})` : '';
      case 'ul':
        return `${children}\n`;
      case 'ol':
        return `${children}\n`;
      case 'li':
        const parent = node.parentElement;
        const isOrdered = parent && parent.tagName.toLowerCase() === 'ol';
        const prefix = isOrdered ? '1. ' : '- ';
        return `${prefix}${children}\n`;
      case 'blockquote':
        return `> ${children}\n\n`;
      case 'br':
        return '\n';
      case 'hr':
        return '---\n\n';
      case 'table':
        return processTable(node);
      default:
        return children;
    }
  }
  
  function processTable(table) {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';
    
    let markdown = '';
    let isFirstRow = true;
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      const rowContent = Array.from(cells).map(cell => processNode(cell).trim()).join(' | ');
      markdown += `| ${rowContent} |\n`;
      
      if (isFirstRow) {
        const separator = Array.from(cells).map(() => '---').join(' | ');
        markdown += `| ${separator} |\n`;
        isFirstRow = false;
      }
    });
    
    return markdown + '\n';
  }
  
  return processNode(element);
}