// Settings interface for the Vite React components
export interface ViteReactSettings {
  defaultStyle: string;
  defaultHighlight: string;
  defaultTemplate: string;
  useTemplate: boolean;
  lastSelectedTemplate: string;
  enableThemeColor: boolean;
  themeColor: string;
  useCustomCss: boolean;
  authKey: string;
  wxInfo: Array<{
    appid: string;
    secret: string;
  }>;
  expandedAccordionSections: string[];
  showStyleUI: boolean;
}

// Configuration option types
export interface ConfigOption {
  value: string;
  text: string;
}

export interface ConfigMeta {
  title: string;
  type: 'switch' | 'select' | 'input';
  options?: ConfigOption[];
  description?: string;
}

export interface ConfigMetaCollection {
  [key: string]: ConfigMeta;
}

// Extension/Plugin interfaces
export interface ExtensionData {
  name: string;
  description?: string;
  enabled: boolean;
  config: any;
  metaConfig: ConfigMetaCollection;
}

export interface PluginData {
  name: string;
  description?: string;
  enabled: boolean;
  config: any;
  metaConfig: ConfigMetaCollection;
}

// Props interface for the main component
export interface OmniContentReactProps {
  settings: ViteReactSettings;
  articleHTML: string;
  cssContent: string;
  extensions: ExtensionData[];
  plugins: PluginData[];
  onRefresh: () => void;
  onCopy: () => void;
  onDistribute: () => void;
  onTemplateChange: (template: string) => void;
  onThemeChange: (theme: string) => void;
  onHighlightChange: (highlight: string) => void;
  onThemeColorToggle: (enabled: boolean) => void;
  onThemeColorChange: (color: string) => void;
  onRenderArticle: () => void;
  onSaveSettings: () => void;
  onUpdateCSSVariables: () => void;
  onExtensionToggle?: (extensionName: string, enabled: boolean) => void;
  onPluginToggle?: (pluginName: string, enabled: boolean) => void;
  onExtensionConfigChange?: (extensionName: string, key: string, value: string | boolean) => void;
  onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
}

// Global interface for the exported library
export interface OmniContentReactLib {
  mount: (container: HTMLElement, props: OmniContentReactProps) => void;
  unmount: (container: HTMLElement) => void;
  update: (container: HTMLElement, props: OmniContentReactProps) => void;
}