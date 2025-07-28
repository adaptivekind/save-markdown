/**
 * Suggested save rules module for managing default XPath suggestions
 */

import { getElementByXPath } from './xpathGenerator';
import { SaveRule } from './types';

const STORAGE_KEY = 'suggestedRules';

// Default suggested rules
const DEFAULT_SUGGESTED_RULES: SaveRule[] = [
  {
    id: 'default_article',
    domain: '*', // All domains
    xpath: '//article',
    name: 'Article element',
    priority: 100,
    created: new Date().toISOString(),
    enabled: true,
  },
];

/**
 * Gets all suggested save rules from storage
 */
export async function getSuggestedRules(): Promise<SaveRule[]> {
  const result = await chrome.storage.sync.get([STORAGE_KEY]);
  const storedRules = result[STORAGE_KEY] || [];

  // Merge with defaults if no custom rules exist
  if (storedRules.length === 0) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SUGGESTED_RULES });
    return DEFAULT_SUGGESTED_RULES;
  }

  return storedRules;
}

/**
 * Gets suggested save rules for the current domain
 */
export async function getSuggestedRulesForDomain(
  domain: string,
): Promise<SaveRule[]> {
  const rules = await getSuggestedRules();

  // Filter rules that match the domain or are universal (*)
  const matchingRules = rules.filter(
    rule => rule.domain === '*' || rule.domain === domain,
  );

  // Sort by priority (highest first)
  return matchingRules.sort((a, b) => b.priority - a.priority);
}

/**
 * Adds a new suggested save rule
 */
export async function addSuggestedRule(
  domain: string,
  xpath: string,
  name: string,
  priority: number = 50,
): Promise<void> {
  const rules = await getSuggestedRules();
  const newRule: SaveRule = {
    id: generateSuggestedRuleId(),
    domain,
    xpath,
    name,
    priority,
    created: new Date().toISOString(),
    enabled: true,
  };

  rules.push(newRule);
  await chrome.storage.sync.set({ [STORAGE_KEY]: rules });
}

/**
 * Removes a suggested save rule by ID
 */
export async function removeSuggestedRule(id: string): Promise<void> {
  const rules = await getSuggestedRules();
  const filteredRules = rules.filter(rule => rule.id !== id);
  await chrome.storage.sync.set({ [STORAGE_KEY]: filteredRules });
}

/**
 * Updates an existing suggested save rule
 */
export async function updateSuggestedRule(
  id: string,
  updates: Partial<SaveRule>,
): Promise<void> {
  const rules = await getSuggestedRules();
  const ruleIndex = rules.findIndex(rule => rule.id === id);

  const rule = rules[ruleIndex];
  if (!rule) {
    throw new Error('Suggested rule not found');
  }

  rules[ruleIndex] = { ...rule, ...updates };
  await chrome.storage.sync.set({ [STORAGE_KEY]: rules });
}

/**
 * Finds the first matching suggested element on the current page
 * Only returns if no auto save rules are active for the current domain
 */
export async function findSuggestedElement(): Promise<{
  element: HTMLElement;
  rule: SaveRule;
} | null> {
  const domain = window.location.hostname.replace('www.', '');

  // Check if there are any auto save rules for this domain first
  const { getSaveRulesForDomain } = await import('./saveRules');
  const autoSaveRules = await getSaveRulesForDomain(domain);

  // If there are auto save rules, don't show suggested rules
  if (autoSaveRules.length > 0) {
    return null;
  }

  const suggestedRules = await getSuggestedRulesForDomain(domain);

  // Find the first matching rule
  for (const rule of suggestedRules) {
    const element = getElementByXPath(rule.xpath);
    if (element) {
      return { element, rule };
    }
  }

  return null;
}

/**
 * Generates a unique suggested rule ID
 */
function generateSuggestedRuleId(): string {
  return `suggested_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extracts domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown-domain';
  }
}
