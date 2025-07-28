import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';

const { version } = packageJson;

// Convert from Semver (example: 0.0.1)
const [major, minor, patch, label = '0'] = version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, '')
  // split into version parts
  .split(/[.-]/);

export default defineManifest(async env => ({
  manifest_version: 3,
  name: env.mode === 'development' ? '[DEV] Save Markdown' : 'Save Markdown',
  // up to four numbers separated by dots
  version: `${major}.${minor}.${patch}.${label}`,
  // semver is OK in "version_name"
  version_name: version,
  description:
    'Select HTML elements and save them as markdown to a configured directory',
  permissions: ['activeTab', 'storage', 'downloads', 'contextMenus'],
  host_permissions: ['<all_urls>'],
  action: {
    default_popup: 'popup.html',
    default_title: 'Save Markdown',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  options_page: 'options.html',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/main.ts'],
    },
  ],
  background: {
    service_worker: 'src/background.ts',
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
}));
