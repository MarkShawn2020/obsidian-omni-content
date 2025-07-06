import React, { useState, useEffect, useRef } from "react";
import {BrandSection} from "./BrandSection";
import {ActionButtons} from "./ActionButtons";
import {StyleSettings} from "./StyleSettings";
import {Accordion} from "../ui/Accordion";
import {ConfigComponent} from "./PluginConfigComponent";
import {ExtensionData, PluginData, ViteReactSettings} from "../../types";

interface ToolbarProps {
	settings: ViteReactSettings;
	extensions: ExtensionData[];
	plugins: PluginData[];
	onCopy: () => void;
	onDistribute: () => void;
	onTemplateChange: (template: string) => void;
	onThemeChange: (theme: string) => void;
	onHighlightChange: (highlight: string) => void;
	onThemeColorToggle: (enabled: boolean) => void;
	onThemeColorChange: (color: string) => void;
	onRenderArticle: () => void;
	onSaveSettings: () => void;
	onExtensionToggle?: (extensionName: string, enabled: boolean) => void;
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onExtensionConfigChange?: (extensionName: string, key: string, value: string | boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
	onExpandedSectionsChange?: (sections: string[]) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
													settings,
													extensions,
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
													onExtensionToggle,
													onPluginToggle,
													onExtensionConfigChange,
													onPluginConfigChange,
													onExpandedSectionsChange,
												}) => {
	// 使用本地状态管理展开的sections
	const [expandedSections, setExpandedSections] = useState<string[]>(settings.expandedAccordionSections);

	// 当外部settings发生变化时，同步更新本地状态
	useEffect(() => {
		setExpandedSections([...settings.expandedAccordionSections]);
	}, [settings.expandedAccordionSections]);

	const handleAccordionToggle = (sectionId: string, isExpanded: boolean) => {
		let newSections: string[];
		if (isExpanded) {
			newSections = expandedSections.includes(sectionId) 
				? expandedSections 
				: [...expandedSections, sectionId];
		} else {
			newSections = expandedSections.filter(id => id !== sectionId);
		}
		
		// 更新本地状态
		setExpandedSections(newSections);
		
		// 通过回调函数更新外部settings
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(newSections);
		}
		onSaveSettings();
	};

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
			<BrandSection/>

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
					{/* 操作按钮组 */}
					<ActionButtons
						onCopy={onCopy}
						onDistribute={onDistribute}
					/>

					{/* 手风琴容器 */}
					<div
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
							<Accordion
								title="样式设置"
								sectionId="accordion-样式设置"
								expandedSections={expandedSections}
								onToggle={handleAccordionToggle}
							>
								<StyleSettings
									settings={settings}
									onTemplateChange={onTemplateChange}
									onThemeChange={onThemeChange}
									onHighlightChange={onHighlightChange}
									onThemeColorToggle={onThemeColorToggle}
									onThemeColorChange={onThemeColorChange}
								/>
							</Accordion>
						)}

						{/* Remark 插件 */}
						<Accordion
							title="Remark 插件"
							sectionId="accordion-remark-插件"
							expandedSections={expandedSections}
							onToggle={handleAccordionToggle}
						>
							<div className="remark-plugins-container" style={{width: "100%"}}>
								{extensions.length > 0 ? (
									extensions.map((extension) => (
										<ConfigComponent
											key={extension.name}
											item={extension}
											type="extension"
											expandedSections={expandedSections}
											onToggle={(sectionId, isExpanded) => {
												handleAccordionToggle(sectionId, isExpanded);
											}}
											onEnabledChange={(extensionName, enabled) => onExtensionToggle?.(extensionName, enabled)}
											onConfigChange={async (extensionName, key, value) => {
												console.log(`[Toolbar] 扩展配置变更: ${extensionName}.${key} = ${value}`);
												console.log(`[Toolbar] onExtensionConfigChange 存在:`, !!onExtensionConfigChange);
												
												// 调用外部配置变更回调
												if (onExtensionConfigChange) {
													try {
														const result = onExtensionConfigChange(extensionName, key, value) as any;
														// 无论是否为 Promise 都等待
														if (result && typeof result?.then === 'function') {
															await result;
														}
														console.log(`[Toolbar] 后端扩展配置更新完成: ${extensionName}.${key}`);
													} catch (error) {
														console.error(`[Toolbar] 扩展配置更新失败:`, error);
													}
												} else {
													console.warn(`[Toolbar] onExtensionConfigChange 未定义`);
												}
												
												// 等待配置更新完成后触发重新渲染
												setTimeout(() => {
													console.log(`[Toolbar] 触发重新渲染: ${extensionName}.${key}`);
													onRenderArticle();
												}, 200); // 增加延迟到200ms
											}}
										/>
									))
								) : (
									<p className="no-plugins-message">未找到任何Remark插件</p>
								)}
							</div>
						</Accordion>

						{/* Rehype 插件 */}
						<Accordion
							title="Rehype 插件"
							sectionId="accordion-rehype-插件"
							expandedSections={expandedSections}
							onToggle={handleAccordionToggle}
						>
							<div className="rehype-plugins-container" style={{width: "100%"}}>
								{plugins.length > 0 ? (
									plugins.map((plugin) => (
										<ConfigComponent
											key={plugin.name}
											item={plugin}
											type="plugin"
											expandedSections={expandedSections}
											onToggle={(sectionId, isExpanded) => {
												handleAccordionToggle(sectionId, isExpanded);
											}}
											onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
											onConfigChange={async (pluginName, key, value) => {
												console.log(`[Toolbar] 配置变更: ${pluginName}.${key} = ${value}`);
												console.log(`[Toolbar] onPluginConfigChange 存在:`, !!onPluginConfigChange);
												
												// 调用外部配置变更回调
												if (onPluginConfigChange) {
													try {
														const result = onPluginConfigChange(pluginName, key, value) as any;
														// 无论是否为 Promise 都等待
														if (result && typeof result?.then === 'function') {
															await result;
														}
														console.log(`[Toolbar] 后端配置更新完成: ${pluginName}.${key}`);
													} catch (error) {
														console.error(`[Toolbar] 配置更新失败:`, error);
													}
												} else {
													console.warn(`[Toolbar] onPluginConfigChange 未定义`);
												}
												
												// 等待配置更新完成后触发重新渲染
												setTimeout(() => {
													console.log(`[Toolbar] 触发重新渲染: ${pluginName}.${key}`);
													onRenderArticle();
												}, 200); // 增加延迟到200ms
											}}
										/>
									))
								) : (
									<p className="no-plugins-message">未找到任何Rehype插件</p>
								)}
							</div>
						</Accordion>
					</div>
				</div>
			</div>
		</div>
	);
};
