/**
 * Auto capture rules module for managing persistent capture rules
 */

import { generateXPath, getElementByXPath } from './xpathGenerator';
import { SaveRule } from './types';

const STORAGE_KEY = 'saveRules';

/**
 * Gets all auto capture rules from storage
 */
export async function getSaveRules(
  storageKey: string = STORAGE_KEY,
): Promise<SaveRule[]> {
  const result = await chrome.storage.sync.get([storageKey]);
  return result[storageKey] || [];
}

/**
 * Gets auto capture rules for the current domain
 */
export async function getSaveRulesForDomain(
  domain: string,
  storageKey: string = STORAGE_KEY,
): Promise<SaveRule[]> {
  const rules = await getSaveRules(storageKey);
  return rules.filter(rule => rule.domain === domain);
}

/**
 * Adds a new auto capture rule
 */
export async function addSaveRule(
  domain: string,
  xpath: string,
  name: string,
  priority: number = 50,
  storageKey: string = STORAGE_KEY,
): Promise<void> {
  const rules = await getSaveRules(storageKey);
  const newRule: SaveRule = {
    id: generateRuleId(),
    domain,
    xpath,
    name,
    created: new Date().toISOString(),
    enabled: true,
    priority,
  };

  rules.push(newRule);
  await chrome.storage.sync.set({ [storageKey]: rules });
}

/**
 * Removes an auto capture rule by ID
 */
export async function removeSaveRule(
  id: string,
  storageKey: string = STORAGE_KEY,
): Promise<void> {
  const rules = await getSaveRules(storageKey);
  const filteredRules = rules.filter(rule => rule.id !== id);
  await chrome.storage.sync.set({ [storageKey]: filteredRules });
}

/**
 * Updates an existing auto capture rule
 */
export async function updateSaveRule(
  id: string,
  updates: Partial<SaveRule>,
  storageKey: string = STORAGE_KEY,
): Promise<void> {
  const rules = await getSaveRules(storageKey);
  const ruleIndex = rules.findIndex(rule => rule.id === id);

  const rule = rules[ruleIndex];
  if (!rule) {
    throw new Error('Rule not found');
  }

  rules[ruleIndex] = { ...rule, ...updates };
  await chrome.storage.sync.set({ [storageKey]: rules });
}

/**
 * Toggles the enabled state of an auto capture rule
 */
export async function toggleSaveRule(
  id: string,
  storageKey: string = STORAGE_KEY,
): Promise<boolean> {
  const rules = await getSaveRules(storageKey);
  const rule = rules.find(rule => rule.id === id);

  if (!rule) {
    throw new Error(`Rule with id ${id} not found`);
  }

  const newEnabledState = !rule.enabled;
  await updateSaveRule(id, { enabled: newEnabledState }, storageKey);
  return newEnabledState;
}

/**
 * Creates an auto capture rule from an element
 */
export async function createRuleFromElement(
  element: HTMLElement,
): Promise<void> {
  const domain = window.location.hostname.replace('www.', '');
  const xpath = generateXPath(element);
  const tagName = element.tagName.toLowerCase();
  const elementText = element.textContent?.trim().substring(0, 30) || '';
  const name = elementText
    ? `${tagName}: ${elementText}...`
    : `${tagName} element`;

  await addSaveRule(domain, xpath, name);
}

/**
 * Finds elements on the current page that match auto capture rules
 */
export async function findSaveElements(): Promise<
  { element: HTMLElement; rule: SaveRule }[]
> {
  const domain = window.location.hostname.replace('www.', '');
  const rules = await getSaveRulesForDomain(domain);
  const matches: { element: HTMLElement; rule: SaveRule }[] = [];

  for (const rule of rules) {
    // Only process enabled rules for automatic capture
    if (!rule.enabled) {
      continue;
    }

    const element = getElementByXPath(rule.xpath);
    if (element) {
      matches.push({ element, rule });
    }
  }

  return matches;
}

/**
 * Finds all elements (enabled and disabled) that match auto capture rules for display
 */
export async function findAllSaveElements(): Promise<
  { element: HTMLElement; rule: SaveRule }[]
> {
  const domain = window.location.hostname.replace('www.', '');
  const rules = await getSaveRulesForDomain(domain);
  const matches: { element: HTMLElement; rule: SaveRule }[] = [];

  for (const rule of rules) {
    const element = getElementByXPath(rule.xpath);
    if (element) {
      matches.push({ element, rule });
    }
  }

  return matches;
}

/**
 * Generates a unique rule ID
 */
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
