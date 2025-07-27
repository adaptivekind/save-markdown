/**
 * Auto capture rules module for managing persistent capture rules
 */

import { generateXPath, getElementByXPath } from './xpathGenerator';

export interface CaptureRule {
  id: string;
  domain: string;
  xpath: string;
  name: string;
  created: string;
  enabled: boolean;
}

const STORAGE_KEY = 'captureRules';

/**
 * Gets all auto capture rules from storage
 */
export async function getCaptureRules(): Promise<CaptureRule[]> {
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
export async function getCaptureRulesForDomain(
  domain: string,
): Promise<CaptureRule[]> {
  const rules = await getCaptureRules();
  return rules.filter(rule => rule.domain === domain);
}

/**
 * Adds a new auto capture rule
 */
export async function addCaptureRule(
  domain: string,
  xpath: string,
  name: string,
): Promise<void> {
  try {
    const rules = await getCaptureRules();
    const newRule: CaptureRule = {
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
export async function removeCaptureRule(id: string): Promise<void> {
  try {
    const rules = await getCaptureRules();
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
export async function updateCaptureRule(
  id: string,
  updates: Partial<CaptureRule>,
): Promise<void> {
  try {
    const rules = await getCaptureRules();
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
export async function toggleCaptureRule(id: string): Promise<boolean> {
  try {
    const rules = await getCaptureRules();
    const rule = rules.find(rule => rule.id === id);

    if (!rule) {
      throw new Error(`Rule with id ${id} not found`);
    }

    const newEnabledState = !rule.enabled;
    await updateCaptureRule(id, { enabled: newEnabledState });
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

  await addCaptureRule(domain, xpath, name);
}

/**
 * Finds elements on the current page that match auto capture rules
 */
export async function findCaptureElements(): Promise<
  { element: HTMLElement; rule: CaptureRule }[]
> {
  const domain = window.location.hostname.replace('www.', '');
  const rules = await getCaptureRulesForDomain(domain);
  const matches: { element: HTMLElement; rule: CaptureRule }[] = [];

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
export async function findAllCaptureElements(): Promise<
  { element: HTMLElement; rule: CaptureRule }[]
> {
  const domain = window.location.hostname.replace('www.', '');
  const rules = await getCaptureRulesForDomain(domain);
  const matches: { element: HTMLElement; rule: CaptureRule }[] = [];

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
