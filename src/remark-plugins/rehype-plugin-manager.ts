import {RehypePlugin} from "./rehype-plugin";
import {MarkedParser} from "./parser";
import {logger} from "src/utils";

/**
 * Extension管理器 - 为remark扩展系统提供类似rehype插件管理器的功能
 */
export class RehypePluginManager {
	private static instance: RehypePluginManager;
	private parser: MarkedParser | null = null;

	/**
	 * 私有构造函数，确保单例模式
	 */
	private constructor() {
		logger.debug("初始化Extension管理器");
	}

	/**
	 * 获取管理器单例
	 * @returns Extension管理器实例
	 */
	public static getInstance(): RehypePluginManager {
		if (!RehypePluginManager.instance) {
			RehypePluginManager.instance = new RehypePluginManager();
		}
		return RehypePluginManager.instance;
	}

	/**
	 * 设置MarkedParser实例
	 * @param parser MarkedParser实例
	 */
	public setParser(parser: MarkedParser): void {
		this.parser = parser;
		logger.debug("设置MarkedParser实例到Extension管理器");
	}

	/**
	 * 获取所有已注册的扩展插件
	 * @returns 扩展插件数组
	 */
	public getExtensions(): RehypePlugin[] {
		if (!this.parser) {
			logger.warn("MarkedParser实例未设置");
			return [];
		}
		return this.parser.getExtensions();
	}


}
