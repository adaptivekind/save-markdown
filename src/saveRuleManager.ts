/**
 * Concrete implementation of RuleManager for save rules
 */

import { BaseRuleManager, RuleManagerConfig } from './ruleManager';
import { SaveRule } from './types';
import { getSaveRules, removeSaveRule, updateSaveRule } from './saveRules';

export class SaveRuleManager extends BaseRuleManager {
  constructor(
    statusCallback: (message: string, type: 'success' | 'error') => void,
  ) {
    const config: RuleManagerConfig = {
      containerSelector: 'saveRules',
      noRulesMessageSelector: 'noRulesMessage',
      rulePrefix: 'rule',
      ruleClass: 'save-rule-item',
      showCreatedDate: true,
      showPriority: false,
      allowPriorityEdit: false,
    };
    super(config, statusCallback);
  }

  protected async getRules(): Promise<SaveRule[]> {
    return await getSaveRules();
  }

  protected async deleteRule(id: string): Promise<void> {
    await removeSaveRule(id);
  }

  protected async updateRule(
    id: string,
    updates: Partial<SaveRule>,
  ): Promise<void> {
    await updateSaveRule(id, updates);
  }
}
