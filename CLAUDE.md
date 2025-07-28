# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Browser Extension (Manifest V3) built with TypeScript that captures HTML elements from web pages and converts them to markdown format. The extension uses TypeScript for type safety and has no external runtime dependencies. The project includes comprehensive development tooling with Husky pre-commit hooks, ESLint, Prettier, and GitHub Actions CI/CD.

## Development Commands

This Chrome extension uses CRXJS with Vite for modern development workflow:

### Core Build Commands

- **Build**: `npm run build` - Builds extension using Vite and CRXJS
- **Dev**: `npm run dev` - Starts Vite development server with hot reload
- **Watch**: `npm run watch` - Watches for changes and rebuilds automatically
- **Clean**: `npm run clean` - Removes compiled output
- **Test**: `npm test` - Runs test suite with Jest

### Code Quality Commands

- **Lint**: `npm run lint` - Runs Prettier formatting check + ESLint
- **Lint Fix**: `npm run lint:fix` - Auto-fixes formatting and linting issues
- **Prettier**: `npm run prettier` - Check code formatting
- **Prettier Fix**: `npm run prettier:fix` - Apply code formatting
- **ESLint**: `npm run eslint` - TypeScript linting only
- **ESLint Fix**: `npm run eslint:fix` - Auto-fix TypeScript linting issues

### Extension Development

- **Development**: Run `npm run dev` for hot reload development mode
- **Install Extension**: Load unpacked extension from `dist/` directory in Chrome Developer Mode at `chrome://extensions/`
- **Test Changes**: Build automatically reloads in development mode, or run `npm run build` for production build
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
Popup (popup.ts) ←→ Content Script (main.ts) ←→ Background Worker (background.ts)
                                                            ↓
                                                   Filename Utils (filename.ts)
```

- **Popup** (`popup.html` + `popup.ts`): User interface and configuration
- **Content Script** (`main.ts`): Injected into all web pages, handles element selection and HTML→markdown conversion
- **Background Service Worker** (`background.ts`): Handles file saving via Chrome Downloads API
- **Filename Utilities** (`filename.ts`): Pure functions for filename generation and path handling

### Key Interactions

- Popup communicates with content scripts via `chrome.tabs.sendMessage()`
- Content scripts send captured content to background worker via `chrome.runtime.sendMessage()`
- Background worker uses Chrome Downloads API to save markdown files
- Background worker imports filename utilities for path generation

### TypeScript Architecture with CRXJS

All source files are in `src/` and built by Vite with CRXJS:

- `src/background.ts` → Background service worker (built by CRXJS)
- `src/main.ts` → Content script (built by CRXJS)
- `src/popup.ts` → Popup script (built by CRXJS)
- `src/options.ts` → Options page script (built by CRXJS)
- `src/devtools.ts` → DevTools extension script (built by CRXJS)
- `src/devtools-panel.ts` → DevTools panel script (built by CRXJS)
- `src/filename.ts` → Utility module (imported as needed)
- `popup.html` → Popup HTML with TypeScript module import
- `options.html` → Options page HTML with TypeScript module import
- `devtools.html` → DevTools entry point HTML
- `devtools-panel.html` → DevTools panel HTML with TypeScript module import

## Core Functionality

### HTML to Markdown Conversion

The `htmlToMarkdown()` function in `main.ts` contains a recursive parser that handles:

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

- `manifest.config.ts` - Dynamic manifest configuration using CRXJS defineManifest
- `vite.config.ts` - Vite build configuration with CRXJS plugin
- `tsconfig.json` - TypeScript configuration optimized for Vite
- `jest.config.cjs` - Jest testing configuration (CommonJS format for ES modules)
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

## Chrome Extension Features

### Core Functionality

- Element selection and markdown conversion via popup and content scripts
- Configurable file saving with template-based naming
- Context menu integration for quick access

### Options Page

- Comprehensive settings management at `chrome://extensions` → Extension Details → Extension options
- File settings: save directory and filename templates with variables
- Markdown settings: metadata inclusion and formatting options
- Advanced settings: formatting preservation and auto-download behavior
- Settings import/export functionality

### DevTools Integration

- Custom panel in Chrome DevTools for advanced element capture
- Elements panel sidebar with capture options for selected elements
- Real-time markdown preview
- Capture history tracking
- Keyboard shortcuts for quick access

### Permissions

- `activeTab`: Access current tab content
- `storage`: Save configuration settings
- `downloads`: Save captured markdown files
- `contextMenus`: Add right-click menu option
- `devtools` (optional): Enable DevTools panel functionality
- `<all_urls>`: Work on any website (required for content script injection)

## Development Notes

### Testing

