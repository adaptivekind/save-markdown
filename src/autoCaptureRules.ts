/**
 * Auto capture rules module for managing persistent capture rules
 */

import { generateXPath, getElementByXPath } from './xpathGenerator';

export interface AutoCaptureRule {
  id: string;
  domain: string;
  xpath: string;
  name: string;
  created: string;
  enabled: boolean;
}

const STORAGE_KEY = 'autoCaptureRules';

/**
 * Gets all auto capture rules from storage
 */
export async function getAutoCaptureRules(): Promise<AutoCaptureRule[]> {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
  } catch (error) {
    console.error('Failed to get auto capture rules:', error);
    return [];
  }
}

/**
 * Gets auto capture rules for the current domain
 */
export async function getAutoCaptureRulesForDomain(
  domain: string,
): Promise<AutoCaptureRule[]> {
  const rules = await getAutoCaptureRules();
  return rules.filter(rule => rule.domain === domain);
}

/**
 * Adds a new auto capture rule
 */
export async function addAutoCaptureRule(
  domain: string,
  xpath: string,
  name: string,
): Promise<void> {
  try {
    const rules = await getAutoCaptureRules();
    const newRule: AutoCaptureRule = {
      id: generateRuleId(),
      domain,
      xpath,
      name,
      created: new Date().toISOString(),
      enabled: true,
    };

    rules.push(newRule);
    await chrome.storage.sync.set({ [STORAGE_KEY]: rules });
  } catch (error) {
    console.error('Failed to add auto capture rule:', error);
    throw error;
  }
}

/**
 * Removes an auto capture rule by ID
 */
export async function removeAutoCaptureRule(id: string): Promise<void> {
  try {
    const rules = await getAutoCaptureRules();
    const filteredRules = rules.filter(rule => rule.id !== id);
    await chrome.storage.sync.set({ [STORAGE_KEY]: filteredRules });
  } catch (error) {
    console.error('Failed to remove auto capture rule:', error);
    throw error;
  }
}

/**
 * Updates an existing auto capture rule
 */
export async function updateAutoCaptureRule(
  id: string,
  updates: Partial<AutoCaptureRule>,
): Promise<void> {
  try {
    const rules = await getAutoCaptureRules();
    const ruleIndex = rules.findIndex(rule => rule.id === id);

    if (ruleIndex === -1) {
      throw new Error('Rule not found');
    }

    rules[ruleIndex] = { ...rules[ruleIndex], ...updates };
    await chrome.storage.sync.set({ [STORAGE_KEY]: rules });
  } catch (error) {
    console.error('Failed to update auto capture rule:', error);
    throw error;
  }
}

/**
 * Toggles the enabled state of an auto capture rule
 */
export async function toggleAutoCaptureRule(id: string): Promise<boolean> {
  try {
    const rules = await getAutoCaptureRules();
    const rule = rules.find(rule => rule.id === id);

    if (!rule) {
      throw new Error(`Rule with id ${id} not found`);
    }

    const newEnabledState = !rule.enabled;
    await updateAutoCaptureRule(id, { enabled: newEnabledState });
    return newEnabledState;
  } catch (error) {
    console.error('Failed to toggle auto capture rule:', error);
    throw error;
  }
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

  await addAutoCaptureRule(domain, xpath, name);
}

/**
 * Finds elements on the current page that match auto capture rules
 */
export async function findAutoCaptureElements(): Promise<
  { element: HTMLElement; rule: AutoCaptureRule }[]
> {
  const domain = window.location.hostname.replace('www.', '');
  const rules = await getAutoCaptureRulesForDomain(domain);
  const matches: { element: HTMLElement; rule: AutoCaptureRule }[] = [];

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
export async function findAllAutoCaptureElements(): Promise<
  { element: HTMLElement; rule: AutoCaptureRule }[]
> {
  const domain = window.location.hostname.replace('www.', '');
  const rules = await getAutoCaptureRulesForDomain(domain);
  const matches: { element: HTMLElement; rule: AutoCaptureRule }[] = [];

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
function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
