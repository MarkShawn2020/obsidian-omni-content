import React, { useState } from "react";
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
	onExtensionToggle?: (extensionName: string, enabled: boolean) => void;
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onExtensionConfigChange?: (extensionName: string, key: string, value: string | boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
													settings,
													extensions,
													plugins,
													onRefresh,
													onCopy,
													onDistribute,
													onTemplateChange,
													onThemeChange,
													onHighlightChange,
													onThemeColorToggle,
													onThemeColorChange,
													onRenderArticle: _onRenderArticle,
													onSaveSettings,
													onExtensionToggle,
													onPluginToggle,
													onExtensionConfigChange,
													onPluginConfigChange,
												}) => {
	const [, forceUpdate] = useState({});
	const handleAccordionToggle = (sectionId: string, isExpanded: boolean) => {
		console.log(`[Toolbar] handleAccordionToggle: ${sectionId}, isExpanded: ${isExpanded}`);
		console.log(`[Toolbar] Before update:`, settings.expandedAccordionSections);
		
		let currentSections = [...settings.expandedAccordionSections];
		
		if (isExpanded) {
			if (!currentSections.includes(sectionId)) {
				currentSections.push(sectionId);
			}
		} else {
			const index = currentSections.indexOf(sectionId);
			if (index > -1) {
				currentSections.splice(index, 1);
			}
		}
		
		settings.expandedAccordionSections = currentSections;
		console.log(`[Toolbar] After update:`, settings.expandedAccordionSections);
		
		// 强制重新渲染
		forceUpdate({});
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
						onRefresh={onRefresh}
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
								expandedSections={settings.expandedAccordionSections}
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
							expandedSections={settings.expandedAccordionSections}
							onToggle={handleAccordionToggle}
						>
							<div className="remark-plugins-container" style={{width: "100%"}}>
								{extensions.length > 0 ? (
									extensions.map((extension) => (
										<ConfigComponent
											key={extension.name}
											item={extension}
											type="extension"
											expandedSections={settings.expandedAccordionSections}
											onToggle={(sectionId, isExpanded) => {
												handleAccordionToggle(sectionId, isExpanded);
											}}
											onEnabledChange={(extensionName, enabled) => onExtensionToggle?.(extensionName, enabled)}
											onConfigChange={onExtensionConfigChange}
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
							expandedSections={settings.expandedAccordionSections}
							onToggle={handleAccordionToggle}
						>
							<div className="rehype-plugins-container" style={{width: "100%"}}>
								{plugins.length > 0 ? (
									plugins.map((plugin) => (
										<ConfigComponent
											key={plugin.name}
											item={plugin}
											type="plugin"
											expandedSections={settings.expandedAccordionSections}
											onToggle={(sectionId, isExpanded) => {
												handleAccordionToggle(sectionId, isExpanded);
											}}
											onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
											onConfigChange={onPluginConfigChange}
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