- Run `npm test` before making changes to ensure functionality
- Use `npm run test:watch` during development for continuous testing
- All new features should include corresponding test cases
- Mock Chrome APIs appropriately using existing patterns

### Common Tasks

- **Add New Module**: Create TypeScript file in `src/`, add tests, export functions
- **Update Save Rules**: Modify `saveRules.ts` and corresponding tests
- **Change File Saving**: Update `saveMarkdown.ts` and `filename.ts` modules
- **Extend HTML Conversion**: Enhance `htmlToMarkdown.ts` parser
- **Debug Issues**: Enable debug mode in extension settings

### Architecture Principles

- **Separation of Concerns**: Each module has a single responsibility
- **Type Safety**: Use TypeScript interfaces for all data structures
- **Error Handling**: Consistent error patterns across all modules
- **Testing**: Comprehensive coverage for reliability
- **Chrome APIs**: Minimal permissions, service worker compatibility

## Icon Generation

Extension includes custom icons created from SVG source:

- `icon.svg` - Source SVG with dark blue solid background (#005a87) and white "M"
- `icon-disabled.svg` - Source SVG with light grey solid background (#999999) and white "M"
- `generate-icons.sh` - Builds PNG icons at 16x16, 48x48, 128x128
- Modern design optimized for Chrome extension toolbar

# Important Instructions for Claude

## Universal Guidance

If the Markdown Reader MCP is available, read the `universal-guidance.md` file for universal guidance to follow across all documentation work. If the Markdown Reader MCP is NOT available, it can be installed as described at <https://github.com/adaptivekind/markdown-reader-mcp>.

## Tone of Voice and Communication Standards

Act as a thoughtful technical mentor sharing wisdom through collaborative exploration. The voice should be conversational yet substantial, like having coffee with a colleague who has deep expertise.

**Core principles:**

- Help first and empower - lead with how this benefits the reader and their growth
- Learning by doing together - use inclusive "we" language, position yourself as a fellow learner
- Working in the open - be transparent about uncertainties, experiments, and evolving thoughts
- Practical wisdom - balance philosophical insights with actionable takeaways

**Tone characteristics:**

- Humble authority - share knowledge confidently without being dogmatic; admit what you don't know
- Warmly professional - approachable and human while maintaining credibility
- Reflectively practical - connect bigger picture thinking to concrete next steps

**Language guidelines:**

- Use simple, direct language even for complex topics
- Explain technical concepts in human terms with brief context
- Use inclusive "we" language when appropriate
- Avoid overwhelming jargon without explanation
- Be transparent about uncertainties and evolving approaches
- Connect technical decisions to practical value
- Employ bullet points and short paragraphs for readability

**Mandatory formatting standards:**

- Use normal dash "-" instead of em dash "—"
- Write in a natural and serious voice
- Do not add humorous anecdotes
- Do not show excessive enthusiasm
- Prefer "often/rarely" over absolute statements like "always/never"

## Project Terminology

- Use "save" terminology, not "capture" (this was refactored throughout the codebase)
- Functions: `saveMarkdownFile()`, `createSaveRule()`, `saveRules.ts`
- UI elements: "Create Save Rule", "Auto Save", "Manual Save"

## Testing Requirements

- ALWAYS run `npm test` after making changes to verify functionality
- NEVER assume tests pass - always verify with actual test execution
- Add test cases for new functionality following existing patterns
- Use JSDOM environment for DOM-related testing

## Module Architecture

- Follow existing modular structure - each module has specific responsibility
- Import functions from appropriate modules (e.g., `saveMarkdown.ts` for file operations)
- Maintain TypeScript interfaces for type safety
- Use consistent error handling patterns across modules

## Development Workflow

1. Read relevant test files to understand expected behavior
2. Make changes following existing code patterns
3. Run `npm test` to verify changes
4. Run `npm run lint` to check code quality
5. Test extension functionality manually if needed

## File Guidelines

- NEVER create files unless absolutely necessary for achieving the goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files unless explicitly requested
- Follow existing naming conventions and project structure

## Quick Reference

### Key Files to Understand

- `src/main.ts` - Content script with element selection and auto-save logic
- `src/saveRules.ts` - Save rule management (create, toggle, update, remove)
- `src/saveMarkdown.ts` - File saving via Chrome Downloads API
- `src/htmlToMarkdown.ts` - HTML parsing and markdown conversion
- `src/xpathGenerator.ts` - Element targeting and XPath generation
- `src/filename.ts` - Template-based filename generation

### Current Test Coverage

- Total tests: 121+ across all modules
- Coverage includes: filename generation, save rules, XPath generation, HTML conversion
- Use existing test patterns when adding new functionality

IMPORTANT: This context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
