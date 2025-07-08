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

// Unified Plugin interfaces
export interface UnifiedPluginData {
	name: string;
	type: 'remark' | 'rehype';
	description?: string;
	enabled: boolean;
	config: any;
	metaConfig: ConfigMetaCollection;
}

// Legacy interfaces (for backward compatibility)
export interface PluginData {
	name: string;
	description?: string;
	enabled: boolean;
	config: any;
	metaConfig: ConfigMetaCollection;
}

export interface RemarkPluginData {
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
	plugins: UnifiedPluginData[];
	onCopy: () => void;
	onDistribute: () => void;
	onTemplateChange: (template: string) => void;
	onThemeChange: (theme: string) => void;
	onHighlightChange: (highlight: string) => void;
	onThemeColorToggle: (enabled: boolean) => void;
	onThemeColorChange: (color: string) => void;
	onSaveSettings: () => void;
	onUpdateCSSVariables: () => void;
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
	onExpandedSectionsChange?: (sections: string[]) => void;
}

// Global interface for the exported library
export interface OmniContentReactLib {
	mount: (container: HTMLElement, props: OmniContentReactProps) => void;
	unmount: (container: HTMLElement) => void;
	update: (container: HTMLElement, props: OmniContentReactProps) => void;
}
