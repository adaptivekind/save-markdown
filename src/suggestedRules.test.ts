/**
 * Tests for suggested save rules module
 */

import {
  getSuggestedRules,
  getSuggestedRulesForDomain,
  addSuggestedRule,
  removeSuggestedRule,
  updateSuggestedRule,
  findSuggestedElement,
  extractDomain,
  SuggestedRule,
} from './suggestedRules';

// Mock chrome storage API
const mockStorage = {
  sync: {
    get: jest.fn(),
    set: jest.fn(),
  },
};

declare const global: typeof globalThis;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = {
  storage: mockStorage,
};

// Mock saveRules module
jest.mock('./saveRules', () => ({
  getSaveRulesForDomain: jest.fn(),
}));

// Mock xpathGenerator module
jest.mock('./xpathGenerator', () => ({
  getElementByXPath: jest.fn(),
}));

const { getSaveRulesForDomain } = require('./saveRules');
const { getElementByXPath } = require('./xpathGenerator');

describe('suggestedRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.sync.get.mockResolvedValue({});
    mockStorage.sync.set.mockResolvedValue(undefined);
  });

  describe('getSuggestedRules', () => {
    it('should return default rules when no custom rules exist', async () => {
      mockStorage.sync.get.mockResolvedValue({ suggestedRules: [] });

      const rules = await getSuggestedRules();

      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        id: 'default_article',
        domain: '*',
        xpath: '//article',
        name: 'Article element',
        priority: 100,
      });
    });

    it('should return stored rules when they exist', async () => {
      const storedRules: SuggestedRule[] = [
        {
          id: 'custom_rule',
          domain: 'example.com',
          xpath: '//main',
          name: 'Main content',
          priority: 200,
        },
      ];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: storedRules });

      const rules = await getSuggestedRules();

      expect(rules).toEqual(storedRules);
    });
  });

  describe('getSuggestedRulesForDomain', () => {
    it('should return rules matching domain or universal rules', async () => {
      const storedRules: SuggestedRule[] = [
        {
          id: 'universal',
          domain: '*',
          xpath: '//article',
          name: 'Article',
          priority: 100,
        },
        {
          id: 'domain_specific',
          domain: 'example.com',
          xpath: '//main',
          name: 'Main',
          priority: 200,
        },
        {
          id: 'other_domain',
          domain: 'other.com',
          xpath: '//section',
          name: 'Section',
          priority: 150,
        },
      ];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: storedRules });

      const rules = await getSuggestedRulesForDomain('example.com');

      expect(rules).toHaveLength(2);
      expect(rules[0]?.domain).toBe('example.com'); // Higher priority first
      expect(rules[1]?.domain).toBe('*');
    });

    it('should sort rules by priority descending', async () => {
      const storedRules: SuggestedRule[] = [
        {
          id: 'low_priority',
          domain: '*',
          xpath: '//article',
          name: 'Article',
          priority: 50,
        },
        {
          id: 'high_priority',
          domain: '*',
          xpath: '//main',
          name: 'Main',
          priority: 200,
        },
        {
          id: 'medium_priority',
          domain: '*',
          xpath: '//section',
          name: 'Section',
          priority: 100,
        },
      ];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: storedRules });

      const rules = await getSuggestedRulesForDomain('test.com');

      expect(rules[0]?.priority).toBe(200);
      expect(rules[1]?.priority).toBe(100);
      expect(rules[2]?.priority).toBe(50);
    });
  });

  describe('addSuggestedRule', () => {
    it('should add a new suggested rule', async () => {
      const existingRules: SuggestedRule[] = [];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: existingRules });

      await addSuggestedRule('example.com', '//main', 'Main content', 150);

      expect(mockStorage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedRules: expect.arrayContaining([
            expect.objectContaining({
              domain: 'example.com',
              xpath: '//main',
              name: 'Main content',
              priority: 150,
            }),
          ]),
        }),
      );
    });

    it('should use default priority when not specified', async () => {
      mockStorage.sync.get.mockResolvedValue({ suggestedRules: [] });

      await addSuggestedRule('example.com', '//main', 'Main content');

      expect(mockStorage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedRules: expect.arrayContaining([
            expect.objectContaining({
              priority: 50,
            }),
          ]),
        }),
      );
    });
  });

  describe('removeSuggestedRule', () => {
    it('should remove rule by ID', async () => {
      const existingRules: SuggestedRule[] = [
        {
          id: 'rule1',
          domain: 'example.com',
          xpath: '//main',
          name: 'Main',
          priority: 100,
        },
        {
          id: 'rule2',
          domain: 'test.com',
          xpath: '//article',
          name: 'Article',
          priority: 200,
        },
      ];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: existingRules });

      await removeSuggestedRule('rule1');

      expect(mockStorage.sync.set).toHaveBeenCalledWith({
        suggestedRules: [existingRules[1]],
      });
    });
  });

  describe('updateSuggestedRule', () => {
    it('should update existing rule', async () => {
      const existingRules: SuggestedRule[] = [
        {
          id: 'rule1',
          domain: 'example.com',
          xpath: '//main',
          name: 'Main',
          priority: 100,
        },
      ];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: existingRules });

      await updateSuggestedRule('rule1', {
        priority: 200,
        name: 'Updated Main',
      });

      expect(mockStorage.sync.set).toHaveBeenCalledWith({
        suggestedRules: [
          expect.objectContaining({
            id: 'rule1',
            domain: 'example.com',
            xpath: '//main',
            name: 'Updated Main',
            priority: 200,
          }),
        ],
      });
    });

    it('should throw error if rule not found', async () => {
      mockStorage.sync.get.mockResolvedValue({ suggestedRules: [] });

      await expect(
        updateSuggestedRule('nonexistent', { priority: 200 }),
      ).rejects.toThrow('Suggested rule not found');
    });
  });

  describe('findSuggestedElement', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      // Suppress JSDOM navigation warnings
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock window.location
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = {
        hostname: 'example.com',
      };
    });

    afterEach(() => {
      // Restore console
      consoleSpy.mockRestore();
    });

    it('should return null if auto save rules exist for domain', async () => {
      getSaveRulesForDomain.mockResolvedValue([{ id: 'auto_rule' }]);

      const result = await findSuggestedElement();

      expect(result).toBeNull();
    });

    it('should return first matching suggested element when no auto rules exist', async () => {
      getSaveRulesForDomain.mockResolvedValue([]);

      const mockElement = document.createElement('article');
      getElementByXPath.mockReturnValue(mockElement);

      const storedRules: SuggestedRule[] = [
        {
          id: 'article_rule',
          domain: '*',
          xpath: '//article',
          name: 'Article',
          priority: 100,
        },
      ];

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: storedRules });

      const result = await findSuggestedElement();

      expect(result).toEqual({
        element: mockElement,
        rule: storedRules[0],
      });
    });

    it('should return null if no suggested elements match', async () => {
      getSaveRulesForDomain.mockResolvedValue([]);
      getElementByXPath.mockReturnValue(null);

      mockStorage.sync.get.mockResolvedValue({ suggestedRules: [] });

      const result = await findSuggestedElement();

      expect(result).toBeNull();
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('https://www.example.com/path')).toBe('example.com');
      expect(extractDomain('http://subdomain.example.com')).toBe(
        'subdomain.example.com',
      );
    });

    it('should handle invalid URLs', () => {
      expect(extractDomain('invalid-url')).toBe('unknown-domain');
    });
  });
});
