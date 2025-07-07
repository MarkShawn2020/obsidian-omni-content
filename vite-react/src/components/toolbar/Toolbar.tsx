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
		<div
			className="preview-toolbar modern-toolbar"
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				overflow: "hidden",
			}}
		>
			{/* 品牌区域 */}
			<BrandSection onCopy={onCopy} onDistribute={onDistribute}/>

			{/* 工具栏内容 */}
			<div
				className="toolbar-container"
				style={{flex: "1", overflowY: "auto"}}
			>
				<div
					className="toolbar-content toolbar-vertical"
					style={{
						display: "flex",
						flexDirection: "column",
						padding: "10px",
					}}
				>

					{/* 手风琴容器 */}
					<Accordion
						type="single"
						value={expandedSections[0] || ""}
						onValueChange={handleAccordionChange}
						collapsible
						className="accordion-container"
						style={{
							width: "100%",
							display: "flex",
							flexDirection: "column",
							gap: "5px",
						}}
					>
						{/* 样式设置 */}
						{settings.showStyleUI && (
							<AccordionItem value="accordion-样式设置">
								<AccordionTrigger className="!text-red-500">样式设置</AccordionTrigger>
								<AccordionContent>
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
						<AccordionItem value="accordion-plugins">
							<AccordionTrigger>插件管理</AccordionTrigger>
							<AccordionContent>
							<div className="plugins-container" style={{width: "100%"}}>
								{plugins.length > 0 ? (
									<>
										{/* Remark 插件部分 */}
										{remarkPlugins.length > 0 && (
											<div className="plugin-section">
												<h4 style={{margin: "8px 0 4px 0", fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase"}}>
													Remark 插件 ({remarkPlugins.length})
												</h4>
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
										)}

										{/* Rehype 插件部分 */}
										{rehypePlugins.length > 0 && (
											<div className="plugin-section">
												<h4 style={{margin: "8px 0 4px 0", fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase"}}>
													Rehype 插件 ({rehypePlugins.length})
												</h4>
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
										)}
									</>
								) : (
									<p className="no-plugins-message">未找到任何插件</p>
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
