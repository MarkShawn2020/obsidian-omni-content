import React from "react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../ui/Select";
import {ToggleSwitch} from "../ui/ToggleSwitch";
import {ViteReactSettings} from "../../types";
import {useResources} from "../../hooks/useResources";

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
	// 动态加载资源
	const { themes, highlights, templates, loading, error } = useResources();

	// 转换为选择器选项格式
	const templateOptions = templates.map(template => ({
		value: template.filename,
		text: template.name
	}));

	const themeOptions = themes.map(theme => ({
		value: theme.className,
		text: theme.name
	}));

	const highlightOptions = highlights.map(highlight => ({
		value: highlight.name,
		text: highlight.name
	}));

	// 加载状态或错误处理
	if (loading) {
		return (
			<div className="w-full p-4 text-center text-gray-500">
				<div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
				加载资源中...
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full p-4 text-center text-red-500">
				资源加载失败: {error}
			</div>
		);
	}

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
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2 text-xs font-medium text-gray-600 min-w-16">
					<svg
						width="14"
						height="14"
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
					<SelectTrigger className="flex-1 h-8 text-sm">
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
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2 text-xs font-medium text-gray-600 min-w-16">
					<svg
						width="14"
						height="14"
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
					<SelectTrigger className="flex-1 h-8 text-sm">
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
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2 text-xs font-medium text-gray-600 min-w-16">
					<svg
						width="14"
						height="14"
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
					<span>高亮</span>
				</div>
				<Select value={settings.defaultHighlight} onValueChange={onHighlightChange}>
					<SelectTrigger className="flex-1 h-8 text-sm">
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
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 text-xs font-medium text-gray-600 min-w-16">
						<svg
							width="14"
							height="14"
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
					<div className="flex items-center gap-2">
						<ToggleSwitch
							size={'small'}
							checked={settings.enableThemeColor}
							onChange={onThemeColorToggle}
						/>
						<span className="text-xs text-gray-500">
							{settings.enableThemeColor ? "启用" : "禁用"}
						</span>
					</div>
				</div>

				{settings.enableThemeColor && (
					<div className="flex items-center gap-3 pl-20">
						<input
							className="w-8 h-6 rounded border border-gray-300 cursor-pointer"
							type="color"
							value={settings.themeColor || "#7852ee"}
							onInput={handleColorInput}
							onChange={handleColorChange}
						/>
						<div
							className="w-4 h-4 rounded border border-gray-300"
							style={{
								backgroundColor: settings.themeColor || "#7852ee",
							}}
						/>
						<span className="text-xs text-gray-500 font-mono">
							{settings.themeColor || "#7852ee"}
						</span>
					</div>
				)}
			</div>
		</div>
	);
};
