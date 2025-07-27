# Markdown Capture

A powerful Chrome extension that lets you select any HTML element on a webpage and save it as beautifully formatted markdown to your computer.

## ✨ Features

### 🎯 Smart Element Selection

- **Visual Selection**: Hover over any element with a helpful blue overlay
- **One-Click Capture**: Simply click to capture any element as markdown
- **Keyboard Support**: Press `Escape` to cancel selection
- **Context Menu**: Right-click any element for quick capture

### 📝 Advanced Markdown Conversion

Preserves formatting for:

- **Headers** (H1-H6)
- **Text Formatting** (bold, italic, code, strikethrough)
- **Links and Images** (with proper markdown syntax)
- **Lists** (ordered and unordered, with nesting)
- **Tables** (complete with headers and alignment)
- **Blockquotes** and **Code Blocks**
- **Complex Structures** (nested elements, mixed content)

### ⚙️ Powerful Configuration

- **Custom Save Directory**: Choose where your files are saved
- **Filename Templates**: Use variables like `{title}`, `{date}`, `{domain}`
- **Metadata Control**: Include/exclude source URL and capture date
- **Format Options**: Preserve original formatting or clean for readability
- **Import/Export Settings**: Backup and share your configuration

### 🛠️ Developer Tools Integration

- **DevTools Panel**: Advanced capture options in Chrome DevTools
- **Elements Sidebar**: Quick capture from Elements panel
- **Debug Mode**: Detailed logging for troubleshooting
- **Hot Reload**: Instant updates during development

## 🚀 Installation

### Option 1: Chrome Web Store (Recommended)

_Coming soon - extension will be available on the Chrome Web Store_

### Option 2: Local Development Install

1. **Clone and Build**

   ```bash
   git clone https://github.com/your-repo/markdown-capture.git
   cd markdown-capture
   npm install
   npm run build
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" and select the `dist/` folder
   - Pin the extension to your toolbar (optional)

## 📖 How to Use

### Basic Usage

1. **Click the extension icon** in your Chrome toolbar
2. **Click "Start Element Selection"** in the popup
3. **Navigate to any webpage** and hover over elements
4. **Click the element** you want to capture
5. **Your markdown file** is automatically saved!

### Advanced Usage

#### ⚙️ Settings Page

Access comprehensive settings via:

- Extension popup → Settings button, or
- `chrome://extensions/` → Markdown Capture → Extension options

#### 🎛️ DevTools Integration

1. Open Chrome DevTools (`F12`)
2. Look for the "Markdown Capture" tab
3. Select elements directly from the Elements panel
4. Use advanced capture options

#### 🖱️ Context Menu

- Right-click any element → "Start Markdown Selection"
- Quick access without opening the popup

## ⚙️ Configuration Guide

### 📁 Save Directory Settings

- **Default**: `~/Downloads`
- **Examples**:
  - `~/Downloads/markdown` → `Downloads/markdown/`
  - `~/Documents/notes` → `Downloads/Documents/notes/`

_Note: Chrome security requires all downloads go through the Downloads folder_

### 📄 Filename Templates

Customize how files are named using these variables:

| Variable      | Description          | Example                 |
| ------------- | -------------------- | ----------------------- |
| `{title}`     | Page title (cleaned) | `Getting_Started_Guide` |
| `{timestamp}` | Full timestamp       | `2024-01-15T14-30-00`   |
| `{date}`      | Date only            | `2024-01-15`            |
| `{domain}`    | Website domain       | `github-com`            |

**Template Examples**:

- `{title}_{date}.md` → `Guide_2024-01-15.md`
- `{domain}/{title}.md` → `github-com/Guide.md`
- `notes_{timestamp}.md` → `notes_2024-01-15T14-30-00.md`

### 📋 Metadata Templates

Customize the frontmatter added to your markdown files:

```yaml
---
Source: { url }
Captured: { date }
Title: { title }
Domain: { domain }
---
```

### 🔧 Advanced Options

- **Auto-download**: Skip save dialogs for seamless capture
- **Preserve Formatting**: Keep original spacing vs. clean output
- **Debug Mode**: Enable detailed logging for troubleshooting

## 💡 Tips & Tricks

### 🎯 Better Element Selection

- **Hover slowly** to see the exact element boundaries
- **Use DevTools** for precise element selection
- **Try different zoom levels** if having trouble selecting small elements

### 📁 File Organization

- Use filename templates with folders: `{domain}/{title}.md`
- Set up consistent naming patterns for easier searching
- Export your settings to share with team members

### 🚀 Productivity Shortcuts

- **Pin the extension** to your toolbar for quick access
- **Enable auto-download** to skip save confirmations
- **Use context menu** for fastest element capture

## 🐛 Troubleshooting

### Common Issues

**🔴 "Content script not ready" error**

- **Solution**: Refresh the page and try again
- **Cause**: Page loaded before extension was ready

**🔴 Element selection not working**

- **Check**: Some pages (like `chrome://` pages) block extensions
- **Try**: Regular websites instead of internal Chrome pages

**🔴 Files not saving automatically**

- **Enable auto-download**: Chrome Settings → Downloads → Turn off "Ask where to save"
- **Or**: Allow downloads when Chrome prompts you

**🔴 Files saving to wrong location**

- **Remember**: Chrome extensions can only save to Downloads subfolders
- **Solution**: Manually move files or use automated file organization tools

### 🐛 Debug Mode

Enable debug mode in settings to see detailed information about:

- Extension communication
- Capture process
- Error details
- Performance timing

## 🛡️ Privacy & Security

- **No data collection**: Extension works entirely locally
- **No network requests**: No data sent to external servers
- **Minimal permissions**: Only requests necessary Chrome APIs
- **Open source**: Full code available for review

## 🤝 Contributing

We welcome contributions! Please see [DEV.md](DEV.md) for:

- Development setup
- Architecture overview
- Coding standards
- Testing guidelines

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [CRXJS](https://crxjs.dev/) for modern Chrome extension development
- Powered by [Vite](https://vitejs.dev/) for fast building
- TypeScript for type safety and better development experience

---

**Happy capturing! 🎉**

_Star this repo if you find it useful, and feel free to report issues or suggest features._
