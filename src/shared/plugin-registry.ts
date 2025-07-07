import { UnifiedPluginManager, PluginType } from "./unified-plugin-system";
import { logger } from "src/utils";

import { CalloutRenderer } from "src/rehype-plugins/callouts";
import { LocalFile } from "src/rehype-plugins/local-file";
import { CodeHighlight } from "src/rehype-plugins/code-highlight";
import { EmbedBlockMark } from "src/rehype-plugins/embed-block-mark";
import { SVGIcon } from "src/rehype-plugins/icons";
import { LinkRenderer } from "src/rehype-plugins/link";
import { FootnoteRenderer } from "src/rehype-plugins/footnote";
import { TextHighlight } from "src/rehype-plugins/text-highlight";
import { CodeRenderer } from "src/rehype-plugins/code";
import { MathRenderer } from "src/rehype-plugins/math";

import { Images } from "src/remark-plugins/images";
import { Blockquotes } from "src/remark-plugins/blockquotes";
import { CodeBlocks } from "src/remark-plugins/code-blocks";
import { Headings } from "src/remark-plugins/headings";
import { Lists } from "src/remark-plugins/lists";
import { Styles } from "src/remark-plugins/styles";
import { Tables } from "src/remark-plugins/tables";
import { WechatLink } from "src/remark-plugins/wechat-link";



import { NMPSettings } from "src/settings";
import { App } from "obsidian";
import AssetsManager from "src/assets";

/**
 * 插件注册器 - 统一管理所有插件的注册
 */
export class PluginRegistry {
    private static instance: PluginRegistry;
    private pluginManager: UnifiedPluginManager;
    
    private constructor() {
        this.pluginManager = UnifiedPluginManager.getInstance();
    }
    
    public static getInstance(): PluginRegistry {
        if (!PluginRegistry.instance) {
            PluginRegistry.instance = new PluginRegistry();
        }
        return PluginRegistry.instance;
    }
    
    /**
     * 注册所有Remark插件（HTML后处理）
     */
    public registerRemarkPlugins(): void {
        logger.info("正在注册Remark插件...");
        
        const remarkPlugins = [
            new Images(),
            new Blockquotes(false),
            new CodeBlocks(),
            new Headings(),
            new Lists(),
            new Styles(),
            new Tables(),
            new WechatLink(),
        ];
        
        this.pluginManager.registerPlugins(remarkPlugins as any);
        logger.info(`Remark插件注册完成，共注册了 ${remarkPlugins.length} 个插件`);
    }
    
    /**
     * 注册所有Rehype插件（Markdown解析扩展）
     */
    public registerRehypePlugins(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: any): void {
        logger.info("正在注册Rehype插件...");
        
        const rehypePlugins = [
            new CalloutRenderer(app, settings, assetsManager, callback),
            new LocalFile(app, settings, assetsManager, callback),
            new CodeHighlight(app, settings, assetsManager, callback),
            new EmbedBlockMark(app, settings, assetsManager, callback),
            new SVGIcon(app, settings, assetsManager, callback),
            new LinkRenderer(app, settings, assetsManager, callback),
            new FootnoteRenderer(app, settings, assetsManager, callback),
            new TextHighlight(app, settings, assetsManager, callback),
            new CodeRenderer(app, settings, assetsManager, callback),
        ];

        // 只有在有效授权key时才添加MathRenderer
        if (settings.isAuthKeyVaild()) {
            rehypePlugins.push(new MathRenderer(app, settings, assetsManager, callback));
        }
        
        this.pluginManager.registerPlugins(rehypePlugins as any);
        logger.info(`Rehype插件注册完成，共注册了 ${rehypePlugins.length} 个插件`);
    }
    
    /**
     * 注册所有插件
     */
    public registerAllPlugins(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: any): void {
        logger.info("开始注册所有插件...");
        
        // 先注册不需要额外参数的Remark插件（HTML后处理）
        this.registerRemarkPlugins();
        
        // 再注册需要额外参数的Rehype插件（Markdown解析扩展）
        this.registerRehypePlugins(app, settings, assetsManager, callback);
        
        const totalPlugins = this.pluginManager.getPlugins().length;
        const remarkCount = this.pluginManager.getRemarkPlugins().length;
        const rehypeCount = this.pluginManager.getRehypePlugins().length;
        
        logger.info(`所有插件注册完成！总计：${totalPlugins}个，其中 Remark：${remarkCount}个，Rehype：${rehypeCount}个`);
    }
    
    /**
     * 获取插件管理器
     */
    public getPluginManager(): UnifiedPluginManager {
        return this.pluginManager;
    }
}

/**
 * 初始化插件系统的便捷函数
 */
let isInitialized = false;
export function initializePluginSystem(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: any): UnifiedPluginManager {
    const registry = PluginRegistry.getInstance();
    
    if (!isInitialized) {
        registry.registerAllPlugins(app, settings, assetsManager, callback);
        isInitialized = true;
        logger.debug("插件系统初始化完成");
    } else {
        logger.debug("插件系统已初始化，跳过重复初始化");
    }
    
    return registry.getPluginManager();
}
