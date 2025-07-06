import {apiVersion, EventRef, ItemView, Notice, TFile, WorkspaceLeaf,} from "obsidian";
import {FRONT_MATTER_REGEX, VIEW_TYPE_NOTE_PREVIEW} from "src/constants";

import AssetsManager from "./assets";
import InlineCSS from "./inline-css";
import {CardDataManager} from "./rehype-plugins/code-blocks";
import {MDRendererCallback} from "./remark-plugins/extension";
import {LocalImageManager} from "./remark-plugins/local-file";
import {MarkedParser} from "./remark-plugins/parser";
import {initializePlugins, PluginManager} from "./rehype-plugins";
import {NMPSettings} from "./settings";
import TemplateManager from "./template-manager";
import {logger, uevent} from "./utils";
import {DraftArticle, wxBatchGetMaterial, wxGetToken, wxUploadImage,} from "./weixin-api";

export class NotePreviewDebug extends ItemView implements MDRendererCallback {
	container: Element;
	settings: NMPSettings;
	assetsManager: AssetsManager;
	articleHTML: string;
	title: string;
	currentAppId: string;
	markedParser: MarkedParser;
	listeners: EventRef[];

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
		return "笔记预览 (Debug)";
	}

	async onOpen() {
		this.buildUI();
		this.listeners = [this.workspace.on("active-leaf-change", () => this.update()),];

		this.renderMarkdown();
		uevent("open");
	}

	async onClose() {
		this.listeners.forEach((listener) => this.workspace.offref(listener));
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
		this.updateUI();
	}

	async renderArticleOnly() {
		this.markedParser.buildMarked();
		this.articleHTML = await this.getArticleContent();
		this.updateUI();
		logger.debug("仅渲染文章内容，跳过工具栏更新");
	}

	updateUI() {
		const container = this.containerEl.children[1] as HTMLElement;
		if (!container) return;

		container.innerHTML = `
			<div style="display: flex; flex-direction: row; height: 100%; width: 100%; overflow: hidden;">
				<!-- 左侧渲染区域 -->
				<div style="flex: 1; padding: 10px; overflow: auto; border-right: 1px solid var(--background-modifier-border);">
					<style>${this.getCSS()}</style>
					<div class="note-preview-content">${this.articleHTML || ""}</div>
				</div>
				
				<!-- 右侧工具栏 -->
				<div style="flex: 0 0 300px; padding: 10px; background: var(--background-secondary-alt); overflow-y: auto;">
					<h3>调试工具栏</h3>
					<button id="debug-refresh" style="margin: 5px; padding: 10px;">刷新</button>
					<button id="debug-copy" style="margin: 5px; padding: 10px;">复制</button>
					<div style="margin-top: 20px;">
						<p><strong>当前主题:</strong> ${this.settings.defaultStyle}</p>
						<p><strong>高亮样式:</strong> ${this.settings.defaultHighlight}</p>
						<p><strong>文章长度:</strong> ${this.articleHTML?.length || 0}</p>
					</div>
					<div style="margin-top: 20px;">
						<h4>测试外部React加载</h4>
						<button id="test-react-load" style="margin: 5px; padding: 10px;">测试React加载</button>
						<div id="react-test-result" style="margin-top: 10px; padding: 10px; border: 1px solid var(--background-modifier-border);"></div>
					</div>
				</div>
			</div>
		`;

		// 绑定事件
		const refreshBtn = container.querySelector('#debug-refresh') as HTMLButtonElement;
		const copyBtn = container.querySelector('#debug-copy') as HTMLButtonElement;
		const testReactBtn = container.querySelector('#test-react-load') as HTMLButtonElement;

		refreshBtn?.addEventListener('click', () => {
			this.renderMarkdown();
			new Notice('已刷新!');
		});

		copyBtn?.addEventListener('click', () => {
			this.copyArticle();
		});

		testReactBtn?.addEventListener('click', () => {
			this.testReactLoad();
		});

		this.updateCSSVariables();
	}

	async testReactLoad() {
		const resultDiv = document.querySelector('#react-test-result') as HTMLElement;
		if (!resultDiv) return;

		resultDiv.innerHTML = '<p>正在测试React加载...</p>';

		try {
			// 获取插件根目录路径
			const adapter = this.app.vault.adapter;
			const pluginDir = (this.app as any).plugins.plugins["omni-content"].manifest.dir;
			
			resultDiv.innerHTML += `<p>插件目录: ${pluginDir}</p>`;
			
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
					resultDiv.innerHTML += `<p>尝试路径: ${path}</p>`;
					scriptContent = await adapter.read(path);
					actualPath = path;
					resultDiv.innerHTML += `<p style="color: green;">✓ 成功读取文件: ${path}</p>`;
					break;
				} catch (e) {
					resultDiv.innerHTML += `<p style="color: red;">✗ 失败: ${path} - ${e.message}</p>`;
				}
			}
			
			if (scriptContent) {
				resultDiv.innerHTML += `<p>文件大小: ${scriptContent.length} 字符</p>`;
				
				// 尝试执行脚本
				const script = document.createElement('script');
				script.textContent = scriptContent;
				document.head.appendChild(script);
				
				// 等待一下确保脚本执行完成
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// 检查全局对象
				const globalVars = Object.keys(window).filter(key => 
					key.includes('Omni') || key.includes('React')
				);
				
				resultDiv.innerHTML += `<p>全局变量: ${globalVars.join(', ')}</p>`;
				
				const omniContentReact = (window as any).OmniContentReact;
				if (omniContentReact) {
					resultDiv.innerHTML += `<p style="color: green;">✓ OmniContentReact 已加载</p>`;
					resultDiv.innerHTML += `<p>可用方法: ${Object.keys(omniContentReact).join(', ')}</p>`;
				} else {
					resultDiv.innerHTML += `<p style="color: red;">✗ OmniContentReact 未找到</p>`;
				}
			} else {
				resultDiv.innerHTML += `<p style="color: red;">未能加载React应用文件</p>`;
			}
		} catch (error) {
			resultDiv.innerHTML += `<p style="color: red;">错误: ${error.message}</p>`;
		}
	}

	async copyArticle() {
		const content = await this.getArticleContent();

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
		
		// 简单地渲染调试UI
		this.updateUI();
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