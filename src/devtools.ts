// DevTools extension entry point
// This script runs when the DevTools panel is opened

class MarkdownCaptureDevTools {
  private panelWindow: Window | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Create a panel in the DevTools
    chrome.devtools.panels.create(
      'Markdown Capture',
      'icons/icon16.png',
      'devtools-panel.html',
      panel => {
        // Panel created successfully
        console.log('Markdown Capture DevTools panel created');

        // Listen for panel show/hide events
        panel.onShown.addListener(panelWindow => {
          this.panelWindow = panelWindow;
          this.onPanelShown(panelWindow);
        });

        panel.onHidden.addListener(() => {
          this.onPanelHidden();
        });
      },
    );

    // Add context menu items to Elements panel
    chrome.devtools.panels.elements.createSidebarPane(
      'Markdown Capture',
      sidebar => {
        // Update sidebar when element selection changes
        chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
          this.updateElementsSidebar(sidebar);
        });

        // Initial update
        this.updateElementsSidebar(sidebar);
      },
    );
  }

  private onPanelShown(panelWindow: Window): void {
    console.log('Markdown Capture panel shown');

    // Send message to panel to initialize
    if (panelWindow && panelWindow.postMessage) {
      panelWindow.postMessage({ type: 'PANEL_SHOWN' }, '*');
    }
  }

  private onPanelHidden(): void {
    console.log('Markdown Capture panel hidden');
    this.panelWindow = null;
  }

  private updateElementsSidebar(
    sidebar: chrome.devtools.panels.ElementsPanel.ExtensionSidebarPane,
  ): void {
    // Get the currently selected element in DevTools
    chrome.devtools.inspectedWindow.eval(
      `
      (function() {
        const selected = $0; // DevTools selected element
        if (!selected) return null;
        
        return {
          tagName: selected.tagName,
          className: selected.className,
          id: selected.id,
          textContent: selected.textContent ? selected.textContent.substring(0, 100) + '...' : '',
          innerHTML: selected.innerHTML ? selected.innerHTML.substring(0, 200) + '...' : '',
          attributes: Array.from(selected.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          }))
        };
      })();
      `,
      (result, isException) => {
        if (isException || !result) {
          sidebar.setObject({
            error: 'No element selected or error occurred',
            instruction:
              'Select an element in the Elements panel to see markdown capture options',
          });
          return;
        }

        // Display element information and capture options
        sidebar.setObject({
          element: result,
          actions: {
            'Capture Element': 'Click to capture this element as markdown',
            'Capture with Children':
              'Capture this element and all its children',
            'Preview Markdown':
              'Preview how this element would look as markdown',
          },
          tips: [
            'Use the main panel for advanced capture options',
            'Right-click elements for quick capture',
            'Check the extension popup for file settings',
          ],
        });
      },
    );
  }

  public captureSelectedElement(): void {
    chrome.devtools.inspectedWindow.eval(
      `
      (function() {
        const selected = $0;
        if (!selected) return { error: 'No element selected' };
        
        // Send message to content script to capture this element
        window.postMessage({
          type: 'DEVTOOLS_CAPTURE_ELEMENT',
          element: selected.outerHTML,
          selector: selected.tagName.toLowerCase() + 
                   (selected.id ? '#' + selected.id : '') + 
                   (selected.className ? '.' + selected.className.split(' ').join('.') : '')
        }, '*');
        
        return { success: true, message: 'Capture initiated' };
      })();
      `,
      (result, isException) => {
        if (isException || !result) {
          console.error('Failed to capture element:', result);
          return;
        }

        console.log('Element capture result:', result);
      },
    );
  }
}

// Initialize DevTools extension
new MarkdownCaptureDevTools();
