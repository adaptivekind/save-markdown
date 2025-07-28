# Save Markdown - Developer Guide

## Getting Started

Set up your development environment:

```bash
# Clone and setup
git clone <repository-url>
cd save-markdown
npm install

# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run watch        # Watch mode for development

# Code Quality
npm run lint         # Check formatting (Prettier) and linting (ESLint)
npm run lint:fix     # Auto-fix formatting and linting issues
npm test             # Run test suite (121+ tests)
npm run prettier     # Check formatting only
npm run eslint       # Check TypeScript linting only
```

## Development Workflow

### Setting Up Your Environment

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

4. Enable debug mode for development:
   - Click extension icon, then Settings
   - Set "Debug Mode" to "Yes"
   - Debug information will appear in popup

### Build Process

The extension uses CRXJS with Vite for modern development:

- Source files: TypeScript files in `src/`
- Build output: Compiled JavaScript in `dist/`
- Manifest: Dynamic generation via `manifest.config.ts`
- Assets: Icons and CSS automatically copied
- Hot reload: Changes automatically reload extension

### Testing

We test key functionality to ensure reliability:

```bash
# Unit Tests
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report

# Integration Testing
npm run build              # Build extension
# Manual testing in Chrome DevTools
```

**Current test coverage includes**:

- Filename generation utilities (with domain subfolder logic)
- HTML to Markdown conversion and metadata wrapping
- XPath generation and element selection
- Save rules management and storage
- Notification system
- Error handling scenarios across all modules

### Code Quality

#### Pre-commit Hooks (Husky)

We use Husky to maintain code quality:

- Untracked files check: Prevents commits with untracked files
- Lint staged: Formats and lints only staged files
- Build validation: Ensures TypeScript compiles
- Test execution: Runs complete test suite (121+ tests)

#### Available Scripts

- `npm run prettier:fix` - Auto-fix code formatting
- `npm run eslint:fix` - Auto-fix TypeScript linting issues
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

#### Module Architecture

The codebase is organized into focused modules for maintainability:

- **Main Module** (`main.ts`): Content script handling element selection and user interactions
- **Save Rules** (`saveRules.ts`): Auto-save rule management and storage
- **Save Markdown** (`saveMarkdown.ts`): File saving functionality via Chrome Downloads API
- **Notification** (`notify.ts`): Inter-script communication and user feedback
- **Filename Utils** (`filename.ts`): Filename generation with template variables and domain subfolders
- **HTML to Markdown** (`htmlToMarkdown.ts`): Content conversion and metadata wrapping
- **XPath Generator** (`xpathGenerator.ts`): Element targeting and selection utilities
- **Debug Modules** (`debugPage.ts`, `debugElement.ts`): Development and troubleshooting tools

## Extension Architecture

### Core Components

#### Background Service Worker (`background.ts`)

- Handles Chrome extension lifecycle events
- Manages context menus and inter-tab communication
- Coordinates between popup, content scripts, and file saving

#### Content Script (`main.ts`)

- Injected into all web pages
- Handles element selection with visual overlay system
- Manages auto-save rules and element highlighting
- Provides manual save functionality for disabled rules
- Real-time XPath editing and rule management

#### Popup Interface (`popup.ts`)

- Extension toolbar popup for quick access
- Save rule creation and settings access
- Debug mode controls and status display

#### Options Page (`options.ts`)

- Comprehensive settings management
- Save rule configuration and editing
- Settings import/export functionality

### Data Flow

```
User Action → Content Script → Background Worker → File System
     ↓              ↓               ↓
  Element       Save Rules      Download API
 Selection     Management        (Chrome)
     ↓              ↓               ↓
  XPath         Auto/Manual     Markdown File
Generation      Save Logic       in Downloads
```

### Storage Architecture

The extension uses `chrome.storage.sync` for cross-device settings:

- **saveRules**: Array of SaveRule objects with XPath selectors and metadata
- **saveDirectory**: Target directory for markdown files (default: ~/Downloads)
- **filenameTemplate**: Template with variables (default: {title}\_{timestamp}.md)
- **useDomainSubfolder**: Automatic domain-based organization
- **enableAutoCapture**: Master toggle for automatic rule execution

## Development Patterns

### Type Safety

All modules use TypeScript interfaces for type safety:

```typescript
interface SaveRule {
  id: string;
  name: string;
  domain: string;
  xpath: string;
  enabled: boolean;
  createdAt: string;
}
```

### Error Handling

Consistent error handling across modules:

```typescript
try {
  await saveMarkdownFile(content, url, title, tabId);
} catch (error) {
  notify(tabId, 'captureError', (error as Error).message);
}
```

### Testing Strategy

- **Unit Tests**: Jest with JSDOM for DOM manipulation testing
- **Chrome API Mocking**: Custom mocks for storage, downloads, and messaging APIs
- **Integration Testing**: Manual testing in Chrome extension environment
- **Type Checking**: TypeScript compiler ensures type safety

## Debugging

### Debug Mode

Enable debug mode in extension settings for detailed logging:

- Element selection and XPath generation details
- Save rule creation and execution logs
- File saving operations and Chrome API interactions
- Error messages with stack traces

### Development Tools

- **Chrome DevTools**: Inspect popup, content script, and background worker
- **Extension Service Worker**: Monitor background script in Chrome DevTools
- **CRXJS Hot Reload**: Automatic extension reload during development
- **Jest Watch Mode**: Continuous testing during development

## Contributing Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions (camelCase for functions, PascalCase for interfaces)
- Add JSDoc comments for public functions
- Maintain consistent indentation and formatting (Prettier handles this)

### Testing Requirements

- Add tests for all new functionality
- Maintain existing test coverage levels
- Use descriptive test names that explain the behavior being tested
- Mock Chrome APIs appropriately for unit testing

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run `npm run lint` and `npm test` to ensure quality
4. Create pull request with descriptive title and summary
5. Ensure CI pipeline passes (GitHub Actions)

## Performance Considerations

### Content Script Optimization

- Debounced hover events to prevent excessive DOM updates
- Efficient XPath generation avoiding expensive DOM traversals
- Minimal CSS injection for visual overlays

### Storage Efficiency

- Compact save rule objects with minimal metadata
- Efficient queries using chrome.storage.sync with specific keys
- Automatic cleanup of stale or invalid rules

### Memory Management

- Event listener cleanup when selection mode ends
- DOM element cleanup for overlays and debug elements
- Service worker design for minimal background resource usage

## Browser Compatibility

- **Primary Target**: Chrome/Chromium (Manifest V3)
- **Chrome APIs**: activeTab, storage.sync, downloads, contextMenus
- **ES Modules**: Modern JavaScript module system
- **TypeScript**: Compiled to compatible JavaScript for broad Chrome version support
