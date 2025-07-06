import {BaseProcess} from "src/rehype-plugins/base-process";
import {NMPSettings} from "src/settings";
import {logger} from "src/utils";

/**
 * 图片处理插件 - 处理微信公众号中的图片格式
 */
export class Images extends BaseProcess {
	getName(): string {
		return "图片处理插件";
	}

	process(html: string, settings: NMPSettings): string {
		// 微信公众号图片需要特定处理
		// 1. 添加data-src属性
		// 2. 确保图片有正确的样式和对齐方式
		// 3. 根据设置控制caption显示
		try {
			logger.info("图片处理插件开始处理，showImageCaption设置:", settings.showImageCaption);
			logger.info("处理前的HTML片段:", html.substring(0, 500) + "...");
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			// 查找所有图片元素
			const images = doc.querySelectorAll("img");
			logger.info("找到图片数量:", images.length);

			images.forEach((img, index) => {
				const src = img.getAttribute("src");
				const alt = img.getAttribute("alt");
				const title = img.getAttribute("title");
				
				logger.info(`处理第${index + 1}张图片:`, {
					src: src?.substring(0, 50) + "...",
					alt,
					title,
					outerHTML: img.outerHTML.substring(0, 100) + "..."
				});

				if (src) {
					// 设置data-src属性，微信编辑器需要
					img.setAttribute("data-src", src);

					// 设置图片默认样式
					if (!img.hasAttribute("style")) {
						img.setAttribute(
							"style",
							"max-width: 100%; height: auto;"
						);
					}

					// 确保图片居中显示
					const parent = img.parentElement;
					if (parent && parent.tagName !== "CENTER") {
						parent.style.textAlign = "center";
					}

					// 处理图片说明文字
					const figureParent = img.closest("figure");
					let figcaption = null;
					if (figureParent) {
						figcaption = figureParent.querySelector("figcaption");
					}
					
					logger.info(`第${index + 1}张图片父元素信息:`, {
						parentTagName: parent?.tagName,
						hasFigureParent: !!figureParent,
						hasFigcaption: !!figcaption,
						figcaptionText: figcaption?.textContent
					});

					if (!settings.showImageCaption) {
						logger.info(`隐藏第${index + 1}张图片的说明文字`);
						// 移除alt属性以隐藏说明文字
						img.removeAttribute("alt");
						img.removeAttribute("title");
						
						// 查找并移除可能的caption元素
						if (figcaption) {
							figcaption.remove();
							logger.info(`移除了第${index + 1}张图片的figcaption`);
						}
					} else {
						logger.info(`保持第${index + 1}张图片的说明文字显示`);
						
						// 如果有alt属性但没有figcaption，创建caption显示
						if (alt && alt.trim() && !figcaption) {
							logger.info(`为第${index + 1}张图片创建可见的caption`);
							
							// 创建一个caption元素显示在图片下方
							const captionDiv = doc.createElement("div");
							captionDiv.style.cssText = "text-align: center; color: #666; font-size: 14px; margin-top: 8px; font-style: italic;";
							captionDiv.textContent = alt;
							
							// 将caption插入到图片后面
							if (parent) {
								parent.insertBefore(captionDiv, img.nextSibling);
							}
						}
					}
				}
			});
			
			const result = doc.body.innerHTML;
			logger.info("图片处理完成，结果长度:", result.length);
			logger.info("处理后的HTML片段:", result.substring(0, 500) + "...");
			return result;
		} catch (error) {
			logger.error("处理图片时出错:", error);
			return html;
		}
	}
}
