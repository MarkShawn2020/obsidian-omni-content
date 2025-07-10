import React, {useEffect, useState} from "react";
import {BrandSection} from "./BrandSection";
import {StyleSettings} from "./StyleSettings";
import {CoverDesigner} from "./CoverDesigner";
import {ArticleInfo, ArticleInfoData} from "./ArticleInfo";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "../ui/tabs";
import {ConfigComponent} from "./PluginConfigComponent";
import {UnifiedPluginData, ViteReactSettings} from "../../types";
import {CoverData} from "@/components/toolbar/CoverData";
import {logger} from "../../../../shared/src/logger";

interface ToolbarProps {
	settings: ViteReactSettings;
	plugins: UnifiedPluginData[];
	articleHTML: string;
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
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
	onExpandedSectionsChange?: (sections: string[]) => void;
	onArticleInfoChange?: (info: ArticleInfoData) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
													settings,
													plugins,
													articleHTML,
													onRefresh,
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
													onArticleInfoChange,
												}) => {
	logger.info("[Toolbar] 完整工具栏开始渲染", {
		pluginsCount: plugins?.length || 0,
		settingsKeys: Object.keys(settings || {}),
		showStyleUI: settings?.showStyleUI,
		expandedSections: settings?.expandedAccordionSections
	});

	// 使用本地状态管理当前选中的tab
	const [activeTab, setActiveTab] = useState<string>(() => {
		// 默认选择基本信息tab
		return 'info';
	});

	// 插件管理中的子tab状态
	const [pluginTab, setPluginTab] = useState<string>(() => {
		// 默认选择第一个有插件的类型
		const remarkPlugins = plugins.filter(plugin => plugin.type === 'remark');
		const rehypePlugins = plugins.filter(plugin => plugin.type === 'rehype');
		
		if (remarkPlugins.length > 0) return 'remark';
		if (rehypePlugins.length > 0) return 'rehype';
		return 'remark';
	});

	// 插件展开状态管理
	const [pluginExpandedSections, setPluginExpandedSections] = useState<string[]>(
		settings.expandedAccordionSections || []
	);


	// 当外部settings发生变化时，同步更新本地状态
	useEffect(() => {
		// 如果当前tab是样式设置但样式设置被关闭了，切换到基本信息
		if (activeTab === 'style' && !settings.showStyleUI) {
			setActiveTab('info');
		}
		// 同步插件展开状态
		setPluginExpandedSections(settings.expandedAccordionSections || []);
	}, [settings.showStyleUI, activeTab, settings.expandedAccordionSections]);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		// 保存当前选中的tab到settings
		const newSections = [value];
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(newSections);
		}
		onSaveSettings();
	};

	// 分离不同类型的插件
	const remarkPlugins = plugins.filter(plugin => plugin.type === 'remark');
	const rehypePlugins = plugins.filter(plugin => plugin.type === 'rehype');

	// 批量操作函数
	const handleBatchToggle = (pluginType: 'remark' | 'rehype', enabled: boolean) => {
		const targetPlugins = pluginType === 'remark' ? remarkPlugins : rehypePlugins;
		targetPlugins.forEach(plugin => {
			if (onPluginToggle) {
				onPluginToggle(plugin.name, enabled);
			}
		});
		// 触发重新渲染
		onRenderArticle();
	};

	// 处理插件展开/折叠
	const handlePluginToggle = (sectionId: string, isExpanded: boolean) => {
		let newSections: string[];
		if (isExpanded) {
			newSections = pluginExpandedSections.includes(sectionId)
				? pluginExpandedSections
				: [...pluginExpandedSections, sectionId];
		} else {
			newSections = pluginExpandedSections.filter(id => id !== sectionId);
		}
		
		// 更新本地状态
		setPluginExpandedSections(newSections);
		
		// 通过回调函数更新外部settings
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(newSections);
		}
		onSaveSettings();
	};

	// 处理封面下载
	const handleDownloadCovers = async (covers: CoverData[]) => {
		logger.info("[Toolbar] 下载封面", { count: covers.length });
		
		const cover1 = covers.find(c => c.aspectRatio === '2.25:1');
		const cover2 = covers.find(c => c.aspectRatio === '1:1');
		
		// 下载单独的封面
		for (const [index, cover] of covers.entries()) {
			try {
				let arrayBuffer: ArrayBuffer;
				
				// 检查URL类型并相应处理
				if (cover.imageUrl.startsWith('http://') || cover.imageUrl.startsWith('https://')) {
					// HTTP/HTTPS URL - 使用Obsidian的requestUrl API
					const app = (window as any).app;
					const { requestUrl } = require('obsidian');
					
					const response = await requestUrl({
						url: cover.imageUrl,
						method: 'GET'
					});
					
					arrayBuffer = response.arrayBuffer;
				} else if (cover.imageUrl.startsWith('blob:') || cover.imageUrl.startsWith('data:')) {
					// Blob URL 或 Data URL - 使用fetch API
					const response = await fetch(cover.imageUrl);
					if (!response.ok) {
						throw new Error(`Failed to fetch blob: ${response.status}`);
					}
					arrayBuffer = await response.arrayBuffer();
				} else {
					console.error(`封面 ${index + 1} URL协议不支持: ${cover.imageUrl}`);
					continue;
				}
				
				const uint8Array = new Uint8Array(arrayBuffer);
				const fileName = `cover-${index + 1}-${cover.aspectRatio}.jpg`;
				
				// 使用Obsidian的文件系统API保存文件
				const app = (window as any).app;
				if (app?.vault?.adapter?.write) {
					await app.vault.adapter.write(fileName, uint8Array);
					console.log(`封面 ${index + 1} 已保存到: ${fileName} (${uint8Array.length} bytes)`);
				} else {
					console.error("无法访问Obsidian文件系统API");
				}
			} catch (error) {
				console.error(`下载封面 ${index + 1} 失败:`, error);
			}
		}
		
		// 如果有两个封面，创建拼接图
		if (cover1 && cover2) {
			try {
				await createCombinedCover(cover1, cover2);
			} catch (error) {
				console.error("创建拼接封面失败:", error);
			}
		}
		
		if (covers.length > 0) {
			alert(`已下载 ${covers.length} 个封面到vault根目录${cover1 && cover2 ? '，并创建了拼接图' : ''}`);
		}
	};

	// 创建拼接封面
	const createCombinedCover = async (cover1: CoverData, cover2: CoverData) => {
		try {
			// 获取图片数据的通用函数
			const getImageData = async (imageUrl: string) => {
				if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
					// HTTP/HTTPS URL - 使用Obsidian的requestUrl API
					const app = (window as any).app;
					const { requestUrl } = require('obsidian');
					const response = await requestUrl({ url: imageUrl, method: 'GET' });
					return response.arrayBuffer;
				} else if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
					// Blob URL 或 Data URL - 使用fetch API
					const response = await fetch(imageUrl);
					if (!response.ok) {
						throw new Error(`Failed to fetch image: ${response.status}`);
					}
					return await response.arrayBuffer();
				} else {
					throw new Error(`不支持的URL协议: ${imageUrl}`);
				}
			};
			
			// 下载两张图片的数据
			const [arrayBuffer1, arrayBuffer2] = await Promise.all([
				getImageData(cover1.imageUrl),
				getImageData(cover2.imageUrl)
			]);
			
			// 创建blob URL
			const blob1 = new Blob([arrayBuffer1], { type: 'image/jpeg' });
			const blob2 = new Blob([arrayBuffer2], { type: 'image/jpeg' });
			const url1 = URL.createObjectURL(blob1);
			const url2 = URL.createObjectURL(blob2);
			
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			
			// 设置画布尺寸 (3.25:1 比例，高度600px，提高分辨率)
			const height = 600;
			const width = height * 3.25;
			canvas.width = width;
			canvas.height = height;
			
			// 加载图片
			const img1 = new Image();
			const img2 = new Image();
			
			const loadImage = (img: HTMLImageElement, url: string): Promise<void> => {
				return new Promise((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = reject;
					img.src = url;
				});
			};
			
			await Promise.all([
				loadImage(img1, url1),
				loadImage(img2, url2)
			]);
			
			// 绘制第一张图 (2.25:1 比例)
			const img1Width = height * 2.25;
			ctx?.drawImage(img1, 0, 0, img1Width, height);
			
			// 绘制第二张图 (1:1 比例)
			const img2Width = height;
			ctx?.drawImage(img2, img1Width, 0, img2Width, height);
			
			// 清理blob URL
			URL.revokeObjectURL(url1);
			URL.revokeObjectURL(url2);
			
			// 转换为blob并保存（提高JPEG质量到95%）
			canvas.toBlob(async (blob) => {
				if (blob) {
					const arrayBuffer = await blob.arrayBuffer();
					const uint8Array = new Uint8Array(arrayBuffer);
					const fileName = `cover-combined-3.25-1.jpg`;
					
					const app = (window as any).app;
					if (app?.vault?.adapter?.write) {
						await app.vault.adapter.write(fileName, uint8Array);
						console.log(`拼接封面已保存到: ${fileName} (${uint8Array.length} bytes)`);
					}
				}
			}, 'image/jpeg', 0.95);
			
		} catch (error) {
			console.error("创建拼接封面失败:", error);
		}
	};

	try {
		return (
			<div className="h-full flex flex-col bg-white" style={{
				border: '1px solid #ccc', // 保留调试边框但更subtle
				minWidth: '320px',
				width: '100%', // 确保占满容器
				overflow: 'hidden' // 防止内容溢出
			}}>
				<BrandSection 
					onCopy={onCopy} 
					onDistribute={onDistribute}
				/>

				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<div className="p-4" style={{ minWidth: '320px' }}>
						<Tabs value={activeTab} onValueChange={handleTabChange}>
							<TabsList style={{ 
								width: '100%',
								maxWidth: '100%',
								overflow: 'hidden',
								flexWrap: 'nowrap'
							}}>
								<TabsTrigger value="info">
									基本信息
								</TabsTrigger>
								{settings.showStyleUI && (
									<TabsTrigger value="style">
										样式设置
									</TabsTrigger>
								)}
								<TabsTrigger value="plugins">
									插件管理 ({plugins.length})
								</TabsTrigger>
								<TabsTrigger value="cover">
									封面设计
								</TabsTrigger>
							</TabsList>
							
							<TabsContent value="info">
								<div className="mt-4">
									<ArticleInfo
										settings={settings}
										onSaveSettings={onSaveSettings}
										onInfoChange={onArticleInfoChange || (() => {})}
									/>
								</div>
							</TabsContent>
							
							{settings.showStyleUI && (
								<TabsContent value="style">
									<div className="mt-4">
										<StyleSettings
											settings={settings}
											onTemplateChange={onTemplateChange}
											onThemeChange={onThemeChange}
											onHighlightChange={onHighlightChange}
											onThemeColorToggle={onThemeColorToggle}
											onThemeColorChange={onThemeColorChange}
										/>
									</div>
								</TabsContent>
							)}

							<TabsContent value="plugins">
								<div className="mt-4">
									{plugins.length > 0 ? (
										<Tabs value={pluginTab} onValueChange={setPluginTab}>
											<TabsList>
												{remarkPlugins.length > 0 && (
													<TabsTrigger value="remark">
														Remark ({remarkPlugins.length})
													</TabsTrigger>
												)}
												{rehypePlugins.length > 0 && (
													<TabsTrigger value="rehype">
														Rehype ({rehypePlugins.length})
													</TabsTrigger>
												)}
											</TabsList>
											
											{remarkPlugins.length > 0 && (
												<TabsContent value="remark">
													<div className="mt-4">
														<div className="flex justify-between items-center mb-4">
															<h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
																Remark 插件 ({remarkPlugins.length})
															</h4>
															<div className="flex space-x-2">
																<button
																	onClick={() => handleBatchToggle('remark', true)}
																	className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
																>
																	全部启用
																</button>
																<button
																	onClick={() => handleBatchToggle('remark', false)}
																	className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
																>
																	全部关闭
																</button>
															</div>
														</div>
														<div className="space-y-1">
															{remarkPlugins.map((plugin) => (
																<ConfigComponent
																	key={plugin.name}
																	item={plugin}
																	type="plugin"
																	expandedSections={pluginExpandedSections}
																	onToggle={handlePluginToggle}
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

																		console.log(`[Toolbar] 触发重新渲染: ${pluginName}.${key}`);
																		onRenderArticle();
																	}}
																/>
															))}
														</div>
													</div>
												</TabsContent>
											)}

											{rehypePlugins.length > 0 && (
												<TabsContent value="rehype">
													<div className="mt-4">
														<div className="flex justify-between items-center mb-4">
															<h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
																Rehype 插件 ({rehypePlugins.length})
															</h4>
															<div className="flex space-x-2">
																<button
																	onClick={() => handleBatchToggle('rehype', true)}
																	className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
																>
																	全部启用
																</button>
																<button
																	onClick={() => handleBatchToggle('rehype', false)}
																	className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
																>
																	全部关闭
																</button>
															</div>
														</div>
														<div className="space-y-1">
															{rehypePlugins.map((plugin) => (
																<ConfigComponent
																	key={plugin.name}
																	item={plugin}
																	type="plugin"
																	expandedSections={pluginExpandedSections}
																	onToggle={handlePluginToggle}
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

																		onRenderArticle();
																	}}
																/>
															))}
														</div>
													</div>
												</TabsContent>
											)}
										</Tabs>
									) : (
										<div className="text-center py-8">
											<p className="text-sm text-gray-500">未找到任何插件</p>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="cover">
								<div className="mt-4">
									<CoverDesigner
										articleHTML={articleHTML}
										onDownloadCovers={handleDownloadCovers}
										onClose={() => {}}
									/>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</div>
		);
	} catch (error) {
		logger.error("[Toolbar] 完整工具栏渲染错误:", error);
		return (
			<div className="h-full flex flex-col bg-white p-4">
				<div className="text-red-500">
					<h3>完整工具栏渲染失败</h3>
					<p>错误信息: {error instanceof Error ? error.message : String(error)}</p>
				</div>
			</div>
		);
	}
};
