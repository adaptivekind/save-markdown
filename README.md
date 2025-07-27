# Markdown Capture

A Chrome extension that helps you select HTML elements on web pages and convert them to clean markdown files. This tool bridges the gap between web content and your local markdown workflow.

## Getting Started

The extension provides multiple ways to capture content depending on your needs. You can use the popup interface for quick captures, integrate with Chrome DevTools for precise selection, or use context menus for workflow efficiency.

## Core Capabilities

### Element Selection

The extension provides visual feedback when selecting elements. Hover over any element to see a blue overlay indicating the capture boundary. Click to capture the element, or press Escape to cancel selection.

### Markdown Conversion

We preserve the structure and formatting of HTML elements during conversion:

- Headers maintain their hierarchy (H1-H6)
- Text formatting (bold, italic, code, strikethrough) carries over
- Links and images convert with proper markdown syntax
- Lists preserve nesting and ordering
- Tables maintain headers and alignment
- Blockquotes and code blocks retain their structure
- Complex nested elements are handled recursively

### Configuration Options

The extension adapts to your workflow through several configuration options:

- Save directory selection (within Chrome's download restrictions)
- Filename templates using variables like `{title}`, `{date}`, `{domain}`
- Metadata inclusion controls for source tracking
- Format preservation settings
- Settings import/export for team consistency

### Developer Integration

For technical users, we provide additional tools:

- DevTools panel integration for advanced element selection
- Debug mode with detailed operation logging
- Hot reload support during development
- Elements panel sidebar for quick access

## Installation

### Chrome Web Store

The extension will be available on the Chrome Web Store once development stabilizes.

### Local Installation

If you prefer to install from source or want to contribute:

1. Clone and build the extension:

   ```bash
   git clone https://github.com/your-repo/markdown-capture.git
   cd markdown-capture
   npm install
   npm run build
   ```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" and select the `dist/` folder
   - Pin the extension to your toolbar for easy access

## Usage

### Basic Workflow

The most straightforward way to capture content:

1. Click the extension icon in your Chrome toolbar
2. Click "Start Element Selection" in the popup
3. Navigate to any webpage and hover over elements
4. Click the element you want to capture
5. The markdown file saves automatically to your configured directory

### Settings Configuration

Access the settings page through:

- Extension popup settings button, or
- `chrome://extensions/` - Markdown Capture - Extension options

### DevTools Integration

For more precise element selection:

1. Open Chrome DevTools (F12)
2. Look for the "Markdown Capture" tab
3. Select elements directly from the Elements panel
4. Access advanced capture options

### Context Menu Access

Right-click any element and select "Start Markdown Selection" for quick access without opening the popup.

## Configuration

### Save Directory Settings

By default, files save to your Downloads folder. You can specify subdirectories:

- Default: `~/Downloads`
- Custom: `~/Downloads/markdown` creates a markdown subfolder
- Note: Chrome security requires all downloads go through the Downloads folder

### Filename Templates

Customize file naming using these variables:

| Variable      | Description          | Example                 |
| ------------- | -------------------- | ----------------------- |
| `{title}`     | Page title (cleaned) | `Getting_Started_Guide` |
| `{timestamp}` | Full timestamp       | `2024-01-15T14-30-00`   |
| `{date}`      | Date only            | `2024-01-15`            |
| `{domain}`    | Website domain       | `github-com`            |

Template examples:

- `{title}_{date}.md` produces `Guide_2024-01-15.md`
- `{domain}/{title}.md` creates `github-com/Guide.md`
- `notes_{timestamp}.md` generates `notes_2024-01-15T14-30-00.md`

### Metadata Options

You can customize the frontmatter added to markdown files:

```yaml
---
Source: { url }
Captured: { date }
Title: { title }
Domain: { domain }
---
```

### Advanced Settings

- Auto-download: Skip save dialogs for seamless workflow
- Preserve Formatting: Choose between original spacing or clean output
- Debug Mode: Enable detailed logging for troubleshooting

## Workflow Tips

### Element Selection

- Hover slowly to see exact element boundaries
- Use DevTools for precise selection on complex pages
- Adjust zoom levels if having trouble with small elements

### File Organization

- Use filename templates with folders for automatic organization
- Establish consistent naming patterns for easier searching
- Export settings to maintain consistency across team members

### Efficiency

- Pin the extension to your toolbar
- Enable auto-download to skip confirmation dialogs
- Use context menu for quickest access

## Troubleshooting

### Common Issues

**"Content script not ready" error**

- Solution: Refresh the page and try again
- Cause: Page loaded before extension was ready

**Element selection not working**

- Check: Some pages (like chrome:// pages) block extensions
- Try: Regular websites instead of internal Chrome pages

**Files not saving automatically**

- Enable auto-download: Chrome Settings - Downloads - Turn off "Ask where to save"
- Or: Allow downloads when Chrome prompts you

**Files saving to wrong location**

- Remember: Chrome extensions can only save to Downloads subfolders
- Solution: Manually move files or use automated file organization tools

### Debug Mode

Enable debug mode in settings to see detailed information about:

- Extension communication
- Capture process
- Error details
- Performance timing

## Privacy and Security

The extension operates entirely locally:

- No data collection or tracking
- No network requests to external servers
- Minimal Chrome API permissions
- Open source code available for review

## Contributing

We welcome contributions. See [DEV.md](DEV.md) for development setup, architecture details, and coding standards.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with modern tools that enhance the development experience:

- [CRXJS](https://crxjs.dev/) for Chrome extension development
- [Vite](https://vitejs.dev/) for fast building
- TypeScript for type safety
