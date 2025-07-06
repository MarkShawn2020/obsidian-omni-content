import {Marked} from "marked";
import {App, Vault} from "obsidian";
import {NMPSettings} from "src/settings";
import AssetsManager from "../assets";
import {logger} from "src/utils";
import {UnifiedPluginManager, IRehypePlugin} from "src/shared/unified-plugin-system";
import {initializePluginSystem} from "src/shared/plugin-registry";
import {FootnoteRenderer} from "./footnote";

export interface MDRendererCallback {
	settings: NMPSettings;
	updateElementByID(id: string, html: string): void;
}

const markedOptions = {
	gfm: true,
	breaks: true,
	mangle: false,   // 禁用自动检测并转换邮箱地址为链接
};

const customRenderer = {
	heading(text: string, level: number, raw: string): string {
		// ignore IDs
		return `<h${level}><span class="prefix"></span><span class="content">${text}</span><span class="suffix"></span></h${level}>`;
	},

	hr(): string {
		return "<hr>";
	},

};

export class MarkedParser {
	marked: Marked;
	app: App;
	vault: Vault;
	private pluginManager: UnifiedPluginManager;

	constructor(app: App, callback: MDRendererCallback) {
		this.app = app;
		this.vault = app.vault;

		const settings = NMPSettings.getInstance();
		const assetsManager = AssetsManager.getInstance();

		// 初始化统一插件系统
		this.pluginManager = initializePluginSystem(app, settings, assetsManager, callback);

		const rehypePlugins = this.pluginManager.getRehypePlugins();
		logger.debug(`初始化了 ${rehypePlugins.length} 个markdown扩展插件`);
	}

	/**
	 * 获取所有已注册的扩展插件
	 * @returns 扩展插件数组
	 */
	getExtensions(): IRehypePlugin[] {
		return this.pluginManager.getRehypePlugins();
	}

	/**
	 * 获取所有启用的扩展插件
	 * @returns 启用的扩展插件数组
	 */
	getEnabledExtensions(): IRehypePlugin[] {
		return this.pluginManager.getRehypePlugins().filter(ext => ext.isEnabled());
	}

	/**
	 * 根据名称获取扩展插件
	 * @param name 插件名称
	 * @returns 扩展插件实例或null
	 */
	getExtensionByName(name: string): IRehypePlugin | null {
		return this.pluginManager.getRehypePlugins().find(ext => ext.getName() === name) || null;
	}

	/**
	 * 设置扩展插件启用状态
	 * @param name 插件名称
	 * @param enabled 是否启用
	 * @returns 是否成功设置
	 */
	setExtensionEnabled(name: string, enabled: boolean): boolean {
		const extension = this.getExtensionByName(name);
		if (extension) {
			extension.setEnabled(enabled);
			logger.debug(`${enabled ? '启用' : '禁用'}了扩展插件: ${name}`);
			return true;
		}
		logger.warn(`未找到扩展插件: ${name}`);
		return false;
	}

	async buildMarked() {
		this.marked = new Marked();
		this.marked.use(markedOptions);

		// 只对启用的扩展应用marked扩展
		const enabledExtensions = this.getEnabledExtensions();
		const allExtensions = this.getExtensions();
		logger.debug(`构建marked实例，使用 ${enabledExtensions.length}/${allExtensions.length} 个启用的扩展插件`);

		for (const ext of enabledExtensions) {
			this.marked.use(ext.markedExtension());
			// 设置marked实例到插件中
			if ('marked' in ext) {
				(ext as any).marked = this.marked;
			}
			await ext.prepare();
		}
		this.marked.use({renderer: customRenderer});
	}

	async prepare() {
		// 只对启用的扩展执行prepare
		const enabledExtensions = this.getEnabledExtensions();
		for (const ext of enabledExtensions) {
			await ext.prepare();
		}
	}

	async postprocess(html: string) {
		let result = html;
		// 只对启用的扩展执行postprocess
		const enabledExtensions = this.getEnabledExtensions();
		for (const ext of enabledExtensions) {
			result = await ext.postprocess(result);
		}
		return result;
	}

	async parse(content: string) {
		if (!this.marked) await this.buildMarked();
		await this.prepare();

		// 预处理 Markdown 内容，处理脚注定义
		let processedContent = content;
		const footnoteRenderer = this.getExtensions().find(ext => ext.getName() === 'FootnoteRenderer') as FootnoteRenderer | undefined;
		if (footnoteRenderer && 'preprocessText' in footnoteRenderer) {
			processedContent = (footnoteRenderer as any).preprocessText(content);
		}

		// 解析处理后的内容
		let html = await this.marked.parse(processedContent);
		html = await this.postprocess(html);

		// 如果有脚注处理器，在发布前确保脚注引用正确
		if (footnoteRenderer && 'beforePublish' in footnoteRenderer) {
			await (footnoteRenderer as any).beforePublish();
		}

		return html;
	}
}
