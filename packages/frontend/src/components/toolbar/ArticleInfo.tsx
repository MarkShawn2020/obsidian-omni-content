import React, {useEffect, useState} from 'react';
import {Button} from '../ui/button';
import {ViteReactSettings} from '../../types';
import {logger} from '../../../../shared/src/logger';

interface ArticleInfoProps {
	settings: ViteReactSettings;
	onSaveSettings: () => void;
	onInfoChange: (info: ArticleInfoData) => void;
	onRenderArticle?: () => void;
}

export interface ArticleInfoData {
	author: string;
	publishDate: string;
	articleTitle: string;
	articleSubtitle: string;
	episodeNum: string;
	seriesName: string;
	tags: string[];
}

// 获取默认作者：个人信息设置 -> 默认值
const getDefaultAuthor = (settings: ViteReactSettings): string => {
	if (settings.personalInfo?.name && settings.personalInfo.name.trim() !== '') {
		return settings.personalInfo.name.trim();
	}
	return '南川同学'; // 最终默认值
};

const getDefaultArticleInfo = (settings: ViteReactSettings): ArticleInfoData => ({
	author: getDefaultAuthor(settings), // 使用新的作者逻辑
	publishDate: new Date().toISOString().split('T')[0], // 默认今天
	articleTitle: '', // 将由文件名填充
	articleSubtitle: '',
	episodeNum: '',
	seriesName: '',
	tags: []
});

