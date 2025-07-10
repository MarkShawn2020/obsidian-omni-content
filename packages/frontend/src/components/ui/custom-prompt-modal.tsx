import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { ViteReactSettings } from '../../types';
import { AIStyle, AI_STYLES } from './ai-analysis-split-button';

interface CustomPromptModalProps {
	isOpen: boolean;
	onClose: () => void;
	settings: ViteReactSettings;
	onSettingsChange: (settings: Partial<ViteReactSettings>) => void;
	onSaveSettings: () => void;
	onAnalyze: (style: AIStyle) => void;
}

export const CustomPromptModal: React.FC<CustomPromptModalProps> = ({
	isOpen,
	onClose,
	settings,
	onSettingsChange,
	onSaveSettings,
	onAnalyze
}) => {
	const [customPrompt, setCustomPrompt] = useState<string>(settings.aiPromptTemplate || '');
	const [previewStyle, setPreviewStyle] = useState<AIStyle | null>(null);

	useEffect(() => {
		if (isOpen) {
			setCustomPrompt(settings.aiPromptTemplate || '');
		}
	}, [isOpen, settings.aiPromptTemplate]);

	if (!isOpen) return null;

	const handleSave = () => {
		onSettingsChange({ aiPromptTemplate: customPrompt.trim() });
		onSaveSettings();
		onClose();
	};

	const handleUseTemplate = (template: string) => {
		setCustomPrompt(template);
	};

	const handlePreviewAndAnalyze = () => {
		// 创建临时的自定义风格
		const customStyle: AIStyle = {
			id: 'custom',
			name: '自定义分析',
			description: '使用用户自定义的prompt模板',
			icon: '⚙️',
			prompt: customPrompt
		};
		
		// 先保存设置
		onSettingsChange({ aiPromptTemplate: customPrompt.trim() });
		onSaveSettings();
		
		// 然后执行分析
		onAnalyze(customStyle);
		onClose();
	};

	const getDefaultPromptTemplate = () => {
		return AI_STYLES[0].prompt; // 使用标准分析的prompt
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* 背景遮罩 */}
			<div 
				className="absolute inset-0 bg-black bg-opacity-50"
				onClick={onClose}
			/>
			
			{/* 模态框内容 */}
			<div className="relative z-10 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
				<div className="bg-white rounded-lg shadow-xl">
					{/* 标题栏 */}
					<div className="flex items-center justify-between border-b p-6">
						<h2 className="text-xl font-semibold text-gray-800">自定义AI分析模板</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
						>
							×
						</button>
					</div>

					{/* 内容区域 */}
					<div className="p-6 max-h-[70vh] overflow-y-auto">
						{/* 预设模板选择 */}
						<div className="mb-6">
							<h3 className="text-lg font-medium text-gray-900 mb-3">快速使用预设模板</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{AI_STYLES.map((style) => (
									<button
										key={style.id}
										onClick={() => handleUseTemplate(style.prompt)}
										className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
									>
										<div className="flex items-center space-x-2 mb-2">
											<span className="text-lg">{style.icon}</span>
											<span className="font-medium text-gray-900 text-sm">{style.name}</span>
										</div>
										<p className="text-xs text-gray-500 line-clamp-2">{style.description}</p>
									</button>
								))}
							</div>
						</div>

						{/* 自定义模板编辑 */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-medium text-gray-900">自定义模板</h3>
								<Button
									onClick={() => handleUseTemplate(getDefaultPromptTemplate())}
									size="sm"
									variant="outline"
									className="text-blue-600 border-blue-300 hover:bg-blue-50"
								>
									恢复默认
								</Button>
							</div>

							<textarea
								value={customPrompt}
								onChange={(e) => setCustomPrompt(e.target.value)}
								placeholder="输入自定义的AI提示词模板..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-48 resize-y font-mono text-sm"
							/>

							{/* 模板变量说明 */}
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
								<h4 className="text-sm font-medium text-yellow-800 mb-2">📝 可用的模板变量</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-yellow-700">
									<div>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{content}}'}</code> - 文章正文内容</p>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{filename}}'}</code> - 当前文件名</p>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{personalInfo.name}}'}</code> - 个人姓名</p>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{personalInfo.bio}}'}</code> - 个人简介</p>
									</div>
									<div>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{personalInfo.email}}'}</code> - 个人邮箱</p>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{personalInfo.website}}'}</code> - 个人网站</p>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{frontmatter}}'}</code> - 文档frontmatter</p>
										<p><code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{#each frontmatter}}'}</code> - 遍历frontmatter</p>
									</div>
								</div>
								<div className="mt-3 pt-3 border-t border-yellow-300">
									<p className="text-xs text-yellow-600">
										💡 使用Handlebars语法：<code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{#if variable}}'}</code> 条件判断，<code className="bg-yellow-100 px-1 py-0.5 rounded">{'{{#each array}}'}</code> 循环遍历
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* 操作按钮 */}
					<div className="flex justify-between border-t p-6">
						<Button
							onClick={() => setCustomPrompt('')}
							variant="outline"
							className="text-red-600 border-red-300 hover:bg-red-50"
						>
							清空模板
						</Button>
						<div className="flex space-x-3">
							<Button
								onClick={onClose}
								variant="outline"
							>
								取消
							</Button>
							<Button
								onClick={handleSave}
								className="bg-gray-600 hover:bg-gray-700 text-white"
							>
								仅保存
							</Button>
							<Button
								onClick={handlePreviewAndAnalyze}
								disabled={!customPrompt.trim()}
								className="bg-blue-600 hover:bg-blue-700 text-white"
							>
								保存并分析
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};