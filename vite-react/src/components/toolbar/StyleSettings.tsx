import React from "react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../ui/Select";
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
	const templateOptions = [
		{value: "none", text: "不使用模板"},
		{value: "default", text: "默认模板"},
		{value: "minimal", text: "极简模板"},
	];

	// 主题选项（静态提供）
	const themeOptions = [
		{value: "default", text: "默认主题"},
		{value: "dark", text: "深色主题"},
		{value: "light", text: "浅色主题"},
	];

	// 高亮选项（静态提供）
	const highlightOptions = [
		{value: "default", text: "默认高亮"},
		{value: "github", text: "GitHub"},
		{value: "vscode", text: "VSCode"},
	];

	const handleTemplateChange = (value: string) => {
		// 将 "none" 转换为空字符串，保持向后兼容
		onTemplateChange(value === "none" ? "" : value);
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
		<div className="w-full space-y-3">
			{/* 模板选择器 */}
			<div className="space-y-1.5">
				<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
				<Select value={settings.useTemplate ? settings.defaultTemplate : "none"} onValueChange={handleTemplateChange}>
					<SelectTrigger className="w-full h-8 text-sm">
						<SelectValue placeholder="选择模板" />
					</SelectTrigger>
					<SelectContent>
						{templateOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.text}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* 主题选择器 */}
			<div className="space-y-1.5">
				<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
				<Select value={settings.defaultStyle} onValueChange={onThemeChange}>
					<SelectTrigger className="w-full h-8 text-sm">
						<SelectValue placeholder="选择主题" />
					</SelectTrigger>
					<SelectContent>
						{themeOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.text}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* 代码高亮选择器 */}
			<div className="space-y-1.5">
				<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
				<Select value={settings.defaultHighlight} onValueChange={onHighlightChange}>
					<SelectTrigger className="w-full h-8 text-sm">
						<SelectValue placeholder="选择高亮主题" />
					</SelectTrigger>
					<SelectContent>
						{highlightOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.text}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* 主题色选择器 */}
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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

				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<ToggleSwitch
							size={'small'}
							checked={settings.enableThemeColor}
							onChange={onThemeColorToggle}
						/>
						<span className="text-xs text-muted-foreground">
							{settings.enableThemeColor ? "启用自定义色" : "使用主题色"}
						</span>
					</div>

					<div className={`flex items-center gap-2 transition-opacity ${settings.enableThemeColor ? 'opacity-100' : 'opacity-50'}`}>
						<input
							className="w-8 h-6 rounded border border-border cursor-pointer disabled:cursor-not-allowed"
							type="color"
							value={settings.themeColor || "#7852ee"}
							disabled={!settings.enableThemeColor}
							onInput={handleColorInput}
							onChange={handleColorChange}
						/>
						<div
							className="w-4 h-4 rounded border border-border"
							style={{
								backgroundColor: settings.themeColor || "#7852ee",
							}}
						/>
						<span className="text-xs text-muted-foreground font-mono">
							{settings.themeColor || "#7852ee"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
