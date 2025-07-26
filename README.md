# Markdown Capture Chrome Extension

A Chrome extension that allows you to select any HTML element on a webpage and save it as formatted markdown to your configured directory.

## Features

- **Element Selection**: Click to activate selection mode, then click any HTML element to capture it
- **Smart Conversion**: Converts HTML to clean markdown format preserving:
  - Headers (H1-H6)
  - Text formatting (bold, italic, code)
  - Links and images
  - Lists (ordered and unordered)
  - Tables
  - Blockquotes
  - Code blocks
- **Visual Feedback**: Blue overlay shows which element you're hovering over
- **Configurable Saving**: Set custom directory and filename templates
- **Metadata**: Includes source URL, capture date, and page title

## Local Installation

1. **Download and Build the Extension**

   ```bash
   git clone <repository-url>
   cd markdown-capture
   npm install
   npm run build
   ```

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or go to Chrome menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked" button
   - Select the `markdown-capture` folder containing the extension files
   - The extension should appear in your extensions list

5. **Pin the Extension (Optional)**
   - Click the puzzle piece icon (Extensions) in Chrome toolbar
   - Find "Markdown Capture" and click the pin icon to keep it visible

## Usage

1. Click the extension icon to open the popup
2. Configure your save directory and filename template (optional)
3. Click "Start Element Selection"
4. Navigate to any webpage
5. Click on any element you want to capture
6. The element will be converted to markdown and saved to your configured directory

## Configuration

### Save Directory

- Default: `~/Downloads`
- **Important**: Chrome extensions can only save files to subdirectories within your Downloads folder
- Examples:
  - `~/Downloads/markdown` → saves to `Downloads/markdown/`
  - `~/Documents/captures` → saves to `Downloads/Documents/captures/`
  - For true custom directories, manually move files after download

### Filename Template

- Default: `{title}_{timestamp}.md`
- Available variables:
  - `{title}` - Page title (sanitized)
  - `{timestamp}` - ISO timestamp
  - `{domain}` - Website domain
  - `{date}` - Date in YYYY-MM-DD format

### Disable Download Confirmation

To enable seamless automatic downloads without Chrome asking "Save as" every time:

1. **Method 1: Global Chrome Setting**
   - Go to Chrome Settings (`chrome://settings/`)
   - Click "Advanced" → "Downloads"
   - Turn OFF "Ask where to save each file before downloading"

2. **Method 2: Extension-Specific Permission**
   - When the extension first tries to download, Chrome will show a notification
   - Click "Allow" to permit automatic downloads for this extension
   - This only needs to be done once per extension

## Files Structure

- `manifest.json` - Extension configuration
- `popup.html/js` - Extension popup interface
- `content.js/css` - Page interaction and element selection
- `background.js` - File saving and download handling

## Permissions

- `activeTab` - Access current tab content
- `storage` - Save configuration settings
- `downloads` - Save captured markdown files
- `<all_urls>` - Work on any website

## Development

The extension is built with TypeScript and uses Manifest V3:

- **TypeScript** for type safety and better development experience
- **Service worker** for background processing
- **Content scripts** for page interaction
- **Chrome storage API** for configuration
- **Chrome downloads API** for file saving

### Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build

# Watch for changes and rebuild automatically
npm run watch

# Clean build output
npm run clean
```

### File Structure

```
src/
├── background.ts    # Service worker (background script)
├── content.ts       # Content script for page interaction
└── popup.ts         # Popup interface logic

dist/                # Compiled JavaScript output
├── background.js
├── content.js
└── popup.js
```

## Troubleshooting

- **Extension not loading**: Ensure all files are in the same directory and manifest.json is valid
- **Selection not working**: Check if the page allows content scripts (some internal Chrome pages block them)
- **Files not saving**: Verify Chrome has download permissions and check the Console for errors
- **Save confirmation appearing**: Follow the "Disable Download Confirmation" steps above
- **Files saving to wrong location**: Remember Chrome extensions can only save to subdirectories within Downloads
