import {Blockquotes} from "src/rehype-plugins/blockquotes";
import {logger} from "../utils";
import {CodeBlocks} from "./code-blocks";
import {Headings} from "./headings";
import {Images} from "./images";
import {Lists} from "./lists";
import {RemarkPluginManager} from "./remark-plugin-manager";
import {Styles} from "./styles";
import {Tables} from "./tables";
import {WechatLink} from "./wechat-link";

/**
 * 初始化并注册所有处理插件
 */
export function initializePlugins(): void {
	logger.info("正在初始化内容处理插件...");

	const pluginManager = RemarkPluginManager.getInstance();

	// 注册所有可用的插件
	pluginManager.registerPlugins([
		new Images(),
		new WechatLink(),
		new Headings(),
		new Lists(),
		new CodeBlocks(),
		new Tables(),
		new Styles(),
		new Blockquotes(false),
	]);

	logger.info(`插件初始化完成，共注册了 ${pluginManager.getPlugins().length} 个插件`);
}

// 导出插件管理器和所有插件类型
export {RemarkPluginManager} from "./remark-plugin-manager";
export {RemarkPlugin} from "./remark-plugin";
export type {IRemarkPlugin, RemarkPluginMetaConfig} from "./remark-plugin";

