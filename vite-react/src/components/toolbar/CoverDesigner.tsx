import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {logger} from '../../../../src/logger';
import {imageGenerationService} from '../../services/imageGenerationService';
import {loadImageAsBlob} from '../../utils/imageProxy';
import {CoverPreview} from "@/components/toolbar/CoverPreview";
import {CoverData} from "@/components/toolbar/CoverData";

export type CoverAspectRatio = '2.25:1' | '1:1' | 'custom';
export type CoverImageSource = 'article' | 'upload' | 'ai';

interface CoverDesignerProps {
	articleHTML: string;
	onDownloadCovers: (covers: CoverData[]) => void;
	onClose: () => void;
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

export const CoverDesigner: React.FC<CoverDesignerProps> = ({
																articleHTML,
																onDownloadCovers,
																onClose
															}) => {
	// 当前选中的封面 (1 或 2)
	const [selectedCover, setSelectedCover] = useState<1 | 2>(1);

	// 封面1的状态 - 固定为2.25:1比例
	const [cover1] = useState({id: 1, name: '封面1', aspectRatio: '2.25:1' as CoverAspectRatio});
	const [cover1ActiveTab, setCover1ActiveTab] = useState<CoverImageSource>('article');
	const [cover1UploadedImages, setCover1UploadedImages] = useState<File[]>([]);
	const [cover1AiPrompt, setCover1AiPrompt] = useState<string>('');
	const [cover1AiStyle, setCover1AiStyle] = useState<string>('realistic');
	const [cover1GeneratedImages, setCover1GeneratedImages] = useState<string[]>([]);
	const [cover1Title, setCover1Title] = useState<string>('');
	const [cover1Description, setCover1Description] = useState<string>('');
	const [cover1PreviewCovers, setCover1PreviewCovers] = useState<CoverData[]>([]);

	// 封面2的状态 - 固定为1:1比例
	const [cover2] = useState({id: 2, name: '封面2', aspectRatio: '1:1' as CoverAspectRatio});
	const [cover2ActiveTab, setCover2ActiveTab] = useState<CoverImageSource>('article');
	const [cover2UploadedImages, setCover2UploadedImages] = useState<File[]>([]);
	const [cover2AiPrompt, setCover2AiPrompt] = useState<string>('');
	const [cover2AiStyle, setCover2AiStyle] = useState<string>('realistic');
	const [cover2GeneratedImages, setCover2GeneratedImages] = useState<string[]>([]);
	const [cover2Title, setCover2Title] = useState<string>('');
	const [cover2Description, setCover2Description] = useState<string>('');
	const [cover2PreviewCovers, setCover2PreviewCovers] = useState<CoverData[]>([]);

	// 共享状态
	const [selectedImages, setSelectedImages] = useState<ExtractedImage[]>([]);
	const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
		isGenerating: false,
		progress: 0,
		message: ''
	});
	const [generationError, setGenerationError] = useState<string>('');

	const canvasRef = useRef<HTMLCanvasElement>(null);

	// 清理Blob URLs以避免内存泄漏（只清理下载时生成的Blob URLs）
	useEffect(() => {
		return () => {
			// 组件卸载时清理所有可能的Blob URLs
			// 注意：预览URL现在是原始URL，不需要清理
			// 只有下载时生成的Blob URLs需要清理，但这些会在下载完成后立即清理
		};
	}, []);

	const getDimensions = useCallback((coverNum: 1 | 2) => {
		if (coverNum === 1) {
			// 封面1固定为2.25:1比例
			return {width: 450, height: 200, aspectRatio: '2.25:1' as CoverAspectRatio};
		} else {
			// 封面2固定为1:1比例，高度与封面1保持一致
			return {width: 200, height: 200, aspectRatio: '1:1' as CoverAspectRatio};
		}
	}, []);

	// Helper function to load image and get dimensions
	const loadImageDimensions = useCallback((src: string): Promise<{ src: string, width: number, height: number }> => {
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
				logger.error('[CoverDesigner] 图片加载失败', {src: src.substring(0, 100), error});
				reject(error);
			};
			img.src = src;
		});
	}, []);

	const extractImagesFromHTML = useCallback(async (html: string): Promise<ExtractedImage[]> => {
		logger.info('[CoverDesigner] 开始提取图片', {htmlLength: html.length});

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

		logger.info('[CoverDesigner] 找到HTML图片元素', {count: htmlImages.length});

		const extractedImages: ExtractedImage[] = [];

		for (const img of htmlImages) {
			let src = img.src || img.getAttribute('src') || '';

			// 如果是空的或者无效的src，尝试其他属性
			if (!src || src === '' || src === window.location.href) {
				const dataSrc = img.getAttribute('data-src');
				const lazySrc = img.getAttribute('lazy-src');
				src = dataSrc || lazySrc || '';
				logger.info(`[CoverDesigner] 尝试备用属性`, {dataSrc, lazySrc, finalSrc: src});
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

					logger.info(`[CoverDesigner] 路径转换`, {originalSrc, convertedSrc: src});
				} catch (error) {
					logger.error(`[CoverDesigner] 路径转换失败`, {originalSrc, error});
				}
			}

			// 验证URL有效性
			const isValidUrl = src &&
				src !== '' &&
				src !== window.location.href &&
				!src.endsWith('#') &&
				(src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:'));

			if (!isValidUrl) {
				logger.warn('[CoverDesigner] 跳过无效图片', {src, reason: '无效的URL格式'});
				continue;
			}

			// 检查是否已从DOM中获取
			if (loadedImagesMap.has(src)) {
				extractedImages.push(loadedImagesMap.get(src)!);
				logger.info('[CoverDesigner] 使用DOM缓存图片', {src: src.substring(0, 100)});
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
					logger.info('[CoverDesigner] 成功加载新图片', {src: src.substring(0, 100)});
				} catch (error) {
					logger.error('[CoverDesigner] 获取图片尺寸失败', {src: src.substring(0, 100), error});
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
				logger.info('[CoverDesigner] 从文章中提取图片', {count: images.length});
			} catch (error) {
				logger.error('[CoverDesigner] 提取图片失败', {error});
				setSelectedImages([]);
			}
		};

		extractImages();
	}, [articleHTML, extractImagesFromHTML]);

	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, coverNum: 1 | 2) => {
		const files = event.target.files;
		if (!files) return;

		const imageFiles = Array.from(files).filter(file =>
			file.type.startsWith('image/')
		);

		if (coverNum === 1) {
			setCover1UploadedImages(prev => [...prev, ...imageFiles]);
		} else {
			setCover2UploadedImages(prev => [...prev, ...imageFiles]);
		}
		logger.info(`[CoverDesigner] 封面${coverNum}上传图片`, {count: imageFiles.length});
	}, []);

	const generateAIImage = useCallback(async (params: AIGenerateParams, coverNum: 1 | 2) => {
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
				{progress: 20, message: '正在处理提示词...'},
				{progress: 40, message: '正在生成图像...'},
				{progress: 60, message: '正在优化细节...'},
				{progress: 80, message: '正在后处理...'},
				{progress: 100, message: '生成完成!'}
			];

			for (const update of progressUpdates) {
				setGenerationStatus(prev => ({
					...prev,
					progress: update.progress,
					message: update.message
				}));
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			const dimensions = getDimensions(coverNum);
			const result = await imageGenerationService.generateImage({
				prompt: params.prompt,
				style: params.style,
				aspectRatio: params.aspectRatio,
				width: dimensions.width,
				height: dimensions.height
			});

			if (result.success && result.imageUrl) {
				if (coverNum === 1) {
					setCover1GeneratedImages(prev => [...prev, result.imageUrl!]);
				} else {
					setCover2GeneratedImages(prev => [...prev, result.imageUrl!]);
				}
				logger.info(`[CoverDesigner] 封面${coverNum} AI图片生成成功`);
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

	const createCover = useCallback(async (imageUrl: string, source: CoverImageSource, coverNum: 1 | 2) => {
		logger.info(`[CoverDesigner] 开始创建封面${coverNum}`, {imageUrl: imageUrl.substring(0, 100), source});

		const dimensions = getDimensions(coverNum);
		const finalTitle = coverNum === 1 ? cover1Title : cover2Title;
		const finalDescription = coverNum === 1 ? cover1Description : cover2Description;

		// 直接创建封面数据，使用原始图片URL进行预览
		const coverData: CoverData = {
			id: `cover${coverNum}-${Date.now()}-${Math.random()}`,
			imageUrl: imageUrl, // 直接使用原始图片URL
			aspectRatio: dimensions.aspectRatio,
			width: dimensions.width,
			height: dimensions.height,
			title: finalTitle,
			description: finalDescription
		};

		logger.info(`[CoverDesigner] 封面${coverNum}创建成功（使用原始图片预览）`, {
			originalUrl: imageUrl.substring(0, 100),
			aspectRatio: dimensions.aspectRatio,
			dimensions: `${dimensions.width}x${dimensions.height}`
		});

		if (coverNum === 1) {
			setCover1PreviewCovers([coverData]); // 只保留最新的一个封面
		} else {
			setCover2PreviewCovers([coverData]); // 只保留最新的一个封面
		}
	}, [getDimensions, cover1Title, cover1Description, cover2Title, cover2Description]);

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
				canvas.toBlob((blob) => {
					if (blob) {
						const combinedCover: CoverData = {
							id: `combined-${Date.now()}`,
							imageUrl: URL.createObjectURL(blob),
							aspectRatio: 'custom',
							width: combinedWidth,
							height: combinedHeight,
							title: '合并封面',
							description: '公众号专用 3.25:1 比例'
						};
						setCover1PreviewCovers(prev => [...prev, combinedCover]);
					}
				}, 'image/jpeg', 0.8);
			};
			rightImg.src = rightCover.imageUrl;
		};
		leftImg.src = leftCover.imageUrl;
	}, []);

	// 处理单个封面的Canvas渲染（用于下载）
	const renderCoverToCanvas = useCallback(async (coverData: CoverData): Promise<CoverData> => {
		const canvas = canvasRef.current;
		if (!canvas) throw new Error('Canvas元素不存在');

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('无法获取Canvas上下文');

		// 设置Canvas尺寸
		canvas.width = coverData.width;
		canvas.height = coverData.height;

		// 绘制白色背景
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 创建图片对象
		const img = new Image();

		// 处理跨域图片
		let finalImageUrl = coverData.imageUrl;
		if (coverData.imageUrl.startsWith('http') && !coverData.imageUrl.includes(window.location.hostname)) {
			try {
				finalImageUrl = await loadImageAsBlob(coverData.imageUrl);
				logger.info('[CoverDesigner] 下载时使用代理加载外部图片', {originalUrl: coverData.imageUrl.substring(0, 100)});
			} catch (error) {
				logger.error('[CoverDesigner] 代理加载失败，使用原URL', {error});
			}
		}

		return new Promise<CoverData>((resolve, reject) => {
			img.onload = async () => {
				try {
					// 计算绘制尺寸，保持图片比例
					const imgRatio = img.naturalWidth / img.naturalHeight;
					const canvasRatio = canvas.width / canvas.height;

					let drawWidth, drawHeight, x, y;

					if (imgRatio > canvasRatio) {
						drawWidth = canvas.width;
						drawHeight = canvas.width / imgRatio;
						x = 0;
						y = (canvas.height - drawHeight) / 2;
					} else {
						drawHeight = canvas.height;
						drawWidth = canvas.height * imgRatio;
						x = (canvas.width - drawWidth) / 2;
						y = 0;
					}

					// 绘制图片
					ctx.drawImage(img, x, y, drawWidth, drawHeight);

					// 如果有标题，绘制标题
					if (coverData.title) {
						ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
						ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

						ctx.fillStyle = '#ffffff';
						ctx.font = 'bold 14px Arial';
						ctx.textAlign = 'center';
						ctx.fillText(coverData.title, canvas.width / 2, canvas.height - 20);
					}

					// 生成下载用的图片
					const blobPromise = new Promise<string>((resolve, reject) => {
						canvas.toBlob((blob) => {
							if (blob) {
								const url = URL.createObjectURL(blob);
								resolve(url);
							} else {
								reject(new Error('Blob创建失败'));
							}
						}, 'image/jpeg', 0.9);
					});

					const downloadImageUrl = await blobPromise;

					// 返回用于下载的封面数据
					const downloadCoverData: CoverData = {
						...coverData,
						imageUrl: downloadImageUrl
					};

					resolve(downloadCoverData);
				} catch (error) {
					reject(error);
				}
			};

			img.onerror = (error) => {
				reject(error);
			};

			img.src = finalImageUrl;
		});
	}, [loadImageAsBlob]);

	const handleDownloadCovers = useCallback(async () => {
		const allCovers = [...cover1PreviewCovers, ...cover2PreviewCovers];
		if (allCovers.length === 0) return;

		try {
			// 渲染所有封面到Canvas并生成下载链接
			const downloadCovers = await Promise.all(
				allCovers.map(cover => renderCoverToCanvas(cover))
			);

			// 自动生成合并封面
			if (downloadCovers.length >= 2) {
				createCombinedCover(downloadCovers.slice(0, 2));
			}

			// 下载处理后的封面
			onDownloadCovers(downloadCovers);
		} catch (error) {
			logger.error('[CoverDesigner] 下载封面失败', {error});
		}
	}, [cover1PreviewCovers, cover2PreviewCovers, renderCoverToCanvas, createCombinedCover, onDownloadCovers]);

	const renderImageGrid = useCallback((images: string[], onImageClick: (url: string) => Promise<void>, coverNum: 1 | 2) => {
		logger.info(`[CoverDesigner] 封面${coverNum}渲染图片网格`, {
			imageCount: images.length,
			firstImageUrl: images[0]?.substring(0, 100)
		});

		return (
			<div className="grid grid-cols-2 gap-2 mt-3">
				{images.map((imageUrl, index) => {
					logger.info(`[CoverDesigner] 封面${coverNum}渲染图片 ${index + 1}`, {src: imageUrl.substring(0, 100)});

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
									logger.info(`[CoverDesigner] 封面${coverNum}图片加载成功 ${index + 1}`, {
										src: imageUrl.substring(0, 100),
										naturalWidth: e.currentTarget.naturalWidth,
										naturalHeight: e.currentTarget.naturalHeight
									});
								}}
								onError={(e) => {
									logger.error(`[CoverDesigner] 封面${coverNum}图片加载失败 ${index + 1}`, {
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

	// 获取当前选中封面的状态
	const getCurrentCoverState = () => {
		if (selectedCover === 1) {
			return {
				activeTab: cover1ActiveTab,
				setActiveTab: setCover1ActiveTab,
				aspectRatio: cover1.aspectRatio,
				uploadedImages: cover1UploadedImages,
				setUploadedImages: setCover1UploadedImages,
				aiPrompt: cover1AiPrompt,
				setAiPrompt: setCover1AiPrompt,
				aiStyle: cover1AiStyle,
				setAiStyle: setCover1AiStyle,
				generatedImages: cover1GeneratedImages,
				title: cover1Title,
				setTitle: setCover1Title,
				description: cover1Description,
				setDescription: setCover1Description,
				previewCovers: cover1PreviewCovers,
				setPreviewCovers: setCover1PreviewCovers
			};
		} else {
			return {
				activeTab: cover2ActiveTab,
				setActiveTab: setCover2ActiveTab,
				aspectRatio: cover2.aspectRatio,
				uploadedImages: cover2UploadedImages,
				setUploadedImages: setCover2UploadedImages,
				aiPrompt: cover2AiPrompt,
				setAiPrompt: setCover2AiPrompt,
				aiStyle: cover2AiStyle,
				setAiStyle: setCover2AiStyle,
				generatedImages: cover2GeneratedImages,
				title: cover2Title,
				setTitle: setCover2Title,
				description: cover2Description,
				setDescription: setCover2Description,
				previewCovers: cover2PreviewCovers,
				setPreviewCovers: setCover2PreviewCovers
			};
		}
	};

	const currentState = getCurrentCoverState();
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="w-full">
			<div className="mb-4">
				<h3 className="text-lg font-semibold text-gray-800">🎨 封面设计</h3>
				<p className="text-sm text-gray-600 mt-1">为您的文章制作专业的封面图片</p>
			</div>


			{/* 封面选择器 */}
			<div className="mb-4">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					⚙️ 封面设置
				</label>
				<div className="flex space-x-2">
					<button
						onClick={() => setSelectedCover(1)}
						className={`px-4 py-2 text-sm rounded border ${
							selectedCover === 1
								? 'bg-blue-500 text-white border-blue-500'
								: 'bg-white text-gray-700 border-gray-300'
						}`}
					>
						设置封面1
					</button>
					<button
						onClick={() => setSelectedCover(2)}
						className={`px-4 py-2 text-sm rounded border ${
							selectedCover === 2
								? 'bg-blue-500 text-white border-blue-500'
								: 'bg-white text-gray-700 border-gray-300'
						}`}
					>
						设置封面2
					</button>
				</div>
			</div>


			{/* 预览区域 */}
			<div className="mb-6">
				<div className="grid grid-cols-[2.25fr_1fr] gap-4 w-full">
					<CoverPreview
						coverData={cover1PreviewCovers[0]}
						aspectRatio={2.25}
						label="封面1"
						onClear={() => setCover1PreviewCovers([])}
						placeholder="暂无封面1预览"
					/>
					<CoverPreview
						coverData={cover2PreviewCovers[0]}
						aspectRatio={1}
						label="封面2"
						onClear={() => setCover2PreviewCovers([])}
						placeholder="暂无封面2预览"
					/>
				</div>


				{/* 下载按钮 */}
				{(cover1PreviewCovers.length > 0 || cover2PreviewCovers.length > 0) && (
					<div className="flex space-x-2 mt-4">
						<button
							onClick={handleDownloadCovers}
							className="flex-1 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
						>
							📥 下载封面
							({(cover1PreviewCovers.length > 0 ? 1 : 0) + (cover2PreviewCovers.length > 0 ? 1 : 0)})
						</button>
						<button
							onClick={() => {
								setCover1PreviewCovers([]);
								setCover2PreviewCovers([]);
							}}
							className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
						>
							清空全部
						</button>
					</div>
				)}
			</div>


			{/* 图片来源选择 */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					🖼️ {selectedCover === 1 ? '封面1' : '封面2'}图片来源
				</label>
				<Tabs value={currentState.activeTab}
					  onValueChange={(value) => currentState.setActiveTab(value as CoverImageSource)}>
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
									async (url) => await createCover(url, 'article', selectedCover),
									selectedCover
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
									为{selectedCover === 1 ? '封面1' : '封面2'}选择图片
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
								onChange={(e) => handleFileUpload(e, selectedCover)}
								className="hidden"
							/>
							{currentState.uploadedImages.length > 0 && (
								renderImageGrid(
									currentState.uploadedImages.map(file => URL.createObjectURL(file)),
									async (url) => await createCover(url, 'upload', selectedCover),
									selectedCover
								)
							)}
						</div>
					</TabsContent>

					<TabsContent value="ai">
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									描述{selectedCover === 1 ? '封面1' : '封面2'}想要的封面
								</label>
								<textarea
									value={currentState.aiPrompt}
									onChange={(e) => currentState.setAiPrompt(e.target.value)}
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
										value={currentState.aiStyle}
										onChange={(e) => currentState.setAiStyle(e.target.value)}
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
											prompt: currentState.aiPrompt,
											style: currentState.aiStyle,
											aspectRatio: currentState.aspectRatio
										}, selectedCover)}
										disabled={!currentState.aiPrompt || generationStatus.isGenerating}
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
											style={{width: `${generationStatus.progress}%`}}
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
							{currentState.generatedImages.length > 0 && (
								renderImageGrid(
									currentState.generatedImages,
									async (url) => await createCover(url, 'ai', selectedCover),
									selectedCover
								)
							)}
						</div>
					</TabsContent>
				</Tabs>
			</div>


			{/* 隐藏的 canvas 元素 */}
			<canvas ref={canvasRef} style={{display: 'none'}}/>
		</div>
	);
};
