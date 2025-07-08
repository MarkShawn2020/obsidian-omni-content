import React, {useEffect, useState} from "react";
import {BrandSection} from "./BrandSection";
import {StyleSettings} from "./StyleSettings";
import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "../ui/accordion";
import {ConfigComponent} from "./PluginConfigComponent";
import {UnifiedPluginData, ViteReactSettings} from "../../types";
import { logger } from "../../../../src/logger";

interface ToolbarProps {
	settings: ViteReactSettings;
	plugins: UnifiedPluginData[];
	onRefresh: () => void;
	onCopy: () => void;
	onDistribute: () => void;
	onTemplateChange: (template: string) => void;
	onThemeChange: (theme: string) => void;
	onHighlightChange: (highlight: string) => void;
	onThemeColorToggle: (enabled: boolean) => void;
	onThemeColorChange: (color: string) => void;
	onRenderArticle: () => void;
	onSaveSettings: () => void;
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
	onExpandedSectionsChange?: (sections: string[]) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
													settings,
													plugins,
													onRefresh,
													onCopy,
													onDistribute,
													onTemplateChange,
													onThemeChange,
													onHighlightChange,
													onThemeColorToggle,
													onThemeColorChange,
													onRenderArticle,
													onSaveSettings,
													onPluginToggle,
													onPluginConfigChange,
													onExpandedSectionsChange,
												}) => {
	logger.info("[Toolbar] 完整工具栏开始渲染", {
		pluginsCount: plugins?.length || 0,
		settingsKeys: Object.keys(settings || {}),
		showStyleUI: settings?.showStyleUI,
		expandedSections: settings?.expandedAccordionSections
	});

	// 使用本地状态管理展开的sections
	const [expandedSections, setExpandedSections] = useState<string[]>(settings.expandedAccordionSections);

	// 当外部settings发生变化时，同步更新本地状态
	useEffect(() => {
		setExpandedSections([...settings.expandedAccordionSections]);
	}, [settings.expandedAccordionSections]);

	const handleAccordionChange = (value: string | undefined) => {
		const newSections = value ? [value] : [];
		
		// 更新本地状态
		setExpandedSections(newSections);

		// 通过回调函数更新外部settings
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(newSections);
		}
		onSaveSettings();
	};

	// 分离不同类型的插件
	const remarkPlugins = plugins.filter(plugin => plugin.type === 'remark');
	const rehypePlugins = plugins.filter(plugin => plugin.type === 'rehype');

	try {
		return (
			<div className="h-full flex flex-col bg-white" style={{
				border: '1px solid #ccc' // 保留调试边框但更subtle
			}}>
				<BrandSection onCopy={onCopy} onDistribute={onDistribute}/>

				<div className="flex-1 overflow-y-auto">
					<div className="p-4 space-y-3">
						<Accordion
							type="single"
							value={expandedSections[0] || ""}
							onValueChange={handleAccordionChange}
							collapsible
							className="w-full space-y-2"
						>
							{settings.showStyleUI && (
								<AccordionItem value="accordion-样式设置" className="border-b border-gray-200">
									<AccordionTrigger className="px-0 py-3 text-sm font-medium hover:no-underline">
										样式设置
									</AccordionTrigger>
									<AccordionContent className="px-0 pb-3">
										<StyleSettings
											settings={settings}
											onTemplateChange={onTemplateChange}
											onThemeChange={onThemeChange}
											onHighlightChange={onHighlightChange}
											onThemeColorToggle={onThemeColorToggle}
											onThemeColorChange={onThemeColorChange}
										/>
									</AccordionContent>
								</AccordionItem>
							)}

							<AccordionItem value="accordion-plugins" className="border-b border-gray-200">
								<AccordionTrigger className="px-0 py-3 text-sm font-medium hover:no-underline">
									插件管理 ({plugins.length})
								</AccordionTrigger>
								<AccordionContent className="px-0 pb-3">
								<div className="w-full space-y-6">
									{plugins.length > 0 ? (
										<>
											{remarkPlugins.length > 0 && (
												<div>
													<h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
														Remark 插件 ({remarkPlugins.length})
													</h4>
													<div className="space-y-1">
														{remarkPlugins.map((plugin) => (
														<ConfigComponent
															key={plugin.name}
															item={plugin}
															type="plugin"
															expandedSections={expandedSections}
															onToggle={(sectionId, isExpanded) => {
																// ConfigComponent 内部的 Accordion 切换，这里暂时保持原有逻辑
																let newSections: string[];
																if (isExpanded) {
																	newSections = expandedSections.includes(sectionId)
																		? expandedSections
																		: [...expandedSections, sectionId];
																} else {
																	newSections = expandedSections.filter(id => id !== sectionId);
																}
																setExpandedSections(newSections);
																if (onExpandedSectionsChange) {
																	onExpandedSectionsChange(newSections);
																}
																onSaveSettings();
															}}
															onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
															onConfigChange={async (pluginName, key, value) => {
																console.log(`[Toolbar] Remark插件配置变更: ${pluginName}.${key} = ${value}`);

																if (onPluginConfigChange) {
																	try {
																		const result = onPluginConfigChange(pluginName, key, value) as any;
																		if (result && typeof result?.then === 'function') {
																			await result;
																		}
																		console.log(`[Toolbar] Remark插件配置更新完成: ${pluginName}.${key}`);
																	} catch (error) {
																		console.error(`[Toolbar] Remark插件配置更新失败:`, error);
																	}
																}

																setTimeout(() => {
																	console.log(`[Toolbar] 触发重新渲染: ${pluginName}.${key}`);
																	onRenderArticle();
																}, 200);
															}}
														/>
													))}
													</div>
												</div>
											)}

											{rehypePlugins.length > 0 && (
												<div>
													<h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
														Rehype 插件 ({rehypePlugins.length})
													</h4>
													<div className="space-y-1">
														{rehypePlugins.map((plugin) => (
														<ConfigComponent
															key={plugin.name}
															item={plugin}
															type="plugin"
															expandedSections={expandedSections}
															onToggle={(sectionId, isExpanded) => {
																// ConfigComponent 内部的 Accordion 切换，这里暂时保持原有逻辑
																let newSections: string[];
																if (isExpanded) {
																	newSections = expandedSections.includes(sectionId)
																		? expandedSections
																		: [...expandedSections, sectionId];
																} else {
																	newSections = expandedSections.filter(id => id !== sectionId);
																}
																setExpandedSections(newSections);
																if (onExpandedSectionsChange) {
																	onExpandedSectionsChange(newSections);
																}
																onSaveSettings();
															}}
															onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
															onConfigChange={async (pluginName, key, value) => {
																console.log(`[Toolbar] Rehype插件配置变更: ${pluginName}.${key} = ${value}`);

																if (onPluginConfigChange) {
																	try {
																		const result = onPluginConfigChange(pluginName, key, value) as any;
																		if (result && typeof result?.then === 'function') {
																			await result;
																		}
																		console.log(`[Toolbar] Rehype插件配置更新完成: ${pluginName}.${key}`);
																	} catch (error) {
																		console.error(`[Toolbar] Rehype插件配置更新失败:`, error);
																	}
																}

																setTimeout(() => {
																	console.log(`[Toolbar] 触发重新渲染: ${pluginName}.${key}`);
																	onRenderArticle();
																}, 200);
															}}
														/>
													))}
													</div>
												</div>
											)}
										</>
									) : (
										<div className="text-center py-8">
											<p className="text-sm text-gray-500">未找到任何插件</p>
										</div>
									)}
								</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>
				</div>
			</div>
		);
	} catch (error) {
		logger.error("[Toolbar] 完整工具栏渲染错误:", error);
		return (
			<div className="h-full flex flex-col bg-white p-4">
				<div className="text-red-500">
					<h3>完整工具栏渲染失败</h3>
					<p>错误信息: {error instanceof Error ? error.message : String(error)}</p>
				</div>
			</div>
		);
	}
};