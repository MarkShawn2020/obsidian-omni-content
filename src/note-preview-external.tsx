import {EventRef, ItemView, Notice, WorkspaceLeaf,} from "obsidian";
import {FRONT_MATTER_REGEX, VIEW_TYPE_NOTE_PREVIEW} from "src/constants";

import AssetsManager from "./assets";
import InlineCSS from "./inline-css";
import {CardDataManager} from "./html-plugins/code-blocks";
import {MDRendererCallback} from "./markdown-plugins/rehype-plugin";
import {LocalImageManager} from "./markdown-plugins/local-file";
import {MarkedParser} from "./markdown-plugins/parser";
import {UnifiedPluginManager} from "./shared/unified-plugin-system";
import {NMPSettings} from "./settings";
import TemplateManager from "./template-manager";
import {uevent} from "./utils";
import {OmniContentReactProps} from "@/types";
import {logger} from "./logger";

// External React App Interface
interface ExternalReactLib {
	mount: (container: HTMLElement, props: any) => void;
	unmount: (container: HTMLElement) => void;
	update: (container: HTMLElement, props: any) => void;
}

export class NotePreviewExternal extends ItemView implements MDRendererCallback {
	container: Element;
	settings: NMPSettings;
	assetsManager: AssetsManager;
	articleHTML: string;
	title: string;
	markedParser: MarkedParser;
	listeners: EventRef[];
	externalReactLib: ExternalReactLib | null = null;
	reactContainer: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.settings = NMPSettings.getInstance();
		this.assetsManager = AssetsManager.getInstance();
		this.markedParser = new MarkedParser(this.app, this);

