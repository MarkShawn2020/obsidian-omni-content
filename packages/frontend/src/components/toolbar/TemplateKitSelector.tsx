import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { ViteReactSettings, PersonalInfo } from '../../types';
import { logger } from '../../../../shared/src/logger';
import {
	Package,
	Sparkles,
	Download,
	Upload,
	Plus,
	Eye,
	Settings,
	Check,
	AlertCircle,
	Loader,
	Trash2,
	RefreshCw,
	Palette
} from 'lucide-react';

// 简单的Badge组件
const Badge: React.FC<{ variant?: string; className?: string; children: React.ReactNode }> = ({ 
	variant = 'default', 
	className = '', 
	children 
}) => (
	<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
		{children}
	</span>
);

// 简单的Card组件
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
	<div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
		{children}
	</div>
);

const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
	<div className={`p-6 pb-0 ${className}`}>
		{children}
	</div>
);

const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
	<h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
		{children}
	</h3>
);

const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
	<div className={`p-6 pt-0 ${className}`}>
		{children}
	</div>
);

// 模板套装相关类型定义
interface TemplateKit {
	basicInfo: {
		id: string;
		name: string;
		description: string;
		author: string;
		version: string;
		tags: string[];
		previewImage?: string;
	};
	styleConfig: {
		theme: string;
		codeHighlight: string;
		enableCustomThemeColor: boolean;
		customThemeColor?: string;
	};
	templateConfig: {
		templateFileName: string;
		useTemplate: boolean;
	};
	pluginConfig: {
		enabledMarkdownPlugins: string[];
		enabledHtmlPlugins: string[];
		pluginSettings: Record<string, any>;
	};
}

interface TemplateKitSelectorProps {
	settings: ViteReactSettings;
	onKitApply?: (kitId: string) => void;
	onKitCreate?: (basicInfo: any) => void;
	onKitDelete?: (kitId: string) => void;
	onSettingsChange?: (settings: Partial<ViteReactSettings>) => void;
}

