# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Browser Extension (Manifest V3) built with TypeScript that captures HTML elements from web pages and converts them to markdown format. The extension uses TypeScript for type safety and has no external runtime dependencies. The project includes comprehensive development tooling with Husky pre-commit hooks, ESLint, Prettier, and GitHub Actions CI/CD.

## Development Commands

This Chrome extension uses TypeScript with a comprehensive build and quality system:

### Core Build Commands

- **Build**: `npm run build` - Compiles TypeScript files to `dist/` directory
- **Watch**: `npm run watch` - Automatically rebuilds on file changes
- **Clean**: `npm run clean` - Removes compiled output
- **Test**: `npm test` - Runs test suite (currently build validation)

### Code Quality Commands

- **Lint**: `npm run lint` - Runs Prettier formatting check + ESLint
- **Lint Fix**: `npm run lint:fix` - Auto-fixes formatting and linting issues
- **Prettier**: `npm run prettier` - Check code formatting
- **Prettier Fix**: `npm run prettier:fix` - Apply code formatting
- **ESLint**: `npm run eslint` - TypeScript linting only
- **ESLint Fix**: `npm run eslint:fix` - Auto-fix TypeScript linting issues

### Extension Development

- **Install Extension**: Load unpacked extension in Chrome Developer Mode at `chrome://extensions/`
- **Test Changes**: Run `npm run build` then reload the extension in Chrome
- **Debug**: Use Chrome DevTools Console for popup/content script debugging, and Extension Service Worker inspector for background script

### Pre-commit Hooks (Husky)

- Automatically runs on every `git commit`
- Blocks commits with untracked files (encourages proper git hygiene)
- Runs `lint-staged` to format and lint only staged files
- Runs full build to ensure TypeScript compiles
- Runs test suite to validate functionality

## Architecture

The extension follows standard Chrome Extension architecture with three main components:

### Component Communication Flow

```
Popup (popup.ts) ←→ Content Script (content.ts) ←→ Background Worker (background.ts)
                                                            ↓
                                                   Filename Utils (filename.ts)
```

- **Popup** (`popup.html` + `popup.ts`): User interface and configuration
- **Content Script** (`content.ts`): Injected into all web pages, handles element selection and HTML→markdown conversion
- **Background Service Worker** (`background.ts`): Handles file saving via Chrome Downloads API
- **Filename Utilities** (`filename.ts`): Pure functions for filename generation and path handling

### Key Interactions

- Popup communicates with content scripts via `chrome.tabs.sendMessage()`
- Content scripts send captured content to background worker via `chrome.runtime.sendMessage()`
- Background worker uses Chrome Downloads API to save markdown files
- Background worker imports filename utilities for path generation

### TypeScript Architecture

All source files are in `src/` and compile to `dist/`:

- `src/background.ts` → `dist/background.js`
- `src/content.ts` → `dist/content.js`
- `src/popup.ts` → `dist/popup.js`
- `src/filename.ts` → `dist/filename.js` (utility module)

## Core Functionality

### HTML to Markdown Conversion

The `htmlToMarkdown()` function in `content.ts` contains a recursive parser that handles:

- Headers (H1-H6), text formatting (bold, italic, code)
- Links, images, lists (ordered/unordered), tables, blockquotes, code blocks
- Maintains proper markdown spacing and syntax

### Element Selection System

- Visual overlay system highlights elements on hover with blue dashed border
- Mouse event handlers manage selection state
- Escape key cancels selection mode
- Right-click context menu provides "Start Markdown Selection" option

### File Saving

- Template-based filename generation with variables: `{title}`, `{timestamp}`, `{domain}`, `{date}`
- Filename utilities module (`filename.ts`) handles path generation and sanitization
- Metadata injection includes source URL, capture date, and page title
- Uses Chrome Downloads API with data URLs (compatible with service workers)
- Automatic file conflict resolution with 'uniquify' strategy

## Configuration

Extension settings are stored via `chrome.storage.sync`:

- `saveDirectory`: Target directory (default: `~/Downloads`)
- `filenameTemplate`: Template with variables (default: `{title}_{timestamp}.md`)

## Development Tooling

### Code Quality & CI/CD

- **Husky** pre-commit hooks with untracked file detection
- **ESLint** for TypeScript linting with custom rules
- **Prettier** for consistent code formatting
- **lint-staged** for efficient pre-commit checks
- **GitHub Actions** CI pipeline testing Node.js 20.x and 22.x

### Configuration Files

- `.eslintrc.json` - TypeScript linting rules
- `.prettierrc.json` - Code formatting preferences
- `.lintstagedrc.json` - Pre-commit staging rules
- `.husky/pre-commit` - Git hook script
- `.github/workflows/ci.yml` - CI/CD pipeline
- `generate-icons.sh` - Script to regenerate PNG icons from SVG

### Filename Utilities (`filename.ts`)

- `generateFilename()` - Main filename generation with template variables
- `generateDownloadPath()` - Chrome-compatible path handling
- `createFilenameVariables()` - Template variable creation
- Pure functions with TypeScript interfaces for type safety

## Chrome Extension Permissions

- `activeTab`: Access current tab content
- `storage`: Save configuration settings
- `downloads`: Save captured markdown files
- `contextMenus`: Add right-click menu option
- `<all_urls>`: Work on any website (required for content script injection)

## Icon Generation

Extension includes custom icons created from SVG source:

- `icon.svg` - Source SVG with blue arrow and black "M"
- `generate-icons.sh` - Builds PNG icons at 16x16, 48x48, 128x128
- Arrow design maximized to fill canvas with prominent "M" overlay
