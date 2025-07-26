# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Browser Extension (Manifest V3) that captures HTML elements from web pages and converts them to markdown format. The extension uses a pure vanilla JavaScript approach with no external dependencies or build system.

## Development Commands

Since this is a Chrome extension without a build system, development follows Chrome extension patterns:

- **Install Extension**: Load unpacked extension in Chrome Developer Mode at `chrome://extensions/`
- **Test Changes**: Reload the extension in Chrome after file modifications
- **Debug**: Use Chrome DevTools Console for popup/content script debugging, and Extension Service Worker inspector for background script

## Architecture

The extension follows standard Chrome Extension architecture with three main components:

### Component Communication Flow
```
Popup (popup.js) ←→ Content Script (content.js) ←→ Background Worker (background.js)
```

- **Popup** (`popup.html/js`): User interface and configuration
- **Content Script** (`content.js`): Injected into all web pages, handles element selection and HTML→markdown conversion
- **Background Service Worker** (`background.js`): Handles file saving via Chrome Downloads API

### Key Interactions
- Popup communicates with content scripts via `chrome.tabs.sendMessage()`
- Content scripts send captured content to background worker via `chrome.runtime.sendMessage()`
- Background worker uses Chrome Downloads API to save markdown files

## Core Functionality

### HTML to Markdown Conversion
The `htmlToMarkdown()` function in `content.js` contains a recursive parser that handles:
- Headers (H1-H6), text formatting (bold, italic, code)
- Links, images, lists (ordered/unordered), tables, blockquotes, code blocks
- Maintains proper markdown spacing and syntax

### Element Selection System
- Visual overlay system highlights elements on hover
- Mouse event handlers manage selection state
- Escape key cancels selection mode

### File Saving
- Template-based filename generation with variables: `{title}`, `{timestamp}`, `{domain}`, `{date}`
- Metadata injection includes source URL, capture date, and page title
- Uses Chrome Downloads API with Blob URLs

## Configuration

Extension settings are stored via `chrome.storage.sync`:
- `saveDirectory`: Target directory (default: `~/Downloads`)
- `filenameTemplate`: Template with variables (default: `{title}_{timestamp}.md`)

## Missing Components

- Extension icons referenced in manifest.json (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`) need to be created
- No automated testing framework

## Chrome Extension Permissions

- `activeTab`: Access current tab content
- `storage`: Save configuration settings  
- `downloads`: Save captured markdown files
- `<all_urls>`: Work on any website (required for content script injection)