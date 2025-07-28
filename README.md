# Save Markdown

A Chrome extension that helps you select HTML elements on web pages and convert them to clean markdown files. This tool bridges the gap between web content and your local markdown workflow.

## Getting Started

The extension provides multiple ways to save content depending on your needs. You can use the popup interface for quick saves, or use context menus for workflow efficiency.

### Quick Start

1. Install the extension and pin it to your Chrome toolbar
2. Click the extension icon and select "Create Save Rule"
3. Navigate to any webpage and hover over elements to see selection boundaries
4. Click the element you want to save as markdown
5. The markdown file saves automatically to your Downloads folder

Future visits to similar pages can trigger automatic saves based on the rules you create.

## Core Capabilities

### Auto Save Rules

Create automated save rules for frequently accessed content. The extension can automatically save matching elements when you visit pages, or you can manually trigger saves for disabled rules.

### Element Selection

The extension provides visual feedback when selecting elements. Hover over any element to see a blue dashed overlay indicating the save boundary. Click to save the element, or press Escape to cancel selection.

### Markdown Conversion

The extension preserves the structure and formatting of HTML elements during conversion:

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
- Filename templates using variables like `{title}`, `{date}`, `{domain}`, `{timestamp}`
- Domain subfolder organization for automatic file organization
- Metadata inclusion controls for source tracking
- Auto save rule management and editing
- Settings import/export for team consistency

### Developer Integration

For technical users, the extension provides additional tools:

- XPath-based element targeting for precise selection
- Debug mode with detailed operation logging
- Hot reload support during development
- Comprehensive test suite with 121+ test cases

## Installation

### Chrome Web Store

The extension will be available on the Chrome Web Store once development stabilizes.

### Local Installation

If you prefer to install from source or want to contribute:

1. Clone and build the extension:

   ```bash
   git clone https://github.com/your-repo/save-markdown.git
   cd save-markdown
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

The most straightforward way to save content:

1. Click the extension icon in your Chrome toolbar
2. Click "Create Save Rule" in the popup
3. Navigate to any webpage and hover over elements
4. Click the element you want to save
5. The markdown file saves automatically to your configured directory
6. Future visits to similar pages can trigger automatic saves

### Settings Configuration

Access the settings page through:

- Extension popup "Markdown Saving Settings" button, or
- `chrome://extensions/` - Save Markdown - Extension options

### Context Menu Access

Right-click any element and select "Create Save Rule" from the "Save Markdown" submenu for quick access without opening the popup.

### Auto Save Management

- View and manage all save rules in the options page
- Toggle rules between AUTO SAVE and MANUAL SAVE modes
- Edit XPath selectors for existing rules
- Remove unused rules to keep your setup clean

## Configuration

### Save Directory Settings

By default, files save to your Downloads folder. You can specify subdirectories and enable domain-based organization:

- Default: `~/Downloads`
- Custom: `~/Downloads/markdown` creates a markdown subfolder
- Domain subfolders: Automatically organize files by website (e.g., `github-com/`)
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

- `{title}_{date}.md` produces `guide_2024-01-15.md`
- `{domain}/{title}.md` creates `github-com/guide.md`
- `notes_{timestamp}.md` generates `notes_2024-01-15T14-30-00-123Z.md`

### Metadata Options

You can customize the frontmatter added to markdown files:

```yaml
---
Source: { url }
Saved: { date }
Title: { title }
Domain: { domain }
---
```

### Advanced Settings

- Auto-download: Skip save dialogs for seamless workflow
- Enable Auto Save: Master toggle for automatic rule execution
- Preserve Formatting: Choose between original spacing or clean output
- Debug Mode: Enable detailed logging for troubleshooting

## Workflow Tips

### Element Selection

- Hover slowly to see exact element boundaries with blue dashed overlay
- Right-click for context menu access on any element
- Adjust zoom levels if having trouble with small elements
- Use the debug panel to see XPath information for selected elements

### File Organization

- Enable domain subfolders for automatic organization by website
- Use filename templates with date variables for chronological sorting
- Establish consistent naming patterns for easier searching
- Export settings to maintain consistency across team members

### Efficiency

- Pin the extension to your toolbar
- Enable auto-download to skip confirmation dialogs
- Use context menu for quickest access
- Create save rules for frequently visited content
- Toggle rules to MANUAL SAVE mode when you want selective saving

## Troubleshooting

### Common Issues

**"Content script not ready" error**

- Solution: Refresh the page and try again
- Cause: Page loaded before extension was ready

**Element selection not working**

- Check: Some pages (like chrome:// pages) block extensions
- Try: Regular websites instead of internal Chrome pages
- Solution: Refresh the page if save rule creation fails

**Files not saving automatically**

- Check: Enable Auto Save in extension settings
- Enable auto-download: Chrome Settings - Downloads - Turn off "Ask where to save"
- Verify: Save rules are set to AUTO SAVE mode, not MANUAL SAVE
- Or: Allow downloads when Chrome prompts you

**Files saving to wrong location**

- Remember: Chrome extensions can only save to Downloads subfolders
- Solution: Manually move files or use automated file organization tools

### Debug Mode

Enable debug mode in settings to see detailed information about:

- Extension communication between scripts
- Save rule creation and XPath generation
- Auto save rule matching and execution
- Error details and troubleshooting information
- File save operations and success notifications

## Privacy and Security

The extension operates entirely locally:

- No data collection or tracking
- No network requests to external servers
- Minimal Chrome API permissions
- Open source code available for review

## Contributing

Contributions are welcome. See [DEV.md](DEV.md) for development setup, architecture details, and coding standards.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with modern tools that enhance the development experience:

- [CRXJS](https://crxjs.dev/) for Chrome extension development
- [Vite](https://vitejs.dev/) for fast building
- TypeScript for type safety
