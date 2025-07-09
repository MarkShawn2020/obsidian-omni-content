import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { logger } from '../../../../src/logger';
import { imageGenerationService } from '../../services/imageGenerationService';
import { loadImageAsBlob } from '../../utils/imageProxy';

export type CoverAspectRatio = '2.25:1' | '1:1' | 'custom';
export type CoverImageSource = 'article' | 'upload' | 'ai';

interface CoverDesignerProps {
	articleHTML: string;
	onDownloadCovers: (covers: CoverData[]) => void;
	onClose: () => void;
}

interface CoverData {
	id: string;
	imageUrl: string;
	aspectRatio: CoverAspectRatio;
	width: number;
	height: number;
	title?: string;
	description?: string;
}

interface ExtractedImage {
	src: string;
	alt: string;
	width?: number;
	height?: number;
}

interface AIGenerateParams {
	prompt: string;
	style: string;
	aspectRatio: CoverAspectRatio;
}

interface GenerationStatus {
	isGenerating: boolean;
	progress: number;
	message: string;
}

export type { CoverData };

export const CoverDesigner: React.FC<CoverDesignerProps> = ({
	articleHTML,
	onDownloadCovers,
	onClose
}) => {
	const [activeTab, setActiveTab] = useState<CoverImageSource>('article');
	const [selectedAspectRatio, setSelectedAspectRatio] = useState<CoverAspectRatio>('2.25:1');
	const [customWidth, setCustomWidth] = useState<number>(450);
	const [customHeight, setCustomHeight] = useState<number>(200);
	const [selectedImages, setSelectedImages] = useState<ExtractedImage[]>([]);
	const [uploadedImages, setUploadedImages] = useState<File[]>([]);
	const [aiPrompt, setAiPrompt] = useState<string>('');
	const [aiStyle, setAiStyle] = useState<string>('realistic');
	const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
		isGenerating: false,
		progress: 0,
		message: ''
	});
	const [generatedImages, setGeneratedImages] = useState<string[]>([]);
	const [generationError, setGenerationError] = useState<string>('');
	const [coverTitle, setCoverTitle] = useState<string>('');
	const [coverDescription, setCoverDescription] = useState<string>('');
	const [previewCovers, setPreviewCovers] = useState<CoverData[]>([]);
	
	const fileInputRef = useRef<HTMLInputElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const getDimensions = useCallback((ratio: CoverAspectRatio) => {
		switch (ratio) {
			case '2.25:1':
				return { width: 450, height: 200 };
			case '1:1':
				return { width: 400, height: 400 };
			case 'custom':
				return { width: customWidth, height: customHeight };
			default:
				return { width: 450, height: 200 };
		}
	}, [customWidth, customHeight]);

	// Helper function to load image and get dimensions
	const loadImageDimensions = useCallback((src: string): Promise<{src: string, width: number, height: number}> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				logger.info('[CoverDesigner] 图片加载成功', { 
					src: src.substring(0, 100), 
					width: img.naturalWidth, 
					height: img.naturalHeight 
				});
				resolve({
					src: img.src,
					width: img.naturalWidth,
					height: img.naturalHeight
				});
			};
			img.onerror = (error) => {
				logger.error('[CoverDesigner] 图片加载失败', { src: src.substring(0, 100), error });
				reject(error);
			};
			img.src = src;
		});
	}, []);

	const extractImagesFromHTML = useCallback(async (html: string): Promise<ExtractedImage[]> => {
		logger.info('[CoverDesigner] 开始提取图片', { htmlLength: html.length });
		
		// 首先尝试从实际DOM获取已加载的图片
		const actualImages = document.querySelectorAll('img');
		const loadedImagesMap = new Map<string, ExtractedImage>();
		
		actualImages.forEach((img, index) => {
			if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
				loadedImagesMap.set(img.src, {
					src: img.src,
					alt: img.alt || `图片 ${index + 1}`,
					width: img.naturalWidth,
					height: img.naturalHeight
				});
				logger.info(`[CoverDesigner] 从DOM获取已加载图片 ${index + 1}`, {
					src: img.src.substring(0, 100),
					width: img.naturalWidth,
					height: img.naturalHeight
				});
			}
		});
		
		// 然后解析HTML并匹配/加载缺失的图片
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const htmlImages = doc.querySelectorAll('img');
		
		logger.info('[CoverDesigner] 找到HTML图片元素', { count: htmlImages.length });
		
		const extractedImages: ExtractedImage[] = [];
		
		for (const img of htmlImages) {
			let src = img.src || img.getAttribute('src') || '';
			
			// 如果是空的或者无效的src，尝试其他属性
			if (!src || src === '' || src === window.location.href) {
				const dataSrc = img.getAttribute('data-src');
				const lazySrc = img.getAttribute('lazy-src');
				src = dataSrc || lazySrc || '';
				logger.info(`[CoverDesigner] 尝试备用属性`, { dataSrc, lazySrc, finalSrc: src });
			}
			
			// 处理相对路径
			if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:')) {
				const originalSrc = src;
				
				try {
					if (src.startsWith('./') || src.startsWith('../')) {
						src = new URL(src, window.location.href).href;
					} else if (src.startsWith('/')) {
						src = window.location.origin + src;
					} else if (!src.includes('://')) {
						// 相对路径，相对于当前页面
						src = new URL(src, window.location.href).href;
					}
					
					logger.info(`[CoverDesigner] 路径转换`, { originalSrc, convertedSrc: src });
				} catch (error) {
					logger.error(`[CoverDesigner] 路径转换失败`, { originalSrc, error });
				}
			}
			
			// 验证URL有效性
			const isValidUrl = src && 
				src !== '' && 
				src !== window.location.href &&
				!src.endsWith('#') &&
				(src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:'));
			
			if (!isValidUrl) {
				logger.warn('[CoverDesigner] 跳过无效图片', { src, reason: '无效的URL格式' });
				continue;
			}
			
			// 检查是否已从DOM中获取
			if (loadedImagesMap.has(src)) {
				extractedImages.push(loadedImagesMap.get(src)!);
				logger.info('[CoverDesigner] 使用DOM缓存图片', { src: src.substring(0, 100) });
			} else {
				// 尝试加载图片获取尺寸
				try {
					const dimensions = await loadImageDimensions(src);
					extractedImages.push({
						src: dimensions.src,
						alt: img.alt || `图片 ${extractedImages.length + 1}`,
						width: dimensions.width,
						height: dimensions.height
					});
					logger.info('[CoverDesigner] 成功加载新图片', { src: src.substring(0, 100) });
				} catch (error) {
					logger.error('[CoverDesigner] 获取图片尺寸失败', { src: src.substring(0, 100), error });
					// 即使加载失败，也添加图片但设置默认尺寸
					extractedImages.push({
						src: src,
						alt: img.alt || `图片 ${extractedImages.length + 1}`,
						width: 400, // 默认宽度
						height: 300 // 默认高度
					});
				}
			}
		}
		
		logger.info('[CoverDesigner] 提取完成', { 
			totalFound: htmlImages.length,
			validImages: extractedImages.length,
			fromDOM: loadedImagesMap.size,
			validSrcs: extractedImages.map(img => img.src.substring(0, 100))
		});
		
		return extractedImages;
	}, [loadImageDimensions]);

	useEffect(() => {
		const extractImages = async () => {
			try {
				const images = await extractImagesFromHTML(articleHTML);
				setSelectedImages(images);
				logger.info('[CoverDesigner] 从文章中提取图片', { count: images.length });
			} catch (error) {
				logger.error('[CoverDesigner] 提取图片失败', { error });
				setSelectedImages([]);
			}
		};
		
		extractImages();
	}, [articleHTML, extractImagesFromHTML]);

	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files) return;

		const imageFiles = Array.from(files).filter(file => 
			file.type.startsWith('image/')
		);

		setUploadedImages(prev => [...prev, ...imageFiles]);
		logger.info('[CoverDesigner] 上传图片', { count: imageFiles.length });
	}, []);

	const generateAIImage = useCallback(async (params: AIGenerateParams) => {
		setGenerationStatus({
			isGenerating: true,
			progress: 0,
			message: '正在准备生成...'
		});
		setGenerationError('');
		logger.info('[CoverDesigner] 开始生成AI图片', params);
		
		try {
			// 模拟进度更新
			const progressUpdates = [
				{ progress: 20, message: '正在处理提示词...' },
				{ progress: 40, message: '正在生成图像...' },
				{ progress: 60, message: '正在优化细节...' },
				{ progress: 80, message: '正在后处理...' },
				{ progress: 100, message: '生成完成!' }
			];

			for (const update of progressUpdates) {
				setGenerationStatus(prev => ({
					...prev,
					progress: update.progress,
					message: update.message
				}));
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			const dimensions = getDimensions(params.aspectRatio);
			const result = await imageGenerationService.generateImage({
				prompt: params.prompt,
				style: params.style,
				aspectRatio: params.aspectRatio,
				width: dimensions.width,
				height: dimensions.height
			});

			if (result.success && result.imageUrl) {
				setGeneratedImages(prev => [...prev, result.imageUrl!]);
				logger.info('[CoverDesigner] AI图片生成成功');
			} else {
				throw new Error(result.error || '生成失败');
			}
		} catch (error) {
			logger.error('[CoverDesigner] AI图片生成失败', error);
			setGenerationError(error instanceof Error ? error.message : '生成失败，请重试');
		} finally {
			setGenerationStatus({
				isGenerating: false,
				progress: 0,
				message: ''
			});
		}
	}, [getDimensions]);

	const createCover = useCallback(async (imageUrl: string, source: CoverImageSource) => {
		logger.info('[CoverDesigner] 开始创建封面', { imageUrl: imageUrl.substring(0, 100), source });
		
		const dimensions = getDimensions(selectedAspectRatio);
		const canvas = canvasRef.current;
		
		if (!canvas) {
			logger.error('[CoverDesigner] Canvas元素不存在');
			return;
		}
		
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			logger.error('[CoverDesigner] 无法获取Canvas上下文');
			return;
		}
		
		try {
			// 设置Canvas尺寸
			canvas.width = dimensions.width;
			canvas.height = dimensions.height;
			
			// 绘制白色背景
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			// 创建图片对象
			const img = new Image();
			
			// 处理跨域图片
			let finalImageUrl = imageUrl;
			if (imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)) {
				try {
					finalImageUrl = await loadImageAsBlob(imageUrl);
					logger.info('[CoverDesigner] 使用代理加载外部图片', { originalUrl: imageUrl.substring(0, 100) });
				} catch (error) {
					logger.error('[CoverDesigner] 代理加载失败，使用原URL', { error });
				}
			}
			
			return new Promise<void>((resolve, reject) => {
				img.onload = () => {
					try {
						logger.info('[CoverDesigner] 图片加载成功', { 
							imgWidth: img.width, 
							imgHeight: img.height, 
							imgComplete: img.complete,
							naturalWidth: img.naturalWidth,
							naturalHeight: img.naturalHeight
						});
						
						// 验证图片完整性
						if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
							throw new Error('图片数据无效');
						}
						
						// 计算绘制尺寸，保持图片比例
						const imgRatio = img.naturalWidth / img.naturalHeight;
						const canvasRatio = canvas.width / canvas.height;
						
						let drawWidth, drawHeight, x, y;
						
						if (imgRatio > canvasRatio) {
							// 图片更宽，以宽度为准
							drawWidth = canvas.width;
							drawHeight = canvas.width / imgRatio;
							x = 0;
							y = (canvas.height - drawHeight) / 2;
						} else {
							// 图片更高，以高度为准
							drawHeight = canvas.height;
							drawWidth = canvas.height * imgRatio;
							x = (canvas.width - drawWidth) / 2;
							y = 0;
						}
						
						logger.info('[CoverDesigner] 计算绘制尺寸', { drawWidth, drawHeight, x, y });
						
						// 绘制图片
						ctx.drawImage(img, x, y, drawWidth, drawHeight);
						
						// 如果有标题，绘制标题
						if (coverTitle) {
							ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
							ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
							
							ctx.fillStyle = '#ffffff';
							ctx.font = 'bold 14px Arial';
							ctx.textAlign = 'center';
							ctx.fillText(coverTitle, canvas.width / 2, canvas.height - 20);
						}
						
						// 检测是否绘制成功（避免黑色封面）
						const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
						const data = imageData.data;
						let hasNonBlackPixel = false;
						
						for (let i = 0; i < data.length; i += 4) {
							if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
								hasNonBlackPixel = true;
								break;
							}
						}
						
						if (!hasNonBlackPixel) {
							throw new Error('图像绘制失败，产生黑色封面');
						}
						
						// 创建封面数据
						const coverData: CoverData = {
							id: `cover-${Date.now()}-${Math.random()}`,
							imageUrl: canvas.toDataURL('image/png'),
							aspectRatio: selectedAspectRatio,
							width: dimensions.width,
							height: dimensions.height,
							title: coverTitle,
							description: coverDescription
						};
						
						logger.info('[CoverDesigner] 封面创建成功');
						setPreviewCovers(prev => [...prev, coverData]);
						resolve();
					} catch (error) {
						logger.error('[CoverDesigner] Canvas绘制失败', { error });
						reject(error);
					}
				};
				
				img.onerror = (error) => {
					logger.error('[CoverDesigner] 图片加载失败', { error });
					reject(error);
				};
				
				img.src = finalImageUrl;
			});
		} catch (error) {
			logger.error('[CoverDesigner] 创建封面失败', { error });
		}
	}, [selectedAspectRatio, getDimensions, coverTitle, coverDescription]);

	const createCombinedCover = useCallback((covers: CoverData[]) => {
		if (covers.length < 2) return null;

		const canvas = canvasRef.current;
		if (!canvas) return null;

		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		// 3.25:1 比例
		const combinedWidth = 650;
		const combinedHeight = 200;
		canvas.width = combinedWidth;
		canvas.height = combinedHeight;

		// 绘制背景
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 绘制左侧封面
		const leftCover = covers[0];
		const leftImg = new Image();
		leftImg.onload = () => {
			ctx.drawImage(leftImg, 0, 0, 225, 200);
			
			// 绘制右侧封面
			const rightCover = covers[1];
			const rightImg = new Image();
			rightImg.onload = () => {
				ctx.drawImage(rightImg, 225, 0, 225, 200);
				
				// 绘制中间分割线
				ctx.strokeStyle = '#e0e0e0';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(225, 0);
				ctx.lineTo(225, 200);
				ctx.stroke();

				// 创建合并封面
				const combinedCover: CoverData = {
					id: `combined-${Date.now()}`,
					imageUrl: canvas.toDataURL('image/png'),
					aspectRatio: 'custom',
					width: combinedWidth,
					height: combinedHeight,
					title: '合并封面',
					description: '公众号专用 3.25:1 比例'
				};

				setPreviewCovers(prev => [...prev, combinedCover]);
			};
			rightImg.src = rightCover.imageUrl;
		};
		leftImg.src = leftCover.imageUrl;
	}, []);

	const handleDownloadCovers = useCallback(() => {
		if (previewCovers.length === 0) return;

		// 自动生成合并封面
		const standardCovers = previewCovers.filter(cover => 
			cover.aspectRatio !== 'custom' || cover.width !== 650
		);
		
		if (standardCovers.length >= 2) {
			createCombinedCover(standardCovers.slice(0, 2));
		}

		// 延迟下载，确保合并封面已生成
		setTimeout(() => {
			onDownloadCovers(previewCovers);
		}, 500);
	}, [previewCovers, createCombinedCover, onDownloadCovers]);

	const renderImageGrid = useCallback((images: string[], onImageClick: (url: string) => Promise<void>) => {
		logger.info('[CoverDesigner] 渲染图片网格', { imageCount: images.length, firstImageUrl: images[0]?.substring(0, 100) });
		
		return (
			<div className="grid grid-cols-2 gap-2 mt-3">
				{images.map((imageUrl, index) => {
					logger.info(`[CoverDesigner] 渲染图片 ${index + 1}`, { src: imageUrl.substring(0, 100) });
					
					return (
						<div
							key={index}
							className="relative border border-gray-200 rounded overflow-hidden hover:border-blue-500 cursor-pointer transition-colors"
							onClick={() => onImageClick(imageUrl)}
						>
							<img
								src={imageUrl}
								alt={`Image ${index + 1}`}
								className="w-full h-20 object-cover"
								onLoad={(e) => {
									logger.info(`[CoverDesigner] 图片加载成功 ${index + 1}`, { 
										src: imageUrl.substring(0, 100),
										naturalWidth: e.currentTarget.naturalWidth,
										naturalHeight: e.currentTarget.naturalHeight
									});
								}}
								onError={(e) => {
									logger.error(`[CoverDesigner] 图片加载失败 ${index + 1}`, { 
										src: imageUrl,
										error: e
									});
								}}
							/>
							{/* 调试信息显示 */}
							<div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1">
								{index + 1}
							</div>
						</div>
					);
				})}
			</div>
		);
	}, []);

	return (
		<div className="w-full">
			<div className="mb-4">
				<h3 className="text-lg font-semibold text-gray-800">🎨 封面设计</h3>
				<p className="text-sm text-gray-600 mt-1">为您的文章制作专业的封面图片</p>
			</div>

			{/* 比例选择 */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					📏 封面比例
				</label>
				<div className="flex space-x-2">
					<button
						onClick={() => setSelectedAspectRatio('2.25:1')}
						className={`px-3 py-1 text-sm rounded border ${
							selectedAspectRatio === '2.25:1'
								? 'bg-blue-500 text-white border-blue-500'
								: 'bg-white text-gray-700 border-gray-300'
						}`}
					>
						2.25:1
					</button>
					<button
						onClick={() => setSelectedAspectRatio('1:1')}
						className={`px-3 py-1 text-sm rounded border ${
							selectedAspectRatio === '1:1'
								? 'bg-blue-500 text-white border-blue-500'
								: 'bg-white text-gray-700 border-gray-300'
						}`}
					>
						1:1
					</button>
					<button
						onClick={() => setSelectedAspectRatio('custom')}
						className={`px-3 py-1 text-sm rounded border ${
							selectedAspectRatio === 'custom'
								? 'bg-blue-500 text-white border-blue-500'
								: 'bg-white text-gray-700 border-gray-300'
						}`}
					>
						自定义
					</button>
				</div>
				
				{selectedAspectRatio === 'custom' && (
					<div className="mt-2 flex space-x-2">
						<div>
							<label className="block text-xs text-gray-600">宽</label>
							<input
								type="number"
								value={customWidth}
								onChange={(e) => setCustomWidth(Number(e.target.value))}
								className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
							/>
						</div>
						<div>
							<label className="block text-xs text-gray-600">高</label>
							<input
								type="number"
								value={customHeight}
								onChange={(e) => setCustomHeight(Number(e.target.value))}
								className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
							/>
						</div>
					</div>
				)}
			</div>

			{/* 封面文本 */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						📝 标题
					</label>
					<input
						type="text"
						value={coverTitle}
						onChange={(e) => setCoverTitle(e.target.value)}
						placeholder="可选"
						className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						💬 描述
					</label>
					<input
						type="text"
						value={coverDescription}
						onChange={(e) => setCoverDescription(e.target.value)}
						placeholder="可选"
						className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>
			</div>

			{/* 图片来源选择 */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					🖼️ 图片来源
				</label>
				<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CoverImageSource)}>
					<TabsList>
						<TabsTrigger value="article">文中图片</TabsTrigger>
						<TabsTrigger value="upload">本地上传</TabsTrigger>
						<TabsTrigger value="ai">AI生成</TabsTrigger>
					</TabsList>

								<TabsContent value="article">
									<div className="space-y-4">
										<p className="text-sm text-gray-600">
											从文章中选择图片制作封面
										</p>
										<div className="mb-2 text-xs text-gray-600">
											调试信息: 找到 {selectedImages.length} 张图片
											{selectedImages.length > 0 && (
												<div className="mt-1">
													第一张: {selectedImages[0]?.src?.substring(0, 80)}...
												</div>
											)}
										</div>
										
										{selectedImages.length > 0 ? (
											renderImageGrid(
												selectedImages.map(img => img.src),
												async (url) => await createCover(url, 'article')
											)
										) : (
											<div className="text-center py-8 text-gray-500">
												文章中没有找到图片
											</div>
										)}
									</div>
								</TabsContent>

								<TabsContent value="upload">
									<div className="space-y-4">
										<div className="flex items-center space-x-4">
											<button
												onClick={() => fileInputRef.current?.click()}
												className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
											>
												选择图片
											</button>
											<span className="text-sm text-gray-600">
												支持 JPG、PNG、GIF 格式
											</span>
										</div>
										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											multiple
											onChange={handleFileUpload}
											className="hidden"
										/>
										{uploadedImages.length > 0 && (
											renderImageGrid(
												uploadedImages.map(file => URL.createObjectURL(file)),
												async (url) => await createCover(url, 'upload')
											)
										)}
									</div>
								</TabsContent>

					<TabsContent value="ai">
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									描述想要的封面
								</label>
								<textarea
									value={aiPrompt}
									onChange={(e) => setAiPrompt(e.target.value)}
									placeholder="例如：科技感蓝色背景，适合科技文章"
									rows={2}
									className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										风格
									</label>
									<select
										value={aiStyle}
										onChange={(e) => setAiStyle(e.target.value)}
										className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
									>
										<option value="realistic">写实</option>
										<option value="illustration">插画</option>
										<option value="minimalist">简约</option>
										<option value="abstract">抽象</option>
										<option value="tech">科技</option>
									</select>
								</div>
								<div className="flex items-end">
									<button
										onClick={() => generateAIImage({
											prompt: aiPrompt,
											style: aiStyle,
											aspectRatio: selectedAspectRatio
										})}
										disabled={!aiPrompt || generationStatus.isGenerating}
										className="w-full px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{generationStatus.isGenerating ? '生成中' : '生成'}
									</button>
								</div>
							</div>
										
						{/* 生成进度条 */}
						{generationStatus.isGenerating && (
							<div className="space-y-2">
								<div className="w-full bg-gray-200 rounded-full h-1">
									<div 
										className="bg-purple-500 h-1 rounded-full transition-all duration-300 ease-out"
										style={{ width: `${generationStatus.progress}%` }}
									/>
								</div>
								<div className="text-xs text-gray-600 text-center">
									{generationStatus.message}
								</div>
							</div>
						)}
										
						{/* 错误信息 */}
						{generationError && (
							<div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
								<div className="flex items-center justify-between">
									<span>{generationError}</span>
									<button
										onClick={() => setGenerationError('')}
										className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
									>
										重试
									</button>
								</div>
							</div>
						)}
										{generatedImages.length > 0 && (
											renderImageGrid(
												generatedImages,
												async (url) => await createCover(url, 'ai')
											)
										)}
									</div>
								</TabsContent>
				</Tabs>
			</div>

			{/* 预览区域 */}
			{previewCovers.length > 0 && (
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						👀 封面预览
					</label>
					<div className="space-y-2">
						{previewCovers.map((cover, index) => (
							<div key={cover.id} className="border border-gray-200 rounded p-2">
								<div 
									className="w-full border border-gray-300 rounded overflow-hidden"
									style={{ 
										height: '120px',
										backgroundImage: `url(${cover.imageUrl})`,
										backgroundSize: 'cover',
										backgroundPosition: 'center',
										backgroundRepeat: 'no-repeat'
									}}
								>
									{cover.title && (
										<div className="h-full flex items-end">
											<div className="w-full bg-black bg-opacity-50 text-white text-center py-1 text-xs">
												{cover.title}
											</div>
										</div>
									)}
								</div>
								<div className="mt-1 text-xs text-gray-600">
									{cover.aspectRatio === 'custom' && cover.width === 650 
										? '3.25:1 合并封面' 
										: `${cover.aspectRatio} (${cover.width}x${cover.height})`
									}
								</div>
							</div>
						))}
					</div>
					
					<div className="flex space-x-2 mt-3">
						<button
							onClick={handleDownloadCovers}
							className="flex-1 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
						>
							📥 下载所有封面
						</button>
						<button
							onClick={() => setPreviewCovers([])}
							className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
						>
							清空
						</button>
					</div>
				</div>
			)}

			{/* 隐藏的 canvas 元素 */}
			<canvas ref={canvasRef} style={{ display: 'none' }} />
		</div>
	);
};