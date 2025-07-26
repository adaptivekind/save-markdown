interface CaptureOptions {
  includeStyles: boolean;
  includeClasses: boolean;
  includeAttributes: boolean;
  prettifyMarkdown: boolean;
}

interface CaptureHistoryItem {
  timestamp: Date;
  element: string;
  selector: string;
  success: boolean;
  filename?: string;
}

class DevToolsPanel {
  private captureHistory: CaptureHistoryItem[] = [];
  private statusElement: HTMLElement;

  constructor() {
    this.statusElement = document.getElementById('status') as HTMLElement;
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.loadCaptureHistory();
    this.updateElementInfo();

    // Listen for messages from the main devtools script
    window.addEventListener('message', event => {
      if (event.data.type === 'PANEL_SHOWN') {
        this.onPanelShown();
      }
    });
  }

  private setupEventListeners(): void {
    const captureSelected = document.getElementById('captureSelected');
    const captureWithChildren = document.getElementById('captureWithChildren');
    const previewMarkdown = document.getElementById('previewMarkdown');
    const refreshPanel = document.getElementById('refreshPanel');
    const clearHistory = document.getElementById('clearHistory');

    captureSelected?.addEventListener('click', () =>
      this.captureSelectedElement(),
    );
    captureWithChildren?.addEventListener('click', () =>
      this.captureWithChildren(),
    );
    previewMarkdown?.addEventListener('click', () => this.previewMarkdown());
    refreshPanel?.addEventListener('click', () => this.refreshPanel());
    clearHistory?.addEventListener('click', () => this.clearCaptureHistory());

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'C':
            e.preventDefault();
            this.captureSelectedElement();
            break;
          case 'V':
            e.preventDefault();
            this.previewMarkdown();
            break;
          case 'R':
            e.preventDefault();
            this.refreshPanel();
            break;
        }
      }
    });
  }

  private onPanelShown(): void {
    this.showStatus('DevTools panel activated', 'success');
    this.updateElementInfo();
  }

  private getCaptureOptions(): CaptureOptions {
    return {
      includeStyles: (
        document.getElementById('includeStyles') as HTMLInputElement
      ).checked,
      includeClasses: (
        document.getElementById('includeClasses') as HTMLInputElement
      ).checked,
      includeAttributes: (
        document.getElementById('includeAttributes') as HTMLInputElement
      ).checked,
      prettifyMarkdown: (
        document.getElementById('prettifyMarkdown') as HTMLInputElement
      ).checked,
    };
  }

  private captureSelectedElement(): void {
    this.showStatus('Capturing selected element...', 'info');

    chrome.devtools.inspectedWindow.eval(
      `
      (function() {
        const selected = $0;
        if (!selected) return { error: 'No element selected' };
        
        return {
          outerHTML: selected.outerHTML,
          tagName: selected.tagName,
          className: selected.className,
          id: selected.id,
          selector: selected.tagName.toLowerCase() + 
                   (selected.id ? '#' + selected.id : '') + 
                   (selected.className ? '.' + selected.className.split(' ').join('.') : '')
        };
      })();
      `,
      (result, isException) => {
        if (isException || !result || result.error) {
          this.showStatus(
            result?.error || 'Failed to capture element',
            'error',
          );
          return;
        }

        this.processCapture(result, false);
      },
    );
  }

  private captureWithChildren(): void {
    this.showStatus('Capturing element with children...', 'info');

    chrome.devtools.inspectedWindow.eval(
      `
      (function() {
        const selected = $0;
        if (!selected) return { error: 'No element selected' };
        
        return {
          outerHTML: selected.outerHTML,
          tagName: selected.tagName,
          className: selected.className,
          id: selected.id,
          selector: selected.tagName.toLowerCase() + 
                   (selected.id ? '#' + selected.id : '') + 
                   (selected.className ? '.' + selected.className.split(' ').join('.') : ''),
          withChildren: true
        };
      })();
      `,
      (result, isException) => {
        if (isException || !result || result.error) {
          this.showStatus(
            result?.error || 'Failed to capture element',
            'error',
          );
          return;
        }

        this.processCapture(result, true);
      },
    );
  }

  private processCapture(elementData: any, withChildren: boolean): void {
    const options = this.getCaptureOptions();

    // Send message to content script to process the capture
    chrome.devtools.inspectedWindow.eval(
      `
      window.postMessage({
        type: 'DEVTOOLS_CAPTURE',
        data: ${JSON.stringify(elementData)},
        options: ${JSON.stringify(options)},
        withChildren: ${withChildren}
      }, '*');
      `,
      () => {
        const historyItem: CaptureHistoryItem = {
          timestamp: new Date(),
          element: `${elementData.tagName}${elementData.id ? '#' + elementData.id : ''}${elementData.className ? '.' + elementData.className.split(' ').join('.') : ''}`,
          selector: elementData.selector,
          success: true,
        };

        this.addToCaptureHistory(historyItem);
        this.showStatus('Element captured successfully!', 'success');
      },
    );
  }

  private previewMarkdown(): void {
    chrome.devtools.inspectedWindow.eval(
      `
      (function() {
        const selected = $0;
        if (!selected) return { error: 'No element selected' };
        
        // Simple HTML to Markdown conversion for preview
        function htmlToMarkdown(element) {
          const tag = element.tagName.toLowerCase();
          const text = element.textContent || '';
          
          switch (tag) {
            case 'h1': return '# ' + text;
            case 'h2': return '## ' + text;
            case 'h3': return '### ' + text;
            case 'h4': return '#### ' + text;
            case 'h5': return '##### ' + text;
            case 'h6': return '###### ' + text;
            case 'p': return text + '\\n\\n';
            case 'strong': case 'b': return '**' + text + '**';
            case 'em': case 'i': return '*' + text + '*';
            case 'code': return '\`' + text + '\`';
            case 'a': return '[' + text + '](' + element.href + ')';
            default: return text;
          }
        }
        
        return {
          preview: htmlToMarkdown(selected),
          html: selected.outerHTML.substring(0, 500) + '...'
        };
      })();
      `,
      (result, isException) => {
        if (isException || !result || result.error) {
          this.showStatus('Failed to generate preview', 'error');
          return;
        }

        this.showMarkdownPreview(result.preview, result.html);
      },
    );
  }

  private showMarkdownPreview(markdown: string, html: string): void {
    const preview = `
**Markdown Preview:**
\`\`\`markdown
${markdown}
\`\`\`

**Original HTML (truncated):**
\`\`\`html
${html}
\`\`\`
    `;

    const elementInfo = document.getElementById('elementInfo');
    if (elementInfo) {
      elementInfo.innerHTML = `<pre>${preview}</pre>`;
    }

    this.showStatus('Markdown preview generated', 'success');
  }

  private updateElementInfo(): void {
    chrome.devtools.inspectedWindow.eval(
      `
      (function() {
        const selected = $0;
        if (!selected) return null;
        
        return {
          tagName: selected.tagName,
          className: selected.className,
          id: selected.id,
          textContent: selected.textContent ? selected.textContent.substring(0, 200) + '...' : '',
          attributes: Array.from(selected.attributes).map(attr => ({
            name: attr.name,
            value: attr.value.substring(0, 50) + (attr.value.length > 50 ? '...' : '')
          })),
          childElementCount: selected.childElementCount
        };
      })();
      `,
      (result, isException) => {
        const elementInfo = document.getElementById('elementInfo');
        if (!elementInfo) return;

        if (isException || !result) {
          elementInfo.textContent =
            'Select an element in the Elements panel to see details here.';
          return;
        }

        const info = `
Element: <${result.tagName.toLowerCase()}>
ID: ${result.id || 'none'}
Classes: ${result.className || 'none'}
Children: ${result.childElementCount}
Text: ${result.textContent || 'none'}

Attributes:
${result.attributes.map((attr: any) => `  ${attr.name}="${attr.value}"`).join('\n')}
        `;

        elementInfo.textContent = info;
      },
    );
  }

  private refreshPanel(): void {
    this.updateElementInfo();
    this.showStatus('Panel refreshed', 'info');
  }

  private addToCaptureHistory(item: CaptureHistoryItem): void {
    this.captureHistory.unshift(item);
    if (this.captureHistory.length > 10) {
      this.captureHistory = this.captureHistory.slice(0, 10);
    }
    this.updateCaptureHistoryDisplay();
    this.saveCaptureHistory();
  }

  private updateCaptureHistoryDisplay(): void {
    const historyElement = document.getElementById('captureHistory');
    if (!historyElement) return;

    if (this.captureHistory.length === 0) {
      historyElement.innerHTML =
        '<div class="capture-item">No captures yet. Start by selecting an element and clicking "Capture Selected Element".</div>';
      return;
    }

    historyElement.innerHTML = this.captureHistory
      .map(
        item => `
        <div class="capture-item">
          <strong>${item.element}</strong><br />
          <small>${item.timestamp.toLocaleTimeString()} - ${item.success ? 'Success' : 'Failed'}</small>
        </div>
      `,
      )
      .join('');
  }

  private clearCaptureHistory(): void {
    this.captureHistory = [];
    this.updateCaptureHistoryDisplay();
    this.saveCaptureHistory();
    this.showStatus('Capture history cleared', 'info');
  }

  private loadCaptureHistory(): void {
    const stored = localStorage.getItem('markdownCaptureHistory');
    if (stored) {
      try {
        this.captureHistory = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        this.updateCaptureHistoryDisplay();
      } catch (error) {
        console.error('Failed to load capture history:', error);
      }
    }
  }

  private saveCaptureHistory(): void {
    try {
      localStorage.setItem(
        'markdownCaptureHistory',
        JSON.stringify(this.captureHistory),
      );
    } catch (error) {
      console.error('Failed to save capture history:', error);
    }
  }

  private showStatus(
    message: string,
    type: 'success' | 'error' | 'info',
  ): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
    this.statusElement.style.display = 'block';

    setTimeout(() => {
      this.statusElement.style.display = 'none';
    }, 3000);
  }
}

// Initialize panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DevToolsPanel();
});
