/**
 * Concrete implementation of RuleManager for suggested rules
 */

import { BaseRuleManager, RuleManagerConfig } from './ruleManager';
import { SaveRule } from './types';
import {
  getSuggestedRules,
  removeSuggestedRule,
  updateSuggestedRule,
} from './suggestedRules';

export class SuggestedRuleManager extends BaseRuleManager {
  constructor(
    statusCallback: (message: string, type: 'success' | 'error') => void,
  ) {
    const config: RuleManagerConfig = {
      containerSelector: 'suggestedRules',
      noRulesMessageSelector: 'noSuggestedRulesMessage',
      rulePrefix: 'suggested-rule',
      ruleClass: 'suggested-rule-item',
      showCreatedDate: false,
      showPriority: true,
      allowPriorityEdit: true,
    };
    super(config, statusCallback);
  }

  protected async getRules(): Promise<SaveRule[]> {
    return await getSuggestedRules();
  }

  protected async deleteRule(id: string): Promise<void> {
    await removeSuggestedRule(id);
  }

  protected async updateRule(
    id: string,
    updates: Partial<SaveRule>,
  ): Promise<void> {
    await updateSuggestedRule(id, updates);
  }

  /**
   * Override display info to show domain differently for suggested rules
   */
  protected createDisplayInfo(rule: SaveRule): string {
    let info = `
      <div class="suggested-rule-domain" id="suggested-domain-display-${this.config.rulePrefix}-${rule.id}">
        Domain: ${rule.domain === '*' ? 'All domains' : rule.domain}
      </div>
      <div class="suggested-rule-xpath" id="suggested-xpath-display-${this.config.rulePrefix}-${rule.id}">${rule.xpath}</div>
    `;

    if (this.config.showPriority) {
      info += `<div class="suggested-rule-priority">Priority: ${rule.priority}</div>`;
    }

    return info;
  }
}
