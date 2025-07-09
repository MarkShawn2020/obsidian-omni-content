import hljs from "highlight.js";
import {MarkedExtension} from "marked";
import {markedHighlight} from "marked-highlight";
import {CodeRenderer} from "./code";
import {MarkdownPlugin as UnifiedMarkdownPlugin} from "src/shared/unified-plugin-system";
import {logger} from "../logger";

export class CodeHighlight extends UnifiedMarkdownPlugin {
	getPluginName(): string {
		return "CodeHighlight";
	}

	getPluginDescription(): string {
		return "代码语法高亮处理，使用highlight.js为代码块添加语法着色";
	}

	markedExtension(): MarkedExtension {
		return markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang, info) {
				logger.debug("CodeHighlight处理代码:", {lang, codePreview: code.substring(0, 100)});

				const type = CodeRenderer.getMathType(lang)
				if (type) return code;
				if (lang && lang.trim().toLocaleLowerCase() == 'mpcard') return code;
				if (lang && lang.trim().toLocaleLowerCase() == 'mermaid') return code;
				if (lang && lang.startsWith('ad-')) return code;

				// 如果启用了微信代码格式化，跳过高亮处理
				if (this.settings && this.settings.enableWeixinCodeFormat) {
					logger.debug("微信代码格式化已启用，跳过高亮处理");
					return code;
				}

				if (lang && hljs.getLanguage(lang)) {
					try {
						const result = hljs.highlight(code, {language: lang});
						logger.debug("CodeHighlight生成高亮HTML:", result.value.substring(0, 200));
						return result.value;
					} catch (err) {
						logger.warn("语法高亮失败:", err);
					}
				}

				try {
					const result = hljs.highlightAuto(code);
					logger.debug("CodeHighlight自动高亮HTML:", result.value.substring(0, 200));
					return result.value;
				} catch (err) {
					logger.warn("自动高亮失败:", err);
				}

				return ''; // use external default escaping
			}
		})
	}
}
