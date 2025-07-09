import {HtmlPlugin as UnifiedHtmlPlugin} from "src/shared/unified-plugin-system";
import {NMPSettings} from "src/settings";
import {Notice} from "obsidian";
import {wxUploadImage} from "../weixin-api";
import {logger} from "../logger";

/**
 * 微信公众号卡片数据管理器
 */
export class CardDataManager {
	private static instance: CardDataManager;
	private cardData: Map<string, string>;

	private constructor() {
		this.cardData = new Map<string, string>();
	}

	// 静态方法，用于获取实例
	public static getInstance(): CardDataManager {
		if (!CardDataManager.instance) {
			CardDataManager.instance = new CardDataManager();
		}
		return CardDataManager.instance;
	}

	public setCardData(id: string, cardData: string) {
		this.cardData.set(id, cardData);
	}

	public cleanup() {
		this.cardData.clear();
	}

	public restoreCard(html: string) {
		for (const [key, value] of this.cardData.entries()) {
			const exp = `<section[^>]*\\sdata-id="${key}"[^>]*>(.*?)<\\/section>`;
			const regex = new RegExp(exp, "gs");
			if (!regex.test(html)) {
				console.error("未能正确替换公众号卡片");
			}
			html = html.replace(regex, value);
		}
		return html;
	}
}

const MermaidSectionClassName = "note-mermaid";
const MermaidImgClassName = "note-mermaid-img";

/**
 * 代码块处理插件 - 处理微信公众号中的代码格式和行号显示
 */
export class CodeBlocks extends UnifiedHtmlPlugin {
	/**
	 * 将base64图片转换为Blob对象
	 * @param src base64图片数据
	 * @returns Blob对象
	 */
	static srcToBlob(src: string): Blob {
		const base64 = src.split(",")[1];
		const byteCharacters = atob(base64);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		return new Blob([byteArray], {type: "image/png"});
	}

	/**
	 * 上传Mermaid图片到微信公众号
	 * @param root HTML根元素
	 * @param token 微信API令牌
	 */
	static async uploadMermaidImages(root: HTMLElement, token: string): Promise<void> {
		const imgs = root.querySelectorAll("." + MermaidImgClassName);
		for (let img of imgs) {
			const src = img.getAttribute("src");
			if (!src) continue;
			if (src.startsWith("http")) continue;
			const blob = CodeBlocks.srcToBlob(img.getAttribute("src")!);
			const name = img.id + ".png";
			const res = await wxUploadImage(blob, name, token);
			if (res.errcode != 0) {
				const msg = `上传图片失败: ${res.errcode} ${res.errmsg}`;
				new Notice(msg);
				console.error(msg);
				continue;
			}
			const url = res.url;
			img.setAttribute("src", url);
		}
	}

	getPluginName(): string {
		return "代码块处理插件";
	}

	getPluginDescription(): string {
		return "代码块样式优化，支持行号显示和Mermaid图表处理，将图表转换为图片用于微信公众号";
	}

	/**
	 * 获取插件配置的元数据
	 * @returns 插件配置的元数据
	 */
	getMetaConfig() {
		return {
			codeWrap: {
				type: "switch" as const,
				title: "代码换行"
			}
		};
	}

	process(html: string, settings: NMPSettings): string {
		try {
			// 首先处理微信公众号卡片恢复
			html = CardDataManager.getInstance().restoreCard(html);

			// 如果启用了微信代码格式化，跳过此插件的其他处理
			if (settings.enableWeixinCodeFormat) {
				logger.debug("微信代码格式化已启用，跳过代码块处理插件");
				return html;
			}

			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			// 查找所有代码块
			const codeBlocks = doc.querySelectorAll("pre code");

			// 获取代码换行配置
			const enableCodeWrap = this.getCodeWrapConfig();

			codeBlocks.forEach((codeBlock) => {
				const pre = codeBlock.parentElement;
				if (!pre) return;

				// 为Obsidian内部渲染优化代码块
				this.optimizeForObsidianDisplay(pre, codeBlock as HTMLElement, settings.lineNumber, enableCodeWrap);
			});

			return doc.body.innerHTML;
		} catch (error) {
			logger.error("处理代码块时出错:", error);
			return html;
		}
	}

	/**
	 * 获取代码换行配置
	 * @returns 是否启用代码换行
	 */
	private getCodeWrapConfig(): boolean {
		return this.getConfig().codeWrap as boolean ?? false; // 默认为false（不换行）
	}

