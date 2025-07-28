/**
 * Tests for saveRules module
 */

import {
  getSaveRules,
  getSaveRulesForDomain,
  addSaveRule,
  removeSaveRule,
  updateSaveRule,
  toggleSaveRule,
  createRuleFromElement,
  findSaveElements,
  findAllSaveElements,
} from './saveRules';
import { SaveRule } from './types';
import { extractDomain } from './domain';

// Mock chrome.storage.sync
const mockStorage: { [key: string]: unknown } = {};

const mockChrome = {
  storage: {
    sync: {
      get: jest.fn((keys: string[]) => {
        const result: { [key: string]: unknown } = {};
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
        return Promise.resolve(result);
      }),
      set: jest.fn((items: { [key: string]: unknown }) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
  },
};

// Mock window.location (unused but kept for reference)
// const mockLocation = {
//   hostname: 'example.com',
//   href: 'https://example.com/test',
// };

// Mock getElementByXPath from xpathGenerator
jest.mock('./xpathGenerator', () => ({
  generateXPath: jest.fn(
    (element: HTMLElement) => `//${element.tagName.toLowerCase()}`,
  ),
  getElementByXPath: jest.fn((xpath: string) => {
    // Simulate finding elements for test xpaths
    if (
      xpath === '//div[@id="test"]' ||
      xpath === '//span' ||
      xpath === '//p'
    ) {
      const tagName = xpath.split('//')[1]?.split('[')[0] || 'div';
      const element = document.createElement(tagName);
      if (xpath.includes('@id="test"')) {
        element.id = 'test';
      }
      return element;
    }
    return null;
  }),
}));

// Setup global mocks
(globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

describe('saveRules', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  describe('getSaveRules', () => {
    it('should return empty array when no rules exist', async () => {
      const rules = await getSaveRules();
      expect(rules).toEqual([]);
    });

    it('should return existing rules from storage', async () => {
      const testRules: SaveRule[] = [
        {
          id: 'test1',
          domain: 'localhost',
          xpath: '//div[@id="test"]',
          name: 'Test Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
      ];

      mockStorage.saveRules = testRules;

      const rules = await getSaveRules();
      expect(rules).toEqual(testRules);
    });
  });

  describe('getSaveRulesForDomain', () => {
    beforeEach(() => {
      const testRules: SaveRule[] = [
        {
          id: 'test1',
          domain: 'localhost',
          xpath: '//div[@id="test"]',
          name: 'Test Rule 1',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
        {
          id: 'test2',
          domain: 'other.com',
          xpath: '//span',
          name: 'Test Rule 2',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
        {
          id: 'test3',
          domain: 'localhost',
          xpath: '//p',
          name: 'Test Rule 3',
          created: '2024-01-01T00:00:00.000Z',
          enabled: false,
          priority: 50,
        },
      ];
      mockStorage.saveRules = testRules;
    });

    it('should return only rules for the specified domain', async () => {
      const rules = await getSaveRulesForDomain('localhost');
      expect(rules).toHaveLength(2);
      expect(rules.every(rule => rule.domain === 'localhost')).toBe(true);
    });

    it('should return empty array for domain with no rules', async () => {
      const rules = await getSaveRulesForDomain('nonexistent.com');
      expect(rules).toEqual([]);
    });
  });

  describe('addSaveRule', () => {
    beforeAll(() => {
      // Mock Date.now() for consistent testing
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2024-01-15T10:30:45.123Z');
      jest.spyOn(Date, 'now').mockReturnValue(1642248645123);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should add a new rule to empty storage', async () => {
      await addSaveRule('localhost', '//div[@id="test"]', 'Test Rule');

      const rules = await getSaveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        domain: 'localhost',
        xpath: '//div[@id="test"]',
        name: 'Test Rule',
        created: '2024-01-15T10:30:45.123Z',
        enabled: true,
        priority: 50,
      });
      expect(rules[0]!.id).toMatch(/^rule_\d+_[a-z0-9]+$/);
    });

    it('should add a new rule to existing rules', async () => {
      const existingRule: SaveRule = {
        id: 'existing',
        domain: 'other.com',
        xpath: '//span',
        name: 'Existing Rule',
        created: '2024-01-01T00:00:00.000Z',
        enabled: true,
        priority: 50,
      };
      mockStorage.saveRules = [existingRule];

      await addSaveRule('localhost', '//div[@id="new"]', 'New Rule');

      const rules = await getSaveRules();
      expect(rules).toHaveLength(2);
      expect(rules[0]!).toEqual(existingRule);
      expect(rules[1]!).toMatchObject({
        domain: 'localhost',
        xpath: '//div[@id="new"]',
        name: 'New Rule',
        priority: 50,
      });
    });
  });

  describe('removeSaveRule', () => {
    beforeEach(() => {
      const testRules: SaveRule[] = [
        {
          id: 'rule1',
          domain: 'localhost',
          xpath: '//div[@id="test1"]',
          name: 'Rule 1',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
        {
          id: 'rule2',
          domain: 'localhost',
          xpath: '//div[@id="test2"]',
          name: 'Rule 2',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
      ];
      mockStorage.saveRules = testRules;
    });

    it('should remove the specified rule', async () => {
      await removeSaveRule('rule1');

      const rules = await getSaveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]!.id).toBe('rule2');
    });

    it('should do nothing if rule ID does not exist', async () => {
      await removeSaveRule('nonexistent');

      const rules = await getSaveRules();
      expect(rules).toHaveLength(2);
    });
  });

  describe('updateSaveRule', () => {
    beforeEach(() => {
      const testRules: SaveRule[] = [
        {
          id: 'rule1',
          domain: 'localhost',
          xpath: '//div[@id="test"]',
          name: 'Original Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
      ];
      mockStorage.saveRules = testRules;
    });

    it('should update rule properties', async () => {
      await updateSaveRule('rule1', {
        name: 'Updated Rule',
        enabled: false,
        xpath: '//div[@id="updated"]',
      });

      const rules = await getSaveRules();
      expect(rules[0]!).toMatchObject({
        id: 'rule1',
        domain: 'localhost',
        xpath: '//div[@id="updated"]',
        name: 'Updated Rule',
        created: '2024-01-01T00:00:00.000Z',
        enabled: false,
        priority: 50,
      });
    });

    it('should throw error if rule not found', async () => {
      await expect(
        updateSaveRule('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow('Rule not found');
    });

    it('should update only specified properties', async () => {
      await updateSaveRule('rule1', { name: 'New Name Only' });

      const rules = await getSaveRules();
      expect(rules[0]!).toMatchObject({
        id: 'rule1',
        domain: 'localhost',
        xpath: '//div[@id="test"]',
        name: 'New Name Only',
        created: '2024-01-01T00:00:00.000Z',
        enabled: true,
        priority: 50,
      });
    });
  });

  describe('toggleSaveRule', () => {
    beforeEach(() => {
      const testRules: SaveRule[] = [
        {
          id: 'rule1',
          domain: 'localhost',
          xpath: '//div[@id="test"]',
          name: 'Test Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
      ];
      mockStorage.saveRules = testRules;
    });

    it('should toggle enabled state from true to false', async () => {
      const newState = await toggleSaveRule('rule1');

      expect(newState).toBe(false);
      const rules = await getSaveRules();
      expect(rules[0]!.enabled).toBe(false);
    });

    it('should toggle enabled state from false to true', async () => {
      // First disable the rule
      await updateSaveRule('rule1', { enabled: false });

      const newState = await toggleSaveRule('rule1');

      expect(newState).toBe(true);
      const rules = await getSaveRules();
      expect(rules[0]!.enabled).toBe(true);
    });

    it('should throw error if rule not found', async () => {
      await expect(toggleSaveRule('nonexistent')).rejects.toThrow(
        'Rule with id nonexistent not found',
      );
    });
  });

  describe('createRuleFromElement', () => {
    beforeAll(() => {
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2024-01-15T10:30:45.123Z');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should create rule from element with text content', async () => {
      const element = document.createElement('div');
      element.textContent =
        'This is a test element with some long text content';

      await createRuleFromElement(element);

      const rules = await getSaveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]!).toMatchObject({
        domain: 'localhost',
        xpath: '//div',
        name: 'div: This is a test element with so...',
        enabled: true,
        priority: 50,
      });
    });

    it('should create rule from element without text content', async () => {
      const element = document.createElement('img');

      await createRuleFromElement(element);

      const rules = await getSaveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]!).toMatchObject({
        domain: 'localhost',
        xpath: '//img',
        name: 'img element',
        enabled: true,
        priority: 50,
      });
    });

    it('should strip www from domain', async () => {
      // Test the extractDomain function directly since we can't easily mock location in JSDOM
      const domain = extractDomain('https://www.example.com/path');
      expect(domain).toBe('example.com');
    });
  });

  describe('findSaveElements', () => {
    beforeEach(() => {
      // Reset the mock to return elements for our test xpaths
      const { getElementByXPath } = require('./xpathGenerator');
      getElementByXPath.mockImplementation((xpath: string) => {
        if (
          xpath === '//div[@id="test"]' ||
          xpath === '//span' ||
          xpath === '//p'
        ) {
          const tagName = xpath.split('//')[1]?.split('[')[0] || 'div';
          const element = document.createElement(tagName);
          if (xpath.includes('@id="test"')) {
            element.id = 'test';
          }
          return element;
        }
        return null;
      });

      const testRules: SaveRule[] = [
        {
          id: 'rule1',
          domain: 'localhost',
          xpath: '//div[@id="test"]',
          name: 'Enabled Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
        {
          id: 'rule2',
          domain: 'localhost',
          xpath: '//span',
          name: 'Disabled Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: false,
          priority: 50,
        },
        {
          id: 'rule3',
          domain: 'other.com',
          xpath: '//p',
          name: 'Other Domain Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
      ];
      mockStorage.saveRules = testRules;
    });

    it('should find only enabled rules for current domain', async () => {
      const matches = await findSaveElements();

      expect(matches).toHaveLength(1);
      expect(matches[0]!.rule.id).toBe('rule1');
      expect(matches[0]!.rule.enabled).toBe(true);
      expect(matches[0]!.element).toBeTruthy();
    });

    it('should return empty array when no enabled rules match elements', async () => {
      // Mock getElementByXPath to return null for all xpaths
      const { getElementByXPath } = require('./xpathGenerator');
      getElementByXPath.mockReturnValue(null);

      const matches = await findSaveElements();

      expect(matches).toEqual([]);
    });
  });

  describe('findAllSaveElements', () => {
    beforeEach(() => {
      // Reset the mock to return elements for our test xpaths
      const { getElementByXPath } = require('./xpathGenerator');
      getElementByXPath.mockImplementation((xpath: string) => {
        if (
          xpath === '//div[@id="test"]' ||
          xpath === '//span' ||
          xpath === '//p'
        ) {
          const tagName = xpath.split('//')[1]?.split('[')[0] || 'div';
          const element = document.createElement(tagName);
          if (xpath.includes('@id="test"')) {
            element.id = 'test';
          }
          return element;
        }
        return null;
      });

      const testRules: SaveRule[] = [
        {
          id: 'rule1',
          domain: 'localhost',
          xpath: '//div[@id="test"]',
          name: 'Enabled Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
        {
          id: 'rule2',
          domain: 'localhost',
          xpath: '//span',
          name: 'Disabled Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: false,
          priority: 50,
        },
        {
          id: 'rule3',
          domain: 'other.com',
          xpath: '//p',
          name: 'Other Domain Rule',
          created: '2024-01-01T00:00:00.000Z',
          enabled: true,
          priority: 50,
        },
      ];
      mockStorage.saveRules = testRules;
    });

    it('should find all rules (enabled and disabled) for current domain', async () => {
      const matches = await findAllSaveElements();

      expect(matches).toHaveLength(2);
      expect(matches.map(m => m.rule.id)).toEqual(['rule1', 'rule2']);
      expect(matches[0]!.rule.enabled).toBe(true);
      expect(matches[1]!.rule.enabled).toBe(false);
    });

    it('should exclude rules from other domains', async () => {
      const matches = await findAllSaveElements();

      expect(matches.every(m => m.rule.domain === 'localhost')).toBe(true);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from valid URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://subdomain.example.com')).toBe(
        'subdomain.example.com',
      );
    });

    it('should strip www prefix', () => {
      expect(extractDomain('https://www.example.com')).toBe('example.com');
      expect(extractDomain('http://www.subdomain.example.com')).toBe(
        'subdomain.example.com',
      );
    });

    it('should handle URLs with ports', () => {
      expect(extractDomain('http://localhost:3000')).toBe('localhost');
      expect(extractDomain('https://example.com:8080/path')).toBe(
        'example.com',
      );
    });

    it('should return unknown-domain for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe('unknown-domain');
      expect(extractDomain('')).toBe('unknown-domain');
      expect(extractDomain('just-text')).toBe('unknown-domain');
    });
  });

  describe('integration tests', () => {
    it('should handle complete rule lifecycle', async () => {
      // Add rule
      await addSaveRule('test.com', '//div[@class="content"]', 'Content Rule');

      let rules = await getSaveRules();
      expect(rules).toHaveLength(1);
      const ruleId = rules[0]!.id;

      // Update rule
      await updateSaveRule(ruleId, {
        name: 'Updated Content Rule',
        xpath: '//div[@class="updated-content"]',
      });

      rules = await getSaveRules();
      expect(rules[0]!.name).toBe('Updated Content Rule');
      expect(rules[0]!.xpath).toBe('//div[@class="updated-content"]');

      // Toggle rule
      let newState = await toggleSaveRule(ruleId);
      expect(newState).toBe(false);

      newState = await toggleSaveRule(ruleId);
      expect(newState).toBe(true);

      // Remove rule
      await removeSaveRule(ruleId);

      rules = await getSaveRules();
      expect(rules).toHaveLength(0);
    });

    it('should handle multiple rules for different domains', async () => {
      await addSaveRule('domain1.com', '//div[@id="content1"]', 'Rule 1');
      await addSaveRule('domain2.com', '//div[@id="content2"]', 'Rule 2');
      await addSaveRule('domain1.com', '//span[@class="info"]', 'Rule 3');

      const allRules = await getSaveRules();
      expect(allRules).toHaveLength(3);

      const domain1Rules = await getSaveRulesForDomain('domain1.com');
      expect(domain1Rules).toHaveLength(2);

      const domain2Rules = await getSaveRulesForDomain('domain2.com');
      expect(domain2Rules).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle chrome.storage errors gracefully', async () => {
      // Mock storage.sync.get to throw error
      mockChrome.storage.sync.get.mockRejectedValueOnce(
        new Error('Storage error'),
      );

      await expect(getSaveRules()).rejects.toThrow('Storage error');
    });

    it('should handle chrome.storage.set errors gracefully', async () => {
      // Mock storage.sync.set to throw error
      mockChrome.storage.sync.set.mockRejectedValueOnce(
        new Error('Storage write error'),
      );

      await expect(addSaveRule('test.com', '//div', 'Test')).rejects.toThrow(
        'Storage write error',
      );
    });
  });
});