export const TemplateKitSelector: React.FC<TemplateKitSelectorProps> = ({
	settings,
	onKitApply,
	onKitCreate,
	onKitDelete,
	onSettingsChange,
}) => {
	const [kits, setKits] = useState<TemplateKit[]>([]);
	const [selectedKitId, setSelectedKitId] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [applying, setApplying] = useState(false);
	const [error, setError] = useState<string>('');
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [previewKit, setPreviewKit] = useState<TemplateKit | null>(null);

	// 加载可用套装
	useEffect(() => {
		loadKits();
	}, []);

	const loadKits = async () => {
		try {
			setLoading(true);
			setError('');
			
			// 模拟加载套装数据（实际应该调用后端API）
			const mockKits: TemplateKit[] = [
				{
					basicInfo: {
						id: 'claude-style',
						name: 'Claude Style',
						description: '基于微信公众号Claude风格的优雅模板套装，采用温暖的橙红色主题和圆角设计',
						author: 'Lovpen Team',
						version: '1.0.0',
						tags: ['微信风格', '技术文章', '橙红主题']
					},
					styleConfig: {
						theme: 'claude-style',
						codeHighlight: 'github',
						enableCustomThemeColor: true,
						customThemeColor: '#c86442'
					},
					templateConfig: {
						templateFileName: 'Claude Style.html',
						useTemplate: true
					},
					pluginConfig: {
						enabledMarkdownPlugins: ['CodeHighlight', 'LinkRenderer'],
						enabledHtmlPlugins: ['Images', 'Tables'],
						pluginSettings: {}
					}
				},
				{
					basicInfo: {
						id: 'minimal-clean',
						name: 'Minimal Clean',
						description: '简约清新的模板套装，采用极简设计理念，适合学术论文和正式文档',
						author: 'Lovpen Team',
						version: '1.0.0',
						tags: ['极简', '学术', '正式']
					},
					styleConfig: {
						theme: 'bento',
						codeHighlight: 'vs',
						enableCustomThemeColor: false
					},
					templateConfig: {
						templateFileName: 'Bento 1.html',
						useTemplate: true
					},
					pluginConfig: {
						enabledMarkdownPlugins: ['CodeHighlight'],
						enabledHtmlPlugins: ['Images'],
						pluginSettings: {}
					}
				},
				{
					basicInfo: {
						id: 'tech-dark',
						name: 'Tech Dark',
						description: '深色科技风格模板套装，采用暗色主题和蓝色强调色，适合程序员和技术博客',
						author: 'Lovpen Team',
						version: '1.0.0',
						tags: ['暗色主题', '科技风', '程序员']
					},
					styleConfig: {
						theme: 'bento-dark',
						codeHighlight: 'vs-dark',
						enableCustomThemeColor: true,
						customThemeColor: '#007ACC'
					},
					templateConfig: {
						templateFileName: '手工川 - 2.html',
						useTemplate: true
					},
					pluginConfig: {
						enabledMarkdownPlugins: ['CodeHighlight', 'CalloutRenderer'],
						enabledHtmlPlugins: ['Images', 'CodeBlocks'],
						pluginSettings: {}
					}
				}
			];

			setKits(mockKits);
			logger.info('[TemplateKitSelector] Loaded template kits:', mockKits.length);
		} catch (error) {
			logger.error('[TemplateKitSelector] Error loading kits:', error);
			setError((error as Error).message || 'Failed to load template kits');
		} finally {
			setLoading(false);
		}
	};

	const handleKitSelect = (kitId: string) => {
		setSelectedKitId(kitId);
		const kit = kits.find(k => k.basicInfo.id === kitId);
		if (kit) {
			setPreviewKit(kit);
		}
	};

	const handleKitApply = async () => {
		if (!selectedKitId) return;

		try {
			setApplying(true);
			const kit = kits.find(k => k.basicInfo.id === selectedKitId);
			if (!kit) {
				throw new Error('Selected kit not found');
			}

			logger.info('[TemplateKitSelector] Applying kit:', kit.basicInfo.name);

			// 应用套装设置
			const newSettings: Partial<ViteReactSettings> = {
				defaultStyle: kit.styleConfig.theme,
				defaultHighlight: kit.styleConfig.codeHighlight,
				useTemplate: kit.templateConfig.useTemplate,
				defaultTemplate: kit.templateConfig.templateFileName,
				enableThemeColor: kit.styleConfig.enableCustomThemeColor,
				themeColor: kit.styleConfig.customThemeColor || ''
			};

			// 通知父组件应用设置
			if (onSettingsChange) {
				onSettingsChange(newSettings);
			}

			// 调用套装应用回调
			if (onKitApply) {
				onKitApply(selectedKitId);
			}

			// 显示成功消息
			logger.info('[TemplateKitSelector] Kit applied successfully:', kit.basicInfo.name);
		} catch (error) {
			logger.error('[TemplateKitSelector] Error applying kit:', error);
			setError((error as Error).message || 'Failed to apply template kit');
		} finally {
			setApplying(false);
		}
	};

	const handleCreateKit = () => {
		setShowCreateDialog(true);
	};

	const handleCreateKitConfirm = (basicInfo: any) => {
		if (onKitCreate) {
			onKitCreate(basicInfo);
		}
		setShowCreateDialog(false);
		// 重新加载套装列表
		loadKits();
	};

	const getKitStatusBadge = (kit: TemplateKit) => {
		const isCurrentTheme = settings.defaultStyle === kit.styleConfig.theme;
		const isCurrentTemplate = settings.defaultTemplate === kit.templateConfig.templateFileName;
		
		if (isCurrentTheme && isCurrentTemplate) {
			return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">当前使用</Badge>;
		} else if (isCurrentTheme || isCurrentTemplate) {
			return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">部分匹配</Badge>;
		}
		return null;
	};

	if (loading) {
		return (
			<div className="w-full p-6 text-center">
				<div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
					<Loader className="animate-spin w-8 h-8 text-gray-600 mx-auto mb-3" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">加载模板套装</h3>
					<p className="text-sm text-gray-600">正在加载可用的模板套装...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full p-6 text-center">
				<div className="bg-red-50 border border-red-200 rounded-xl p-6">
					<AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
					<p className="text-sm text-red-600 mb-4">{error}</p>
					<Button onClick={loadKits} variant="outline" size="sm">
						<RefreshCw className="w-4 h-4 mr-2" />
						重试
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* 套装选择器头部 */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-purple-100 rounded-lg">
						<Package className="w-5 h-5 text-purple-600" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900">模板套装</h3>
						<p className="text-sm text-gray-600">一键应用完整的样式解决方案</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Button onClick={handleCreateKit} variant="outline" size="sm">
						<Plus className="w-4 h-4 mr-2" />
						创建套装
					</Button>
					<Button onClick={loadKits} variant="outline" size="sm">
						<RefreshCw className="w-4 h-4 mr-2" />
						刷新
					</Button>
				</div>
			</div>

			{/* 套装选择器 */}
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="block text-sm font-medium text-gray-700">选择模板套装</label>
					<Select value={selectedKitId} onValueChange={handleKitSelect}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="选择一个模板套装..." />
						</SelectTrigger>
						<SelectContent>
							{kits.map((kit) => (
								<SelectItem key={kit.basicInfo.id} value={kit.basicInfo.id}>
									<div className="flex items-center gap-2">
										<Sparkles className="w-4 h-4 text-purple-600" />
										<span>{kit.basicInfo.name}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* 应用按钮 */}
				{selectedKitId && (
					<Button 
						onClick={handleKitApply} 
						disabled={applying}
						className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
					>
						{applying ? (
							<>
								<Loader className="animate-spin w-4 h-4 mr-2" />
								应用中...
							</>
						) : (
							<>
								<Check className="w-4 h-4 mr-2" />
								应用套装
							</>
						)}
					</Button>
				)}
			</div>

			{/* 套装预览 */}
			{previewKit && (
				<Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<CardTitle className="text-lg text-gray-900 mb-1">
									{previewKit.basicInfo.name}
								</CardTitle>
								<p className="text-sm text-gray-600 mb-3">
									{previewKit.basicInfo.description}
								</p>
								<div className="flex items-center gap-2 mb-2">
									<span className="text-xs text-gray-500">作者:</span>
									<span className="text-xs text-gray-700">{previewKit.basicInfo.author}</span>
									<span className="text-xs text-gray-500">版本:</span>
									<span className="text-xs text-gray-700">{previewKit.basicInfo.version}</span>
								</div>
								<div className="flex flex-wrap gap-1">
									{previewKit.basicInfo.tags.map((tag, index) => (
										<Badge key={index} variant="secondary" className="text-xs">
											{tag}
										</Badge>
									))}
									{getKitStatusBadge(previewKit)}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
							<div className="bg-white/60 border border-purple-200 rounded-lg p-3">
								<div className="flex items-center gap-2 mb-2">
									<Palette className="w-3 h-3 text-purple-600" />
									<span className="font-medium text-gray-800">主题样式</span>
								</div>
								<p className="text-gray-600">主题: {previewKit.styleConfig.theme}</p>
								<p className="text-gray-600">高亮: {previewKit.styleConfig.codeHighlight}</p>
							</div>
							<div className="bg-white/60 border border-blue-200 rounded-lg p-3">
								<div className="flex items-center gap-2 mb-2">
									<Package className="w-3 h-3 text-blue-600" />
									<span className="font-medium text-gray-800">模板配置</span>
								</div>
								<p className="text-gray-600">模板: {previewKit.templateConfig.templateFileName}</p>
								<p className="text-gray-600">启用: {previewKit.templateConfig.useTemplate ? '是' : '否'}</p>
							</div>
							<div className="bg-white/60 border border-green-200 rounded-lg p-3">
								<div className="flex items-center gap-2 mb-2">
									<Settings className="w-3 h-3 text-green-600" />
									<span className="font-medium text-gray-800">插件配置</span>
								</div>
								<p className="text-gray-600">
									Markdown: {previewKit.pluginConfig.enabledMarkdownPlugins.length}个
								</p>
								<p className="text-gray-600">
									HTML: {previewKit.pluginConfig.enabledHtmlPlugins.length}个
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* 套装列表 */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-gray-700">可用套装</h4>
				<div className="grid grid-cols-1 gap-3">
					{kits.map((kit) => (
						<div 
							key={kit.basicInfo.id}
							className={`p-3 border rounded-lg cursor-pointer transition-all ${
								selectedKitId === kit.basicInfo.id 
									? 'border-purple-300 bg-purple-50' 
									: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
							}`}
							onClick={() => handleKitSelect(kit.basicInfo.id)}
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<h5 className="text-sm font-medium text-gray-900">{kit.basicInfo.name}</h5>
										{getKitStatusBadge(kit)}
									</div>
									<p className="text-xs text-gray-600 mb-2">{kit.basicInfo.description}</p>
									<div className="flex flex-wrap gap-1">
										{kit.basicInfo.tags.slice(0, 3).map((tag, index) => (
											<Badge key={index} variant="outline" className="text-xs">
												{tag}
											</Badge>
										))}
										{kit.basicInfo.tags.length > 3 && (
											<span className="text-xs text-gray-500">+{kit.basicInfo.tags.length - 3}</span>
										)}
									</div>
								</div>
								<div className="flex gap-1 ml-2">
									<Button 
										variant="ghost" 
										size="sm" 
										className="h-6 w-6 p-0"
										onClick={(e) => {
											e.stopPropagation();
											setPreviewKit(kit);
										}}
									>
										<Eye className="w-3 h-3" />
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};