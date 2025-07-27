# Markdown Capture - Developer Guide

## Getting Started

Set up your development environment:

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

- Filename generation utilities
- HTML to Markdown conversion
- Error handling scenarios

### Code Quality

#### Pre-commit Hooks (Husky)

We use Husky to maintain code quality:

- Untracked files check: Prevents commits with untracked files
- Lint staged: Formats and lints only staged files
- Build validation: Ensures TypeScript compiles
- Test execution: Runs test suite