		// 插件系统已通过MarkedParser初始化，无需单独初始化
	}

	get currentTheme() {
		return this.settings.defaultStyle;
	}

	get currentHighlight() {
		return this.settings.defaultHighlight;
	}

	get workspace() {
		return this.app.workspace;
	}

	getViewType() {
		return VIEW_TYPE_NOTE_PREVIEW;
	}

	getIcon() {
		return "clipboard-paste";
	}

	getDisplayText() {
		return "笔记预览";
	}

	private async loadExternalReactApp() {
		try {
			const adapter = this.app.vault.adapter;
			const pluginDir = (this.app as any).plugins.plugins["omni-content"].manifest.dir;
			const scriptPath = `${pluginDir}/frontend/omni-content-react.umd.cjs`;

			logger.info("加载React应用:", scriptPath);
			const scriptContent = await adapter.read(scriptPath);

			// 创建script标签并执行
			const script = document.createElement('script');
			script.textContent = scriptContent;
			document.head.appendChild(script);

			// 加载对应的CSS文件
			await this.loadExternalCSS(pluginDir);

			// 等待一下确保脚本执行完成
			await new Promise(resolve => setTimeout(resolve, 100));

			// 获取全局对象
			this.externalReactLib = (window as any).OmniContentReact ||
				(window as any).OmniContentReactLib ||
				(window as any).omniContentReact;

			if (this.externalReactLib) {
				logger.info("外部React应用加载成功", {
					availableMethods: Object.keys(this.externalReactLib),
					hasMount: typeof this.externalReactLib.mount === 'function',
					hasUpdate: typeof this.externalReactLib.update === 'function',
					hasUnmount: typeof this.externalReactLib.unmount === 'function'
				});
			} else {
				logger.error("找不到外部React应用的全局对象", {
					windowKeys: Object.keys(window).filter(key => key.includes('Omni') || key.includes('React') || key.includes('react')),
					omniContentReact: !!(window as any).OmniContentReact,
					omniContentReactLib: !!(window as any).OmniContentReactLib,
					omniContentReactLowerCase: !!(window as any).omniContentReact
				});
			}
		} catch (error) {
			logger.error("加载外部React应用失败:", error);
			this.loadFallbackComponent();
		}
	}

	private async loadExternalCSS(pluginDir: string) {
		try {
			const cssPath = `${pluginDir}/frontend/style.css`;
			const adapter = this.app.vault.adapter;
			const cssContent = await adapter.read(cssPath);

			// 检查是否已经有这个CSS
			const existingStyle = document.querySelector('style[data-omni-content-react]');
			if (existingStyle) {
				existingStyle.remove();
			}

			// 创建style标签并插入CSS
			const style = document.createElement('style');
			style.setAttribute('data-omni-content-react', 'true');
			style.textContent = cssContent;
			document.head.appendChild(style);

			logger.info("成功加载外部CSS:", cssPath);

		} catch (error) {
			logger.warn("加载外部CSS失败:", error.message);
		}
	}

	private loadFallbackComponent() {
		logger.info("使用回退方案：原始React组件");
		// 这里可以导入原始的React组件作为备用
		// 暂时不实现，仅记录日志
	}

	async onOpen() {
		// 确保React应用已加载
		await this.loadExternalReactApp();

		this.buildUI();
		this.listeners = [this.workspace.on("active-leaf-change", () => this.update()),];

		this.renderMarkdown();
		uevent("open");
	}

	async onClose() {
		this.listeners.forEach((listener) => this.workspace.offref(listener));
		if (this.externalReactLib && this.reactContainer) {
			this.externalReactLib.unmount(this.reactContainer);
		}
		uevent("close");
	}

	async update() {
		LocalImageManager.getInstance().cleanup();
		CardDataManager.getInstance().cleanup();
		this.renderMarkdown();
	}

	async renderMarkdown() {
		this.articleHTML = await this.getArticleContent();
		this.updateExternalReactComponent();
	}

	async renderArticleOnly() {
		this.articleHTML = await this.getArticleContent();
		this.updateExternalReactComponent();
	}

	async copyArticle() {
		const content = await this.getArticleContent();

		// 调试：分析最终的HTML内容
		logger.debug("=== 复制内容分析 ===");
		logger.debug("完整HTML长度:", content.length);

		// 提取代码块部分进行分析
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, "text/html");
		const codeBlocks = doc.querySelectorAll("pre, pre code, section.code-section");

		logger.debug("找到代码块数量:", codeBlocks.length);

		codeBlocks.forEach((block, index) => {
			logger.debug(`--- 代码块 ${index + 1} ---`);
			logger.debug("标签名:", block.tagName);
			logger.debug("类名:", block.className);
			logger.debug("内联样式:", block.getAttribute("style"));
			logger.debug("内容预览:", block.innerHTML.substring(0, 200));
			logger.debug("父元素:", block.parentElement?.tagName, block.parentElement?.className);
			logger.debug("父元素样式:", block.parentElement?.getAttribute("style"));

			// 详细分析换行符
			const html = block.innerHTML;
			const lines = html.split('\n');
			logger.debug("总行数:", lines.length);
			logger.debug("各行内容（带引号显示空行）:");
			lines.forEach((line, i) => {
				if (i < 5) { // 只显示前5行
					logger.debug(`  行${i}: "${line}"`);
				}
			});

			// 检查是否有高亮span元素
			const highlightSpans = block.querySelectorAll('[class*="hljs-"]');
			logger.debug("高亮span数量:", highlightSpans.length);
			if (highlightSpans.length > 0) {
				logger.debug("第一个高亮span:", highlightSpans[0].outerHTML.substring(0, 100));
			}
		});

		// 复制到剪贴板
		await navigator.clipboard.write([new ClipboardItem({
			"text/html": new Blob([content], {type: "text/html"}),
		}),]);

		new Notice(`已复制到剪贴板！`);
	}

	updateCSSVariables() {
		// 在React组件中处理CSS变量更新
		// 首先尝试在React容器中查找
		let noteContainer = this.reactContainer?.querySelector(".note-to-mp") as HTMLElement;
		
		// 如果React容器中没有找到，则在整个document中查找
		if (!noteContainer) {
			noteContainer = document.querySelector(".note-to-mp") as HTMLElement;
		}
		
		if (!noteContainer) {
			logger.warn("找不到 .note-to-mp 容器，无法更新CSS变量");
			return;
		}

		logger.info(`[updateCSSVariables] 当前主题: ${this.settings.defaultStyle}`);

		if (this.settings.enableThemeColor) {
			noteContainer.style.setProperty("--primary-color", this.settings.themeColor || "#7852ee");
			logger.info(`应用自定义主题色：${this.settings.themeColor}`);
		} else {
			noteContainer.style.removeProperty("--primary-color");
			logger.info("恢复使用主题文件中的颜色");
		}

		const listItems = noteContainer.querySelectorAll("li");
		listItems.forEach((item) => {
			(item as HTMLElement).style.display = "list-item";
		});
	}

	wrapArticleContent(article: string): string {
		let className = "note-to-mp";
		let html = `<section class="${className}" id="article-section">${article}</section>`;

		if (this.settings.useTemplate) {
			logger.info("应用模板：", this.settings.defaultTemplate);
			try {
				const templateManager = TemplateManager.getInstance();
				const file = this.app.workspace.getActiveFile();
				const meta: Record<string, string | string[] | number | boolean | object | undefined> = {};
				if (file) {
					const metadata = this.app.metadataCache.getFileCache(file);
					Object.assign(meta, metadata?.frontmatter);
				}
				logger.debug("传递至模板的元数据:", meta);

				html = templateManager.applyTemplate(html, this.settings.defaultTemplate, meta);
			} catch (error) {
				logger.error("应用模板失败", error);
				new Notice("应用模板失败，请检查模板设置！");
			}
		}

		return html;
	}

	async getArticleContent() {
		try {
			const af = this.app.workspace.getActiveFile();
			let md = "";
			if (af && af.extension.toLocaleLowerCase() === "md") {
				md = await this.app.vault.adapter.read(af.path);
				this.title = af.basename;
			} else {
				md = "没有可渲染的笔记或文件不支持渲染";
			}

			if (md.startsWith("---")) {
				md = md.replace(FRONT_MATTER_REGEX, "");
			}

			let articleHTML = await this.markedParser.parse(md);
			articleHTML = this.wrapArticleContent(articleHTML);

			const pluginManager = UnifiedPluginManager.getInstance();
			articleHTML = pluginManager.processContent(articleHTML, this.settings);
			return articleHTML;
		} catch (error) {
			logger.error("获取文章内容时出错:", error);
			return `<div class="error-message">渲染内容时出错: ${error.message}</div>`;
		}
	}

	getCSS() {
		const theme = this.assetsManager.getTheme(this.currentTheme);
		const highlight = this.assetsManager.getHighlight(this.currentHighlight);
		const customCSS = this.settings.useCustomCss ? this.assetsManager.customCSS : "";

		let themeColorCSS = "";

		if (this.settings.enableThemeColor) {
			themeColorCSS = `
:root {
  --primary-color: ${this.settings.themeColor || "#7852ee"};
  --theme-color-light: ${this.settings.themeColor || "#7852ee"}aa;
}
`;
		}

		const highlightCss = highlight?.css || "";
		const themeCss = theme?.css || "";

		return `${themeColorCSS}

${InlineCSS}

${highlightCss}

${themeCss}

${customCSS}`;
	}

	updateElementByID(id: string, html: string): void {
		const el = document.getElementById(id);
		if (el) {
			el.innerHTML = html;
		}
	}

	openDistributionModal(): void {
		// todo: 在React组件中实现分发对话框
	}

	async buildUI() {
		this.container = this.containerEl.children[1];
		this.container.empty();

		// 创建React容器
		this.reactContainer = document.createElement('div');
		this.reactContainer.style.width = '100%';
		this.reactContainer.style.height = '100%';
		this.reactContainer.id = 'omni-content-react-container';
		this.container.appendChild(this.reactContainer);

		logger.info("UI构建完成", {
			containerExists: !!this.container,
			reactContainerExists: !!this.reactContainer,
			reactContainerInDOM: document.contains(this.reactContainer),
			containerChildren: this.container.children.length
		});

		// 渲染外部React组件
		this.updateExternalReactComponent();
	}

	private updateExternalReactComponent() {
		if (!this.externalReactLib || !this.reactContainer) {
			logger.warn("外部React应用未加载或容器不存在", {
				externalReactLib: !!this.externalReactLib,
				reactContainer: !!this.reactContainer
			});

			// 如果没有外部React应用，显示一个简单的错误消息
			if (this.reactContainer) {
				this.reactContainer.innerHTML = `
					<div style="padding: 20px; text-align: center; color: var(--text-muted);">
						<h3>React应用加载失败</h3>
						<p>请检查控制台日志获取更多信息</p>
						<p>插件可能需要重新安装或构建</p>
					</div>
				`;
			}
			return;
		}

		try {
			logger.info("更新外部React组件", {
				articleHTMLLength: this.articleHTML?.length || 0,
				hasCSS: !!this.getCSS(),
				availableMethods: this.externalReactLib ? Object.keys(this.externalReactLib) : [],
				reactContainerInDOM: this.reactContainer ? document.contains(this.reactContainer) : false,
				reactContainerElement: this.reactContainer ? this.reactContainer.tagName : null,
				reactContainerChildren: this.reactContainer ? this.reactContainer.children.length : 0
			});

			// 转换设置对象以适配外部React应用的接口
			const externalSettings = {
				defaultStyle: this.settings.defaultStyle,
				defaultHighlight: this.settings.defaultHighlight,
				defaultTemplate: this.settings.defaultTemplate,
				useTemplate: this.settings.useTemplate,
				lastSelectedTemplate: this.settings.lastSelectedTemplate,
				enableThemeColor: this.settings.enableThemeColor,
				themeColor: this.settings.themeColor,
				useCustomCss: this.settings.useCustomCss,
				authKey: this.settings.authKey,
				wxInfo: this.settings.wxInfo,
				expandedAccordionSections: this.settings.expandedAccordionSections || [],
				showStyleUI: this.settings.showStyleUI !== false, // 默认显示
			};

			// 获取统一插件数据
			const plugins = this.getUnifiedPlugins();

			const props = {
				settings: externalSettings,
				articleHTML: this.articleHTML || "",
				cssContent: this.getCSS(),
				plugins: plugins,
				onRefresh: async () => {
					await this.renderMarkdown();
					uevent("refresh");
				},
				onCopy: async () => {
					await this.copyArticle();
					uevent("copy");
				},
				onDistribute: async () => {
					this.openDistributionModal();
					uevent("distribute");
				},
				onTemplateChange: async (template: string) => {
					if (template === "") {
						this.settings.useTemplate = false;
						this.settings.lastSelectedTemplate = "";
					} else {
						this.settings.useTemplate = true;
						this.settings.defaultTemplate = template;
						this.settings.lastSelectedTemplate = template;
					}
					this.saveSettingsToPlugin();
					await this.renderMarkdown();
				},
				onThemeChange: async (theme: string) => {
					this.settings.defaultStyle = theme;
					this.saveSettingsToPlugin();
					this.updateExternalReactComponent();
				},
				onHighlightChange: async (highlight: string) => {
					this.settings.defaultHighlight = highlight;
					this.saveSettingsToPlugin();
					this.updateExternalReactComponent();
				},
				onThemeColorToggle: async (enabled: boolean) => {
					this.settings.enableThemeColor = enabled;
					this.saveSettingsToPlugin();
					await this.renderMarkdown();
				},
				onThemeColorChange: async (color: string) => {
					this.settings.themeColor = color;
					this.saveSettingsToPlugin();
					await this.renderMarkdown();
				},
				onRenderArticle: async () => {
					await this.renderArticleOnly();
				},
				onSaveSettings: () => {
					this.saveSettingsToPlugin();
				},
				onUpdateCSSVariables: () => {
					this.updateCSSVariables();
				},
				onPluginToggle: (pluginName: string, enabled: boolean) => {
					this.handleUnifiedPluginToggle(pluginName, enabled);
				},
				onPluginConfigChange: (pluginName: string, key: string, value: string | boolean) => {
					this.handleUnifiedPluginConfigChange(pluginName, key, value);
				},
				onExpandedSectionsChange: (sections: string[]) => {
					this.settings.expandedAccordionSections = sections;
					this.saveSettingsToPlugin();
				}
			};

			// 使用外部React应用进行渲染
			this.externalReactLib.update(this.reactContainer, props);
			logger.info("外部React组件更新成功", {
				containerChildrenAfterUpdate: this.reactContainer.children.length,
				containerInnerHTML: this.reactContainer.innerHTML.substring(0, 200) + "..."
			});

		} catch (error) {
			logger.error("更新外部React组件时出错:", error);
			if (this.reactContainer) {
				this.reactContainer.innerHTML = `
					<div style="padding: 20px; text-align: center; color: var(--text-error);">
						<h3>React组件更新失败</h3>
						<p>错误: ${error.message}</p>
						<p>请检查控制台日志获取详细信息</p>
					</div>
				`;
			}
		}
	}

	private getUnifiedPlugins() {
		try {
			const pluginManager = UnifiedPluginManager.getInstance();
			if (!pluginManager) {
				logger.warn("UnifiedPluginManager 实例为空");
				return [];
			}

			const plugins = pluginManager.getPlugins();
			logger.debug(`获取到 ${plugins.length} 个插件`);
			return plugins.map((plugin: any) => {
				let description = '';
				if (plugin.getMetadata && plugin.getMetadata().description) {
					description = plugin.getMetadata().description;
				} else if (plugin.getPluginDescription) {
					description = plugin.getPluginDescription();
				}

				// 将新的类型映射回React组件期望的类型（按照标准remark/rehype概念）
				const pluginType = plugin.getType ? plugin.getType() : 'unknown';
				const mappedType = pluginType === 'html' ? 'rehype' : pluginType === 'markdown' ? 'remark' : pluginType;

				const pluginData = {
					name: plugin.getName ? plugin.getName() : 'Unknown Plugin',
					type: mappedType,
					description: description,
					enabled: plugin.isEnabled ? plugin.isEnabled() : true,
					config: plugin.getConfig ? plugin.getConfig() : {},
					metaConfig: plugin.getMetaConfig ? plugin.getMetaConfig() : {}
				};

				logger.debug(`插件数据: ${pluginData.name} (${pluginType} -> ${mappedType})`);
				return pluginData;
			});
		} catch (error) {
			logger.warn("无法获取统一插件数据:", error);
			return [];
		}
	}

	private handleUnifiedPluginToggle(pluginName: string, enabled: boolean) {
		try {
			const pluginManager = UnifiedPluginManager.getInstance();
			if (pluginManager) {
				const plugin = pluginManager.getPlugins().find((p: any) =>
					p.getName && p.getName() === pluginName
				);
				if (plugin && plugin.setEnabled) {
					plugin.setEnabled(enabled);
					this.saveSettingsToPlugin();
					this.renderMarkdown();
					logger.info(`已${enabled ? '启用' : '禁用'}插件: ${pluginName}`);
				}
			}
		} catch (error) {
			logger.error("切换插件状态失败:", error);
		}
	}

	private handleUnifiedPluginConfigChange(pluginName: string, key: string, value: string | boolean) {
		try {
			const pluginManager = UnifiedPluginManager.getInstance();
			if (pluginManager) {
				const plugin = pluginManager.getPlugins().find((p: any) =>
					p.getName && p.getName() === pluginName
				);
				if (plugin && plugin.updateConfig) {
					plugin.updateConfig({[key]: value});
					this.saveSettingsToPlugin();
					this.renderMarkdown();
					logger.info(`已更新插件 ${pluginName} 的配置: ${key} = ${value}`);
				}
			}
		} catch (error) {
			logger.error("更新插件配置失败:", error);
		}
	}

	private saveSettingsToPlugin(): void {
		uevent("save-settings");
		const plugin = (this.app as any).plugins.plugins["omni-content"];
		if (plugin) {
			logger.debug("正在保存设置到持久化存储");
			plugin.saveSettings();
		}
	}
}
