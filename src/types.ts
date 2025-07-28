export interface ExtensionOptions {
  saveDirectory: string;
  filenameTemplate: string;
  useDomainSubfolder: boolean;
  includeMetadata: boolean;
  metadataTemplate: string;
  preserveFormatting: boolean;
  autoDownload: boolean;
  debugMode: boolean;
  enableAutoCapture: boolean;
  enableSuggestedRules: boolean;
}

export interface SaveRule {
  id: string;
  domain: string;
  xpath: string;
  name: string;
  created: string;
  enabled: boolean;
  priority: number;
}
