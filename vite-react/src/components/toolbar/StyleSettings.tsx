import React from "react";
import {Select, SelectOption} from "../ui/Select";
import {ToggleSwitch} from "../ui/ToggleSwitch";
import {ViteReactSettings} from "../../types";

interface StyleSettingsProps {
	settings: ViteReactSettings;
	onTemplateChange: (template: string) => void;
	onThemeChange: (theme: string) => void;
	onHighlightChange: (highlight: string) => void;
	onThemeColorToggle: (enabled: boolean) => void;
	onThemeColorChange: (color: string) => void;
}

export const StyleSettings: React.FC<StyleSettingsProps> = ({
																settings,
																onTemplateChange,
																onThemeChange,
																onHighlightChange,
																onThemeColorToggle,
																onThemeColorChange,
															}) => {
	// 模板选项（静态提供）
	const templateOptions: SelectOption[] = [
		{value: "", text: "不使用模板"},
		{value: "default", text: "默认模板"},
		{value: "minimal", text: "极简模板"},
	];

	// 主题选项（静态提供）
	const themeOptions: SelectOption[] = [
		{value: "default", text: "默认主题"},
		{value: "dark", text: "深色主题"},
		{value: "light", text: "浅色主题"},
	];

	// 高亮选项（静态提供）
	const highlightOptions: SelectOption[] = [
		{value: "default", text: "默认高亮"},
		{value: "github", text: "GitHub"},
		{value: "vscode", text: "VSCode"},
	];

	const handleTemplateChange = (value: string) => {
		onTemplateChange(value);
	};

	const handleColorInput = (e: React.FormEvent<HTMLInputElement>) => {
		const newColor = e.currentTarget.value;
		onThemeColorChange(newColor);
	};

	const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newColor = e.target.value;
		onThemeColorChange(newColor);
	};

	return (
		<div style={{width: "100%"}}>
			{/* 模板选择器 */}
			<div className="toolbar-group">
				<div className="toolbar-label">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
						<polyline points="16 6 12 2 8 6"/>
					</svg>
					<span>模板</span>
				</div>
				<div className="select-wrapper">
					<Select
						value={settings.useTemplate ? settings.defaultTemplate : ""}
						options={templateOptions}
						onChange={handleTemplateChange}
					/>
				</div>
			</div>

			{/* 主题选择器 */}
			<div className="toolbar-group">
				<div className="toolbar-label">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M4 2v20l16-10z"/>
					</svg>
					<span>主题</span>
				</div>
				<div className="select-wrapper">
					<Select
						value={settings.defaultStyle}
						options={themeOptions}
						onChange={onThemeChange}
					/>
				</div>
			</div>

			{/* 代码高亮选择器 */}
			<div className="toolbar-group">
				<div className="toolbar-label">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="16 18 22 12 16 6"/>
						<polyline points="8 6 2 12 8 18"/>
					</svg>
					<span>代码高亮</span>
				</div>
				<div className="select-wrapper">
					<Select
						value={settings.defaultHighlight}
						options={highlightOptions}
						onChange={onHighlightChange}
					/>
				</div>
			</div>

			{/* 主题色选择器 */}
			<div className="toolbar-group">
				<div className="toolbar-label">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M4 2v20l16-10z"/>
					</svg>
					<span>主题色</span>
				</div>

				<div className="color-control-wrapper">
					<div className="enable-switch">
						<ToggleSwitch
							size={'small'}
							checked={settings.enableThemeColor}
							onChange={onThemeColorToggle}
						/>
						<span className="toggle-text">
              {settings.enableThemeColor ? "启用自定义色" : "使用主题色"}
            </span>
					</div>

					<div
						className="color-picker-wrapper"
						style={{
							opacity: settings.enableThemeColor ? "1" : "0.5",
						}}
					>
						<input
							className="toolbar-color-picker"
							type="color"
							value={settings.themeColor || "#7852ee"}
							disabled={!settings.enableThemeColor}
							onInput={handleColorInput}
							onChange={handleColorChange}
						/>
						<div
							className="color-preview"
							style={{
								backgroundColor: settings.themeColor || "#7852ee",
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