	/**
	 * 为Obsidian内部渲染优化代码块
	 * @param pre pre元素
	 * @param codeElement 代码元素
	 * @param showLineNumbers 是否显示行号
	 * @param enableWrap 是否启用换行
	 */
	private optimizeForObsidianDisplay(pre: HTMLElement, codeElement: HTMLElement, showLineNumbers: boolean, enableWrap: boolean): void {
		// 应用基础样式，适合Obsidian内部显示
		this.applyObsidianStyles(pre, codeElement);

		// 处理行号显示（仅在Obsidian内部显示）
		if (showLineNumbers) {
			this.addObsidianLineNumbers(codeElement);
		}

		// 检查是否有高亮标记，转换为内联样式
		const hasHighlight = codeElement.classList.contains('hljs') ||
			codeElement.innerHTML.includes('<span class="hljs-') ||
			codeElement.innerHTML.includes('class="hljs-');

		if (hasHighlight) {
			this.convertHighlightToInlineStyles(codeElement);
		}

		// 应用换行设置
		this.applyWrapSettings(pre, codeElement, enableWrap);

		// 添加标记以便复制时识别
		pre.setAttribute('data-code-block', 'true');
		pre.setAttribute('data-language', this.extractLanguage(codeElement));
		pre.setAttribute('data-wrap-enabled', enableWrap.toString());
	}

	/**
	 * 转换为微信原生代码格式
	 * @param pre pre元素
	 * @param codeElement 代码元素
	 * @param showLineNumbers 是否显示行号
	 * @param enableWrap 是否启用换行
	 */
	private convertToWeixinNativeFormat(pre: HTMLElement, codeElement: HTMLElement, showLineNumbers: boolean, enableWrap: boolean): void {
		// 获取代码内容
		let content = codeElement.innerHTML;
		
		// 清理内容
		content = content.replace(/^\n+/, '').replace(/\n+$/, '');
		
		// 检查是否有高亮标记
		const hasHighlight = codeElement.classList.contains('hljs') ||
			content.includes('<span class="hljs-') ||
			content.includes('class="hljs-');

		if (hasHighlight) {
			// 转换高亮样式为内联样式
			this.convertHighlightToInlineStyles(codeElement);
			content = codeElement.innerHTML;
		}

		// 分割行
		const lines = content.split('\n');
		
		// 创建微信原生格式的代码块
		const wrapClass = enableWrap ? 'code-snippet' : 'code-snippet_nowrap';
		const lang = this.extractLanguage(codeElement);
		
		let codeElements: string[] = [];
		
		lines.forEach((line, index) => {
			let lineContent = line.trim() === '' ? '<br class="ProseMirror-trailingBreak">' : line;
			
			if (showLineNumbers) {
				const lineNumber = index + 1;
				lineContent = `<span style="color: #999; display: inline-block; width: 2em; text-align: right; padding-right: 1em; margin-right: 1em; border-right: 1px solid #ddd;">${lineNumber}</span>${lineContent}`;
			}
			
			codeElements.push(`<code><span leaf="">${lineContent}</span></code>`);
		});
		
		// 创建新的HTML结构
		const newHtml = `<section class="code-snippet__js"><pre class="code-snippet__js code-snippet ${wrapClass}" data-lang="${lang}">${codeElements.join('')}</pre></section>`;
		
		// 替换原来的pre元素
		pre.outerHTML = newHtml;
	}

	/**
	 * 提取语言标识
	 * @param codeElement 代码元素
	 * @returns 语言标识
	 */
	private extractLanguage(codeElement: HTMLElement): string {
		const classList = codeElement.classList;
		for (const className of classList) {
			if (className.startsWith('language-')) {
				return className.replace('language-', '');
			}
		}
		return 'text';
	}

	/**
	 * 应用Obsidian内部显示样式
	 * @param pre pre元素
	 * @param codeElement 代码元素
	 */
	private applyObsidianStyles(pre: HTMLElement, codeElement: HTMLElement): void {
		// 为Obsidian内部显示应用样式
		pre.style.background = "var(--code-background)";
		pre.style.padding = "12px";
		pre.style.margin = "0";
		pre.style.fontSize = "14px";
		pre.style.lineHeight = "1.5";
		pre.style.color = "var(--code-normal)";
		pre.style.fontFamily = "var(--font-monospace)";
		pre.style.borderRadius = "4px";
		pre.style.border = "1px solid var(--background-modifier-border)";
		
		// 代码元素样式
		codeElement.style.background = "transparent";
		codeElement.style.padding = "0";
		codeElement.style.margin = "0";
		codeElement.style.fontSize = "inherit";
		codeElement.style.lineHeight = "inherit";
		codeElement.style.color = "inherit";
		codeElement.style.fontFamily = "inherit";
	}

