import React, {useEffect, useState} from "react";
import {BrandSection} from "./BrandSection";
import {ActionButtons} from "./ActionButtons";
import {StyleSettings} from "./StyleSettings";
import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "../ui/accordion";
import {ConfigComponent} from "./PluginConfigComponent";
import {UnifiedPluginData, ViteReactSettings} from "../../types";

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
	onRenderArticle: () => void;
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
													onRenderArticle,
													onSaveSettings,
													onPluginToggle,
													onPluginConfigChange,
													onExpandedSectionsChange,
												}) => {
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

	return (
		<div className="preview-toolbar modern-toolbar h-full flex flex-col">
			{/* 品牌区域 */}
			<BrandSection onCopy={onCopy} onDistribute={onDistribute}/>

			{/* 工具栏内容 */}
			<div className="toolbar-container flex-1 overflow-y-auto">
				<div className="toolbar-content toolbar-vertical p-3 space-y-2">

					{/* 手风琴容器 */}
					<Accordion
						type="single"
						value={expandedSections[0] || ""}
						onValueChange={handleAccordionChange}
						collapsible
						className="accordion-container w-full flex flex-col gap-1"
					>
						{/* 样式设置 */}
						{settings.showStyleUI && (
							<AccordionItem value="accordion-样式设置" className="border border-border/50 rounded-lg">
								<AccordionTrigger className="px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
									<div className="flex items-center gap-2">
										<div className="w-2 h-2 bg-red-500 rounded-full"></div>
										样式设置
									</div>
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4">
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

						{/* 统一插件管理 */}
						<AccordionItem value="accordion-plugins" className="border border-border/50 rounded-lg">
							<AccordionTrigger className="px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
									插件管理
									<span className="text-xs text-muted-foreground">({plugins.length})</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4">
							<div className="plugins-container w-full space-y-4">
								{plugins.length > 0 ? (
									<>
										{/* Remark 插件部分 */}
										{remarkPlugins.length > 0 && (
											<div className="plugin-section">
												<div className="flex items-center gap-2 mb-3">
													<div className="w-1 h-4 bg-green-500 rounded-full"></div>
													<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
														Remark 插件
													</h4>
													<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
														{remarkPlugins.length}
													</span>
												</div>
												<div className="space-y-2">
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

										{/* Rehype 插件部分 */}
										{rehypePlugins.length > 0 && (
											<div className="plugin-section">
												<div className="flex items-center gap-2 mb-3">
													<div className="w-1 h-4 bg-purple-500 rounded-full"></div>
													<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
														Rehype 插件
													</h4>
													<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
														{rehypePlugins.length}
													</span>
												</div>
												<div className="space-y-2">
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
									<div className="flex items-center justify-center py-8">
										<p className="text-sm text-muted-foreground">未找到任何插件</p>
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