export const ArticleInfo: React.FC<ArticleInfoProps> = ({
															settings,
															onSaveSettings,
															onInfoChange,
															onRenderArticle
														}) => {
	const [articleInfo, setArticleInfo] = useState<ArticleInfoData>(() => {
		// 从localStorage读取保存的文章信息
		const saved = localStorage.getItem('omni-content-article-info');
		const defaultInfo = getDefaultArticleInfo(settings);

		if (saved) {
			try {
				const savedInfo = JSON.parse(saved);
				// 合并保存的信息和默认信息，但要更新作者字段以使用最新的个人信息设置
				return {
					...defaultInfo,
					...savedInfo,
					// 如果保存的作者为空或为旧的默认值，则使用新的默认作者
					author: savedInfo.author && savedInfo.author.trim() !== '' && savedInfo.author !== '南川同学'
						? savedInfo.author
						: defaultInfo.author
				};
			} catch (error) {
				logger.warn('解析保存的文章信息失败:', error);
				return defaultInfo;
			}
		}
		return defaultInfo;
	});

	// 初始化时设置文章标题为文件名（如果标题为空），确保作者不为空
	useEffect(() => {
		let needsUpdate = false;
		const updates: Partial<ArticleInfoData> = {};

		// 设置默认文章标题为文件名
		if (!articleInfo.articleTitle) {
			const currentFileName = getCurrentFileName();
			if (currentFileName) {
				updates.articleTitle = currentFileName;
				needsUpdate = true;
			}
		}

		// 确保作者不为空
		if (!articleInfo.author) {
			updates.author = getDefaultAuthor(settings);
			needsUpdate = true;
		}

		if (needsUpdate) {
			setArticleInfo(prev => ({
				...prev,
				...updates
			}));
		}
	}, []); // 只在组件挂载时执行一次

	// 当文章信息变化时，保存到localStorage并通知父组件
	useEffect(() => {
		localStorage.setItem('omni-content-article-info', JSON.stringify(articleInfo));
		onInfoChange(articleInfo);
	}, [articleInfo, onInfoChange]);

	const handleInputChange = (field: keyof ArticleInfoData, value: string) => {
		setArticleInfo(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleTagsChange = (tagsText: string) => {
		// 支持多种分隔符：逗号、换行、分号
		const tags = tagsText
			.split(/[,\n;]+/)
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		setArticleInfo(prev => ({
			...prev,
			tags
		}));
	};

	const handleAIGenerate = async () => {
		// 获取当前活跃的文档
		const app = (window as any).app;
		if (!app) {
			alert('无法获取Obsidian应用实例');
			return;
		}

		const activeFile = app.workspace.getActiveFile();
		if (!activeFile) {
			alert('请先打开一个笔记文件');
			return;
		}

		try {
			// 读取文档内容
			const content = await app.vault.read(activeFile);

			// 提取现有的frontmatter
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
			let existingFrontmatter = {};
			if (frontmatterMatch) {
				try {
					// 简单解析YAML frontmatter
					const yamlContent = frontmatterMatch[1];
					const lines = yamlContent.split('\n');
					for (const line of lines) {
						const colonIndex = line.indexOf(':');
						if (colonIndex > 0) {
							const key = line.substring(0, colonIndex).trim();
							const value = line.substring(colonIndex + 1).trim();
							if (key && value) {
								existingFrontmatter[key] = value;
							}
						}
					}
				} catch (error) {
					logger.warn('解析现有frontmatter失败:', error);
				}
			}

			// 生成AI建议的内容
			const aiSuggestion = {
				author: existingFrontmatter['author'] || articleInfo.author || getDefaultAuthor(settings),
				publishDate: existingFrontmatter['publishDate'] || new Date().toISOString().split('T')[0],
				articleTitle: existingFrontmatter['articleTitle'] || activeFile.basename || '',
				articleSubtitle: existingFrontmatter['articleSubtitle'] || articleInfo.articleSubtitle || '记录与分享',
				episodeNum: existingFrontmatter['episodeNum'] || articleInfo.episodeNum || '第 1 期',
				seriesName: existingFrontmatter['seriesName'] || articleInfo.seriesName || '技术分享',
				tags: existingFrontmatter['tags'] || articleInfo.tags.length > 0 ? articleInfo.tags : ['技术', '分享']
			};

			setArticleInfo(aiSuggestion);
			logger.info('AI生成文章信息完成:', aiSuggestion);

		} catch (error) {
			logger.error('AI生成文章信息失败:', error);
			alert('生成失败，请查看控制台了解详情');
		}
	};

	const getCurrentFileName = () => {
		try {
			// 从window对象获取当前活动文件名
			const app = (window as any).app;
			const activeFile = app?.workspace?.getActiveFile?.();
			return activeFile?.basename || '';
		} catch (error) {
			logger.warn('获取当前文件名失败:', error);
			return '';
		}
	};

	const handleClearAll = () => {
		if (confirm('确定要清空所有文章信息吗？')) {
			// 完全清空，所有字段都变成空值，显示为placeholder
			setArticleInfo({
				author: '',
				publishDate: new Date().toISOString().split('T')[0], // 日期保持当前日期
				articleTitle: '',
				articleSubtitle: '',
				episodeNum: '',
				seriesName: '',
				tags: []
			});
		}
	};

	return (
		<div className="w-full space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">文章基本信息</h3>
				<div className="flex space-x-2">
					<Button
						onClick={handleAIGenerate}
						size="sm"
						className="bg-blue-500 hover:bg-blue-600 text-white"
					>
						🤖 AI生成
					</Button>
					<Button
						onClick={handleClearAll}
						size="sm"
						variant="outline"
						className="text-gray-600 hover:text-gray-800"
					>
						🗑️ 清空
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* 作者 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						作者
					</label>
					<input
						type="text"
						value={articleInfo.author}
						onChange={(e) => handleInputChange('author', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="输入作者名称"
					/>
				</div>

				{/* 发布日期 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						发布日期
					</label>
					<input
						type="date"
						value={articleInfo.publishDate}
						onChange={(e) => handleInputChange('publishDate', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				{/* 文章标题 */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						文章标题
					</label>
					<input
						type="text"
						value={articleInfo.articleTitle}
						onChange={(e) => handleInputChange('articleTitle', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="输入文章标题"
					/>
				</div>

				{/* 副标题 */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						副标题
					</label>
					<input
						type="text"
						value={articleInfo.articleSubtitle}
						onChange={(e) => handleInputChange('articleSubtitle', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="输入副标题"
					/>
				</div>

				{/* 期数 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						期数
					</label>
					<input
						type="text"
						value={articleInfo.episodeNum}
						onChange={(e) => handleInputChange('episodeNum', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="如：第 51 期"
					/>
				</div>

				{/* 系列名称 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						系列名称
					</label>
					<input
						type="text"
						value={articleInfo.seriesName}
						onChange={(e) => handleInputChange('seriesName', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="如：人文与科技"
					/>
				</div>

				{/* 标签 */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						标签
					</label>
					<textarea
						value={articleInfo.tags.join(', ')}
						onChange={(e) => handleTagsChange(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
						placeholder="输入标签，支持逗号、换行、分号分隔"
					/>
					<div className="mt-2 flex flex-wrap gap-1">
						{articleInfo.tags.map((tag, index) => (
							<span
								key={index}
								className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
							>
								{tag}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* 预览区域 */}
			<div className="mt-6 p-4 bg-gray-50 rounded-lg">
				<h4 className="text-sm font-medium text-gray-700 mb-2">Frontmatter预览</h4>
				<pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
{`---
author: ${articleInfo.author || getDefaultAuthor(settings)}
publishDate: ${articleInfo.publishDate}
articleTitle: ${articleInfo.articleTitle || '文章标题'}
articleSubtitle: ${articleInfo.articleSubtitle || '副标题'}
episodeNum: ${articleInfo.episodeNum || '第 1 期'}
seriesName: ${articleInfo.seriesName || '系列名称'}
tags:${articleInfo.tags.length > 0 ? articleInfo.tags.map(tag => `\n  - ${tag}`).join('') : '\n  - 标签1\n  - 标签2'}
---`}
				</pre>
			</div>
		</div>
	);
};