	/**
	 * 添加Obsidian内部显示的行号
	 * @param codeElement 代码元素
	 */
	private addObsidianLineNumbers(codeElement: HTMLElement): void {
		let content = codeElement.innerHTML;
		
		// 移除开头和结尾的换行符
		content = content.replace(/^\n+/, '').replace(/\n+$/, '');
		
		const lines = content.split("\n");
		
		const numberedLines = lines
			.map((line, index) => {
				const lineNumber = index + 1;
				return `<span style="color: var(--text-faint); display: inline-block; width: 2.5em; text-align: right; padding-right: 1em; margin-right: 0.5em; border-right: 1px solid var(--background-modifier-border); user-select: none;">${lineNumber}</span>${line}`;
			})
			.join("\n");

		codeElement.innerHTML = numberedLines;
	}

	/**
	 * 添加行号
	 * @param codeElement 代码元素
	 */
	private addLineNumbers(codeElement: HTMLElement): void {
		let content = codeElement.innerHTML;
		
		// 移除开头和结尾的换行符
		content = content.replace(/^\n+/, '').replace(/\n+$/, '');
		
		const lines = content.split("\n");
		
		const numberedLines = lines
			.map((line, index) => {
				const lineNumber = index + 1;
				return `<span style="color: #999; display: inline-block; width: 2em; text-align: right; padding-right: 1em; margin-right: 1em; border-right: 1px solid #ddd;">${lineNumber}</span>${line}`;
			})
			.join("\n");

		codeElement.innerHTML = numberedLines;
	}

	/**
	 * 应用换行设置
	 * @param pre pre元素
	 * @param codeElement 代码元素
	 * @param enableWrap 是否启用换行
	 */
	private applyWrapSettings(pre: HTMLElement, codeElement: HTMLElement, enableWrap: boolean): void {
		if (enableWrap) {
			// 启用换行的样式
			pre.style.whiteSpace = "pre-wrap";
			pre.style.wordBreak = "break-all";
			pre.style.overflowX = "visible";
			pre.style.wordWrap = "break-word";
			
			codeElement.style.whiteSpace = "pre-wrap";
			codeElement.style.wordBreak = "break-all";
			codeElement.style.overflowX = "visible";
			codeElement.style.wordWrap = "break-word";
		} else {
			// 禁用换行的样式 - 强制不换行
			pre.style.whiteSpace = "pre";
			pre.style.wordBreak = "normal";
			pre.style.overflowX = "auto";
			pre.style.wordWrap = "normal";
			pre.style.overflowWrap = "normal";
			
			codeElement.style.whiteSpace = "pre";
			codeElement.style.wordBreak = "normal";
			codeElement.style.overflowX = "auto";
			codeElement.style.wordWrap = "normal";
			codeElement.style.overflowWrap = "normal";
		}
	}

	/**
	 * 将highlight.js的类样式转换为微信原生代码高亮类
	 * @param codeElement 代码元素
	 */
	private convertHighlightToInlineStyles(codeElement: HTMLElement): void {
		// highlight.js类到微信原生类的映射
		const hljs_to_weixin_map: Record<string, string> = {
			'hljs-comment': 'code-snippet__comment',
			'hljs-quote': 'code-snippet__comment',
			'hljs-keyword': 'code-snippet__keyword',
			'hljs-selector-tag': 'code-snippet__keyword',
			'hljs-addition': 'code-snippet__addition',
			'hljs-number': 'code-snippet__number',
			'hljs-string': 'code-snippet__string',
			'hljs-meta': 'code-snippet__meta',
			'hljs-literal': 'code-snippet__literal',
			'hljs-doctag': 'code-snippet__doctag',
			'hljs-regexp': 'code-snippet__regexp',
			'hljs-title': 'code-snippet__title',
			'hljs-section': 'code-snippet__section',
			'hljs-name': 'code-snippet__name',
			'hljs-selector-id': 'code-snippet__selector-id',
			'hljs-selector-class': 'code-snippet__selector-class',
			'hljs-attribute': 'code-snippet__attribute',
			'hljs-attr': 'code-snippet__attr',
			'hljs-variable': 'code-snippet__variable',
			'hljs-template-variable': 'code-snippet__template-variable',
			'hljs-type': 'code-snippet__type',
			'hljs-symbol': 'code-snippet__symbol',
			'hljs-bullet': 'code-snippet__bullet',
			'hljs-built_in': 'code-snippet__built_in',
			'hljs-builtin-name': 'code-snippet__builtin-name',
			'hljs-link': 'code-snippet__link',
			'hljs-emphasis': 'code-snippet__emphasis',
			'hljs-strong': 'code-snippet__strong',
			'hljs-formula': 'code-snippet__formula',
			'hljs-punctuation': 'code-snippet__punctuation',
		};

		// 查找所有包含hljs类的span元素
		const highlightSpans = codeElement.querySelectorAll('[class*="hljs-"]');

		highlightSpans.forEach((span: Element) => {
			const htmlSpan = span as HTMLElement;
			const classes = htmlSpan.className.split(/\s+/);
			let newClasses: string[] = [];

			// 转换hljs类为微信原生类
			for (const className of classes) {
				if (className.startsWith('hljs-')) {
					const weixinClass = hljs_to_weixin_map[className];
					if (weixinClass) {
						newClasses.push(weixinClass);
					}
				} else {
					newClasses.push(className);
				}
			}

			// 更新类名
			htmlSpan.className = newClasses.join(' ');
		});

		logger.debug(`转换了 ${highlightSpans.length} 个高亮元素为微信原生类`);

		// 优化空格和缩进处理
		this.preserveIndentation(codeElement);
	}

