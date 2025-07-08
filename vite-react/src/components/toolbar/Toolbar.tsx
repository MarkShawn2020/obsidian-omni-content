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
	onCopy: () => void;
	onDistribute: () => void;
	onTemplateChange: (template: string) => void;
	onThemeChange: (theme: string) => void;
	onHighlightChange: (highlight: string) => void;
	onThemeColorToggle: (enabled: boolean) => void;
	onThemeColorChange: (color: string) => void;
	onSaveSettings: () => void;
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
	onExpandedSectionsChange?: (sections: string[]) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
													settings,
													plugins,
													onCopy,
													onDistribute,
													onTemplateChange,
													onThemeChange,
													onHighlightChange,
													onThemeColorToggle,
													onThemeColorChange,
													onSaveSettings,
													onPluginToggle,
													onPluginConfigChange,
													onExpandedSectionsChange,
												}) => {
	// 分离样式设置和插件管理的状态管理
	const [styleExpandedSections, setStyleExpandedSections] = useState<string[]>(
		settings.expandedAccordionSections.filter(section => section.startsWith('accordion-样式设置'))
	);
	const [pluginExpandedSections, setPluginExpandedSections] = useState<string[]>(
		settings.expandedAccordionSections.filter(section => !section.startsWith('accordion-样式设置'))
	);

	// 当外部settings发生变化时，同步更新本地状态
	useEffect(() => {
		const allSections = settings.expandedAccordionSections;
		setStyleExpandedSections(allSections.filter(section => section.startsWith('accordion-样式设置')));
		setPluginExpandedSections(allSections.filter(section => !section.startsWith('accordion-样式设置')));
	}, [settings.expandedAccordionSections]);

	// 样式设置的手风琴变化处理
	const handleStyleAccordionChange = (value: string | undefined) => {
		const newSections = value ? [value] : [];
		
		// 更新样式设置的本地状态
		setStyleExpandedSections(newSections);

		// 合并样式设置和插件管理的状态
		const allSections = [...newSections, ...pluginExpandedSections];
		
		// 通过回调函数更新外部settings
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(allSections);
		}
		onSaveSettings();
	};

	// 分离不同类型的插件
	const remarkPlugins = plugins.filter(plugin => plugin.type === 'remark');
	const rehypePlugins = plugins.filter(plugin => plugin.type === 'rehype');

	return (
		<div className="h-full flex flex-col bg-white">
			<BrandSection onCopy={onCopy} onDistribute={onDistribute}/>

			<div className="flex-1 overflow-y-auto">
				<div className="p-4 space-y-3">
					{/* 样式设置独立的手风琴 */}
					{settings.showStyleUI && (
						<Accordion
							type="single"
							value={styleExpandedSections[0] || ""}
							onValueChange={handleStyleAccordionChange}
							collapsible
							className="w-full space-y-2"
						>
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
						</Accordion>
					)}

					{/* 插件管理独立的手风琴 */}
					<Accordion
						type="single"
						value={pluginExpandedSections[0] || ""}
						onValueChange={(value) => {
							const newSections = value ? [value] : [];
							
							// 更新插件管理的本地状态
							setPluginExpandedSections(newSections);

							// 合并样式设置和插件管理的状态
							const allSections = [...styleExpandedSections, ...newSections];
							
							// 通过回调函数更新外部settings
							if (onExpandedSectionsChange) {
								onExpandedSectionsChange(allSections);
							}
							onSaveSettings();
						}}
						collapsible
						className="w-full space-y-2"
					>
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
														expandedSections={pluginExpandedSections}
														onToggle={(sectionId, isExpanded) => {
															// ConfigComponent 内部的 Accordion 切换，使用插件管理的独立状态
															let newSections: string[];
															if (isExpanded) {
																newSections = pluginExpandedSections.includes(sectionId)
																	? pluginExpandedSections
																	: [...pluginExpandedSections, sectionId];
															} else {
																newSections = pluginExpandedSections.filter(id => id !== sectionId);
															}
															setPluginExpandedSections(newSections);
															
															// 合并样式设置和插件管理的状态
															const allSections = [...styleExpandedSections, ...newSections];
															if (onExpandedSectionsChange) {
																onExpandedSectionsChange(allSections);
															}
															onSaveSettings();
														}}
														onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
														onConfigChange={async (pluginName, key, value) => {
															logger.debug(`[Toolbar] Remark插件配置变更: ${pluginName}.${key} = ${value}`);

															if (onPluginConfigChange) {
																try {
																	const result = onPluginConfigChange(pluginName, key, value) as any;
																	if (result && typeof result?.then === 'function') {
																		await result;
																	}
																	logger.debug(`[Toolbar] Remark插件配置更新完成: ${pluginName}.${key}`);
																} catch (error) {
																	console.error(`[Toolbar] Remark插件配置更新失败:`, error);
																}
															}
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
														expandedSections={pluginExpandedSections}
														onToggle={(sectionId, isExpanded) => {
															// ConfigComponent 内部的 Accordion 切换，使用插件管理的独立状态
															let newSections: string[];
															if (isExpanded) {
																newSections = pluginExpandedSections.includes(sectionId)
																	? pluginExpandedSections
																	: [...pluginExpandedSections, sectionId];
															} else {
																newSections = pluginExpandedSections.filter(id => id !== sectionId);
															}
															setPluginExpandedSections(newSections);
															
															// 合并样式设置和插件管理的状态
															const allSections = [...styleExpandedSections, ...newSections];
															if (onExpandedSectionsChange) {
																onExpandedSectionsChange(allSections);
															}
															onSaveSettings();
														}}
														onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
														onConfigChange={async (pluginName, key, value) => {
															logger.debug(`[Toolbar] Rehype插件配置变更: ${pluginName}.${key} = ${value}`);

															if (onPluginConfigChange) {
																try {
																	const result = onPluginConfigChange(pluginName, key, value) as any;
																	if (result && typeof result?.then === 'function') {
																		await result;
																	}
																	logger.debug(`[Toolbar] Rehype插件配置更新完成: ${pluginName}.${key}`);
																} catch (error) {
																	console.error(`[Toolbar] Rehype插件配置更新失败:`, error);
																}
															}
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
};
