# Markdown Capture - Developer Guide

This guide covers development setup, architecture, and contribution guidelines for the Markdown Capture Chrome extension.

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd markdown-capture
npm install

# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run watch        # Watch mode for development

# Code Quality
npm run lint         # Check formatting and linting
npm run lint:fix     # Auto-fix issues
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
```

## Technology Stack

- **Build System**: Vite + CRXJS for modern Chrome extension development
- **Language**: TypeScript with strict type checking
- **Testing**: Jest with TypeScript support
- **Code Quality**: ESLint + Prettier + Husky pre-commit hooks
- **CI/CD**: GitHub Actions

## Project Architecture

### Extension Components

```
src/
├── background.ts        # Service worker (background script)
├── content.ts          # Content script (injected into pages)
├── popup.ts           # Popup interface logic
├── options.ts         # Options page logic
├── devtools.ts        # DevTools integration entry
├── devtools-panel.ts  # DevTools panel implementation
├── filename.ts        # Filename generation utilities
└── htmlToMarkdown.ts  # HTML to Markdown conversion
```

### Component Communication

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Popup     │───▶│   Content   │───▶│ Background  │
│ (popup.ts)  │    │(content.ts) │    │(background.ts)│
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │            ┌─────────────┐             │
       └───────────▶│  Options    │◀────────────┘
                    │(options.ts) │
                    └─────────────┘
```

**Message Flow**:

1. **Popup → Content**: Start/stop element selection
2. **Content → Background**: Save captured markdown
3. **Background → Popup**: Capture completion status
4. **Options**: Persistent settings via chrome.storage.sync

### Key Features

#### CRXJS Integration

- **Hot Module Replacement**: Real-time updates during development
- **Modern Build**: Vite-powered bundling with optimizations
- **TypeScript Support**: Native TS compilation and type checking
- **Manifest V3**: Latest Chrome extension standards

#### Development Tools

- **Debug Mode**: Toggle in options page, shows detailed popup logging
- **DevTools Panel**: Custom Chrome DevTools integration for advanced capture
- **Context Menu**: Right-click element capture
- **Options Page**: Comprehensive settings management

## Development Workflow

### Setting Up Development Environment

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

3. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

4. **Enable Debug Mode**
   - Click extension icon → Settings
   - Set "Debug Mode" to "Yes"
   - Debug information will appear in popup

### File Structure

```
markdown-capture/
├── src/                    # Source TypeScript files
├── dist/                   # Built extension (load this in Chrome)
├── icons/                  # Extension icons (16px, 48px, 128px)
├── tests/                  # Test files
├── .github/workflows/      # CI/CD configuration
├── manifest.config.ts      # Dynamic manifest configuration
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
├── jest.config.cjs        # Jest test configuration
└── package.json           # Dependencies and scripts
```

### Build Process

The extension uses CRXJS with Vite for a modern development experience:

- **Source Files**: TypeScript files in `src/`
- **Build Output**: Compiled JavaScript in `dist/`
- **Manifest**: Dynamic generation via `manifest.config.ts`
- **Assets**: Icons and CSS automatically copied
- **Hot Reload**: Changes automatically reload extension

### Testing Strategy

```bash
# Unit Tests
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report

# Integration Testing
npm run build              # Build extension
# Manual testing in Chrome DevTools
```

**Test Coverage**:

- Filename generation utilities
- HTML to Markdown conversion
- Error handling scenarios

### Code Quality

#### Pre-commit Hooks (Husky)

- **Untracked Files Check**: Prevents commits with untracked files
- **Lint Staged**: Formats and lints only staged files
- **Build Validation**: Ensures TypeScript compiles
- **Test Execution**: Runs test suite

#### ESLint Configuration

```json
{
  "extends": ["@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

#### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80
}
```

## Core Functionality

### HTML to Markdown Conversion

The `htmlToMarkdown.ts` module provides recursive HTML parsing:

```typescript
export function htmlToMarkdown(element: HTMLElement): string {
  // Recursive parsing with support for:
  // - Headers (H1-H6)
  // - Text formatting (bold, italic, code)
  // - Links and images
  // - Lists and tables
  // - Code blocks and blockquotes
}
```

### Filename Generation

Template-based filename generation with variables:

```typescript
interface FilenameVariables {
  title: string; // Page title (sanitized)
  timestamp: string; // ISO timestamp
  domain: string; // Domain name (sanitized)
  date: string; // YYYY-MM-DD format
}
```

**Example Template**: `{title}_{timestamp}.md`
**Output**: `Example_Page_2024-01-01T12-00-00.md`

### Debug Mode

Enable detailed logging for development:

```typescript
// In popup.ts
function showDebug(message: string): void {
  if (!debugMode) return;
  // Timestamp and display debug information
}
```

**Debug Information**:

- Message communication between components
- API response details
- Error stack traces
- Performance timing

## Chrome Extension APIs

### Permissions Used

```json
{
  "permissions": [
    "activeTab", // Access current tab content
    "storage", // Save configuration settings
    "downloads", // Save captured files
    "contextMenus" // Right-click menu integration
  ],
  "optional_permissions": [
    "devtools" // DevTools panel (optional to avoid install warning)
  ],
  "host_permissions": ["<all_urls>"]
}
```

### Storage Schema

```typescript
interface ExtensionOptions {
  saveDirectory: string; // Default: "~/Downloads"
  filenameTemplate: string; // Default: "{title}_{timestamp}.md"
  includeMetadata: boolean; // Default: true
  metadataTemplate: string; // Frontmatter template
  preserveFormatting: boolean; // Default: true
  autoDownload: boolean; // Default: true
  debugMode: boolean; // Default: true
}
```

## Troubleshooting

### Common Issues

1. **Content Script Not Ready**
   - **Symptom**: "undefined" response on first page load
   - **Solution**: Refresh page or check debug mode output
   - **Root Cause**: Content script injection timing

2. **Build Failures**
   - **Check**: TypeScript compilation errors
   - **Fix**: Run `npm run lint:fix` and address type issues

3. **Extension Not Loading**
   - **Verify**: `dist/` directory contains built files
   - **Check**: Chrome DevTools → Extensions → Service Worker errors

4. **Hot Reload Not Working**
   - **Restart**: Development server (`npm run dev`)
   - **Reload**: Extension in Chrome extensions page

### Debug Mode Usage

Enable debug mode in options page to see:

- Message communication logs
- API response details
- Error information
- Timing data

### Performance Considerations

- **Content Script**: Minimized footprint, only active during selection
- **Background Script**: Service worker model for efficiency
- **Build Output**: Tree-shaking eliminates unused code
- **Asset Optimization**: Icons and resources compressed

## Contributing

### Code Style

- Use TypeScript with strict type checking
- Follow ESLint and Prettier configurations
- Write tests for new functionality
- Update documentation for API changes

### Pull Request Process

1. **Fork and Branch**: Create feature branch from `main`
2. **Develop**: Make changes with tests
3. **Quality Check**: Run `npm run lint` and `npm test`
4. **Build Test**: Verify `npm run build` succeeds
5. **Submit PR**: Include description and testing notes

### Release Process

1. **Version Bump**: Update `package.json` version
2. **Build**: Run `npm run build`
3. **Test**: Manual testing in Chrome
4. **Tag**: Create git tag for release
5. **Package**: Zip `dist/` contents for Chrome Web Store

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [CRXJS Documentation](https://crxjs.dev/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