	/**
	 * 优化代码中的空格和缩进处理，保持微信编辑器的兼容性
	 * @param codeElement 代码元素
	 */
	private preserveIndentation(codeElement: HTMLElement): void {
		// 获取当前HTML内容
		let html = codeElement.innerHTML;

		// 只处理行首的空格缩进，保持其他格式不变
		html = html.replace(/^( {2,})/gm, (match) => {
			return '&nbsp;'.repeat(match.length);
		});

		// 处理tab缩进
		html = html.replace(/^\t+/gm, (match) => {
			return '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(match.length);
		});

		// 保持原有的换行符，不强制转换为<br>
		codeElement.innerHTML = html;

		logger.debug("已优化缩进处理，保持格式兼容性");
	}

	/**
	 * 将HTML中的代码块转换为微信格式（复制时调用）
	 * @param html HTML内容
	 * @returns 转换后的微信格式HTML
	 */
	static convertToWeixinFormat(html: string): string {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");

		// 查找所有标记为代码块的元素
		const codeBlocks = doc.querySelectorAll('pre[data-code-block="true"]');

		codeBlocks.forEach((pre) => {
			const codeElement = pre.querySelector('code');
			if (!codeElement) return;

			const language = pre.getAttribute('data-language') || 'text';
			const enableWrap = pre.getAttribute('data-wrap-enabled') === 'true';

			// 克隆代码元素以避免修改原始DOM
			const clonedCode = codeElement.cloneNode(true) as HTMLElement;
			
			// 移除所有行号span元素
			const lineNumberSpans = clonedCode.querySelectorAll('span[style*="user-select: none"]');
			lineNumberSpans.forEach(span => span.remove());
			
			// 获取处理后的内容
			let content = clonedCode.innerHTML;
			
			// 清理内容
			content = content.replace(/^\n+/, '').replace(/\n+$/, '');
			
			// 分割行并保留缩进
			const lines = content.split('\n');
			
			// 创建微信原生格式的代码块
			const wrapClass = enableWrap ? 'code-snippet' : 'code-snippet_nowrap';
			
			const codeElements = lines.map(line => {
				if (line.trim() === '') {
					return `<code><span leaf=""><br class="ProseMirror-trailingBreak"></span></code>`;
				}
				
				// 保留缩进：将行首的空格转换为&nbsp;
				const processedLine = this.preserveIndentationForWeixin(line);
				return `<code><span leaf="">${processedLine}</span></code>`;
			});
			
			// 创建新的HTML结构
			const newHtml = `<section class="code-snippet__js"><pre class="code-snippet__js code-snippet ${wrapClass}" data-lang="${language}">${codeElements.join('')}</pre></section>`;
			
			// 替换原来的pre元素
			pre.outerHTML = newHtml;
		});

		return doc.body.innerHTML;
	}

	/**
	 * 为微信格式保留缩进
	 * @param line 代码行
	 * @returns 处理后的代码行
	 */
	private static preserveIndentationForWeixin(line: string): string {
		// 匹配行首的空格和Tab，并转换为&nbsp;
		return line.replace(/^([ \t]+)/, (match) => {
			return match.replace(/ /g, '&nbsp;').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
		});
	}

}
