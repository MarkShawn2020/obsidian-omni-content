import { logger } from "src/utils";

/**
 * 基础插件管理器 - 提供通用的单例模式实现
 */
export abstract class BasePluginManager<T> {
	/**
	 * 私有构造函数，确保单例模式
	 */
	protected constructor() {
		logger.debug(`初始化${this.getManagerName()}管理器`);
	}

	/**
	 * 获取管理器名称 - 子类必须实现
	 */
	protected getManagerName() {
		return "插件"
	}
}

/**
 * 插件配置管理mixin - 提供通用的配置管理功能
 */
export interface IPluginConfigurable {
	/**
	 * 获取插件配置
	 */
	getConfig(): any;

	/**
	 * 更新插件配置
	 */
	updateConfig(config: any): any;

	/**
	 * 获取插件配置的元数据
	 */
	getMetaConfig(): any;

	/**
	 * 检查插件是否启用
	 */
	isEnabled(): boolean;

	/**
	 * 设置插件启用状态
	 */
	setEnabled(enabled: boolean): void;
}
