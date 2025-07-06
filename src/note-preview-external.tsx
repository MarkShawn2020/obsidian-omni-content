import {apiVersion, EventRef, ItemView, Notice, TFile, WorkspaceLeaf,} from "obsidian";
import {FRONT_MATTER_REGEX, VIEW_TYPE_NOTE_PREVIEW} from "src/constants";

import AssetsManager from "./assets";
import InlineCSS from "./inline-css";
import {CardDataManager} from "./rehype-plugins/code-blocks";
import {MDRendererCallback} from "./remark-plugins/extension";
import {LocalImageManager} from "./remark-plugins/local-file";
import {MarkedParser} from "./remark-plugins/parser";
import {initializePlugins, PluginManager} from "./rehype-plugins";
import {ExtensionManager} from "./remark-plugins/extension-manager";
import {NMPSettings} from "./settings";
import TemplateManager from "./template-manager";
import {logger, uevent} from "./utils";
import {DraftArticle, wxBatchGetMaterial, wxGetToken, wxUploadImage,} from "./weixin-api";

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
	currentAppId: string;
	markedParser: MarkedParser;
	listeners: EventRef[];
	externalReactLib: ExternalReactLib | null = null;
	reactContainer: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.settings = NMPSettings.getInstance();
		this.assetsManager = AssetsManager.getInstance();
		this.markedParser = new MarkedParser(this.app, this);

		initializePlugins();
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
			// 直接从插件目录读取文件
			const adapter = this.app.vault.adapter;
			const pluginDir = (this.app as any).plugins.plugins["omni-content"].manifest.dir;
			
			// 尝试多个可能的路径
			const possiblePaths = [
				`${pluginDir}/src/assets/omni-content-react.umd.cjs`,
				`.obsidian/plugins/omni-content/src/assets/omni-content-react.umd.cjs`,
				`src/assets/omni-content-react.umd.cjs`
			];
			
			let scriptContent = null;
			let actualPath = null;
			
			for (const path of possiblePaths) {
				try {
					logger.info("尝试路径:", path);
					scriptContent = await adapter.read(path);
					actualPath = path;
					break;
				} catch (e) {
					logger.warn("路径不存在:", path, e.message);
				}
			}
			
			if (!scriptContent) {
				throw new Error("无法找到React应用文件");
			}
			
			logger.info("成功从以下路径加载React应用:", actualPath);
			
			// 创建script标签并执行
			const script = document.createElement('script');
			script.textContent = scriptContent;
			document.head.appendChild(script);
			
			// 等待一下确保脚本执行完成
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// 获取全局对象 - 检查多种可能的全局变量名
			this.externalReactLib = (window as any).OmniContentReact || 
									(window as any).OmniContentReactLib ||
									(window as any).omniContentReact;
			
			if (this.externalReactLib) {
				logger.info("外部React应用加载成功");
			} else {
				logger.error("找不到外部React应用的全局对象，可用的全局变量:", Object.keys(window).filter(key => key.includes('Omni') || key.includes('React')));
			}
		} catch (error) {
			logger.error("加载外部React应用失败:", error);
			// 回退方案：使用原始的React组件
			this.loadFallbackComponent();
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

	errorContent(error: any) {
		return ("<h1>渲染失败!</h1><br/>" + '如需帮助请前往&nbsp;&nbsp;<a href="https://github.com/sunbooshi/omni-content/issues">https://github.com/sunbooshi/omni-content/issues</a>&nbsp;&nbsp;反馈<br/><br/>' + "如果方便，请提供引发错误的完整Markdown内容。<br/><br/>" + "<br/>Obsidian版本：" + apiVersion + "<br/>错误信息：<br/>" + `${error}`);
	}

	async renderMarkdown() {
		this.articleHTML = await this.getArticleContent();
		this.updateExternalReactComponent();
	}

	async renderArticleOnly() {
		this.markedParser.buildMarked();
		this.articleHTML = await this.getArticleContent();
		this.updateExternalReactComponent();
		logger.debug("仅渲染文章内容，跳过工具栏更新");
	}

	async copyArticle() {
		const content = await this.getArticleContent();

		// 调试：分析最终的HTML内容
		console.log("=== 复制内容分析 ===");
		console.log("完整HTML长度:", content.length);

		// 提取代码块部分进行分析
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, "text/html");
		const codeBlocks = doc.querySelectorAll("pre, pre code, section.code-section");

		console.log("找到代码块数量:", codeBlocks.length);

		codeBlocks.forEach((block, index) => {
			console.log(`--- 代码块 ${index + 1} ---`);
			console.log("标签名:", block.tagName);
			console.log("类名:", block.className);
			console.log("内联样式:", block.getAttribute("style"));
			console.log("内容预览:", block.innerHTML.substring(0, 200));
			console.log("父元素:", block.parentElement?.tagName, block.parentElement?.className);
			console.log("父元素样式:", block.parentElement?.getAttribute("style"));

			// 详细分析换行符
			const html = block.innerHTML;
			const lines = html.split('\n');
			console.log("总行数:", lines.length);
			console.log("各行内容（带引号显示空行）:");
			lines.forEach((line, i) => {
				if (i < 5) { // 只显示前5行
					console.log(`  行${i}: "${line}"`);
				}
			});

			// 检查是否有高亮span元素
			const highlightSpans = block.querySelectorAll('[class*="hljs-"]');
			console.log("高亮span数量:", highlightSpans.length);
			if (highlightSpans.length > 0) {
				console.log("第一个高亮span:", highlightSpans[0].outerHTML.substring(0, 100));
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
		const noteContainer = document.querySelector(".note-to-mp") as HTMLElement;
		if (!noteContainer) {
			console.log("找不到.note-to-mp容器，无法更新CSS变量");
			return;
		}

		if (this.settings.enableThemeColor) {
			noteContainer.style.setProperty("--primary-color", this.settings.themeColor || "#7852ee");
			console.log(`应用自定义主题色：${this.settings.themeColor}`);
		} else {
			noteContainer.style.removeProperty("--primary-color");
			console.log("恢复使用主题文件中的颜色");
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

			const pluginManager = PluginManager.getInstance();
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

	// 其他方法保持不变，仅列出关键的几个
	getMetadata() {
		let res: DraftArticle = {
			title: "",
			author: undefined,
			digest: undefined,
			content: "",
			content_source_url: undefined,
			cover: undefined,
			thumb_media_id: "",
			need_open_comment: undefined,
			only_fans_can_comment: undefined,
			pic_crop_235_1: undefined,
			pic_crop_1_1: undefined,
		};
		const file = this.app.workspace.getActiveFile();
		if (!file) return res;
		const metadata = this.app.metadataCache.getFileCache(file);
		if (metadata?.frontmatter) {
			const frontmatter = metadata.frontmatter;
			res.title = frontmatter["标题"];
			res.author = frontmatter["作者"];
			res.digest = frontmatter["摘要"];
			res.content_source_url = frontmatter["原文地址"];
			res.cover = frontmatter["封面"];
			res.thumb_media_id = frontmatter["封面素材ID"];
			res.need_open_comment = frontmatter["打开评论"] ? 1 : undefined;
			res.only_fans_can_comment = frontmatter["仅粉丝可评论"] ? 1 : undefined;
			if (frontmatter["封面裁剪"]) {
				res.pic_crop_235_1 = "0_0_1_0.5";
				res.pic_crop_1_1 = "0_0.525_0.404_1";
			}
		}
		return res;
	}

	async uploadVaultCover(name: string, token: string) {
		const LocalFileRegex = /^!\[\[(.*?)\]\]/;
		const matches = name.match(LocalFileRegex);
		let fileName = "";
		if (matches && matches.length > 1) {
			fileName = matches[1];
		} else {
			fileName = name;
		}
		const vault = this.app.vault;
		const file = this.assetsManager.searchFile(fileName) as TFile;
		if (!file) {
			throw new Error("找不到封面文件: " + fileName);
		}
		const fileData = await vault.readBinary(file);

		return await this.uploadCover(new Blob([fileData]), file.name, token);
	}

	async uploadLocalCover(token: string) {
		// 这个功能在React版本中需要重新实现
		throw new Error("本地封面上传功能需要在React组件中重新实现");
	}

	async uploadCover(data: Blob, filename: string, token: string) {
		const res = await wxUploadImage(data, filename, token, "image");
		if (res.media_id) {
			return res.media_id;
		}
		console.error("upload cover fail: " + res.errmsg);
		throw new Error("上传封面失败: " + res.errmsg);
	}

	async getDefaultCover(token: string) {
		const res = await wxBatchGetMaterial(token, "image");
		if (res.item_count > 0) {
			return res.item[0].media_id;
		}
		return "";
	}

	async getToken() {
		const res = await wxGetToken(this.settings.authKey, this.currentAppId, this.getSecret() || "");
		if (res.status != 200) {
			const data = res.json;
			// 通过React组件显示消息
			return "";
		}
		const token = res.json.token;
		if (token === "") {
			// 通过React组件显示消息
		}
		return token;
	}

	getSecret() {
		for (const wx of this.settings.wxInfo) {
			if (wx.appid === this.currentAppId) {
				return wx.secret.replace("SECRET", "");
			}
		}
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
		this.container.appendChild(this.reactContainer);

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
				availableMethods: this.externalReactLib ? Object.keys(this.externalReactLib) : []
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

		// 获取插件和扩展数据
		const extensions = this.getExtensionsData();
		const plugins = this.getPluginsData();

		const props = {
			settings: externalSettings,
			articleHTML: this.articleHTML || "",
			cssContent: this.getCSS(),
			extensions: extensions,
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
			onExtensionToggle: (extensionName: string, enabled: boolean) => {
				this.handleExtensionToggle(extensionName, enabled);
			},
			onPluginToggle: (pluginName: string, enabled: boolean) => {
				this.handlePluginToggle(pluginName, enabled);
			}
		};

		// 使用外部React应用进行渲染
		this.externalReactLib.update(this.reactContainer, props);
		logger.info("外部React组件更新成功");
		
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

	private getExtensionsData() {
		try {
			const extensionManager = ExtensionManager.getInstance();
			if (!extensionManager) return [];
			
			const extensions = extensionManager.getExtensions();
			return extensions.map((ext: any) => ({
				name: ext.getName ? ext.getName() : 'Unknown Extension',
				description: ext.getDescription ? ext.getDescription() : '',
				enabled: ext.isEnabled ? ext.isEnabled() : true,
				settings: ext.getSettings ? ext.getSettings() : {}
			}));
		} catch (error) {
			logger.warn("无法获取扩展数据:", error);
			return [];
		}
	}

	private getPluginsData() {
		try {
			const pluginManager = PluginManager.getInstance();
			if (!pluginManager) return [];
			
			const plugins = pluginManager.getPlugins();
			return plugins.map((plugin: any) => ({
				name: plugin.getName ? plugin.getName() : 'Unknown Plugin',
				description: plugin.getDescription ? plugin.getDescription() : '',
				enabled: plugin.isEnabled ? plugin.isEnabled() : true,
				settings: plugin.getSettings ? plugin.getSettings() : {}
			}));
		} catch (error) {
			logger.warn("无法获取插件数据:", error);
			return [];
		}
	}

	private handleExtensionToggle(extensionName: string, enabled: boolean) {
		try {
			const extensionManager = ExtensionManager.getInstance();
			if (extensionManager) {
				const extension = extensionManager.getExtensions().find((ext: any) => 
					ext.getName && ext.getName() === extensionName
				);
				if (extension && extension.setEnabled) {
					extension.setEnabled(enabled);
					this.saveSettingsToPlugin();
					this.renderMarkdown();
				}
			}
		} catch (error) {
			logger.error("切换扩展状态失败:", error);
		}
	}

	private handlePluginToggle(pluginName: string, enabled: boolean) {
		try {
			const pluginManager = PluginManager.getInstance();
			if (pluginManager) {
				const plugin = pluginManager.getPlugins().find((p: any) => 
					p.getName && p.getName() === pluginName
				);
				if (plugin && plugin.setEnabled) {
					plugin.setEnabled(enabled);
					this.saveSettingsToPlugin();
					this.renderMarkdown();
				}
			}
		} catch (error) {
			logger.error("切换插件状态失败:", error);
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