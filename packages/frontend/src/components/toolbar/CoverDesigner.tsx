import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select.tsx';
import {CoverPreview} from "@/components/toolbar/CoverPreview";
import {CoverData} from "@/components/toolbar/CoverData";
import {CoverEditor} from "@/components/toolbar/CoverEditor";
import {
	CoverAspectRatio,
	CoverImageSource,
	ExtractedImage,
	GenerationStatus
} from "@/components/toolbar/cover/types";
import {logger} from "../../../../shared/src/logger";
import { Image, Download, RotateCcw, Settings, Layers } from "lucide-react";

interface CoverDesignerProps {
	articleHTML: string;
	onDownloadCovers: (covers: CoverData[]) => void;
	onClose: () => void;
}


export const CoverDesigner: React.FC<CoverDesignerProps> = ({
																articleHTML,
																onDownloadCovers,
																onClose
															}) => {
	// 当前选中的封面 (1 或 2)
	const [selectedCover, setSelectedCover] = useState<1 | 2>(1);

	// 封面预览状态
	const [cover1PreviewCovers, setCover1PreviewCovers] = useState<CoverData[]>([]);
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

	const getDimensions = useCallback((coverNum: 1 | 2) => {
		if (coverNum === 1) {
			// 封面1固定为2.25:1比例，提高分辨率
			return {width: 1350, height: 600, aspectRatio: '2.25:1' as CoverAspectRatio};
		} else {
			// 封面2固定为1:1比例，高度与封面1保持一致
			return {width: 600, height: 600, aspectRatio: '1:1' as CoverAspectRatio};
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
				const dataSrc = img.getAttribute('data-obsidian');
				const lazySrc = img.getAttribute('lazy-obsidian');
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


	const createCover = useCallback(async (imageUrl: string, source: CoverImageSource, coverNum: 1 | 2) => {
		logger.info(`[CoverDesigner] 开始创建封面${coverNum}`, {imageUrl: imageUrl.substring(0, 100), source});

		const dimensions = getDimensions(coverNum);

		// 直接创建封面数据，使用原始图片URL进行预览
		const coverData: CoverData = {
			id: `cover${coverNum}-${Date.now()}-${Math.random()}`,
			imageUrl: imageUrl, // 直接使用原始图片URL
			aspectRatio: dimensions.aspectRatio,
			width: dimensions.width,
			height: dimensions.height,
			title: '',
			description: ''
		};

		logger.info(`[CoverDesigner] 封面${coverNum}创建成功（使用原始图片预览）`, {
			originalUrl: imageUrl.substring(0, 100),
			aspectRatio: dimensions.aspectRatio,
			dimensions: `${dimensions.width}x${dimensions.height}`
		});

		if (coverNum === 1) {
			setCover1PreviewCovers([coverData]);
		} else {
			setCover2PreviewCovers([coverData]);
		}
	}, [getDimensions]);

	const handleDownloadCovers = useCallback(async () => {
		const covers = [...cover1PreviewCovers, ...cover2PreviewCovers];
		onDownloadCovers(covers);
	}, [cover1PreviewCovers, cover2PreviewCovers, onDownloadCovers]);


	return (
		<div className="space-y-6">
			{/* 头部说明 */}
			<div className="text-center">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">封面设计工作室</h3>
				<p className="text-gray-600">为您的文章制作专业的多尺寸封面图片</p>
			</div>

			{/* 封面配置卡片 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-orange-100 rounded-lg">
						<Settings className="h-5 w-5 text-orange-600" />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">封面配置</h4>
						<p className="text-sm text-gray-600">选择要编辑的封面和管理输出</p>
					</div>
				</div>
				
				<div className="flex items-center gap-3">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							当前编辑封面
						</label>
						<Select value={selectedCover.toString()}
								onValueChange={(value) => setSelectedCover(parseInt(value) as 1 | 2)}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="选择要设置的封面"/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">
									<div className="flex items-center gap-2">
										<Layers className="h-4 w-4 text-blue-600" />
										<span>封面1 (2.25:1 横版)</span>
									</div>
								</SelectItem>
								<SelectItem value="2">
									<div className="flex items-center gap-2">
										<Image className="h-4 w-4 text-purple-600" />
										<span>封面2 (1:1 方形)</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-2">
						<button
							onClick={handleDownloadCovers}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={cover1PreviewCovers.length === 0 && cover2PreviewCovers.length === 0}
						>
							<Download className="h-4 w-4" />
							<span className="text-sm font-medium">
								下载封面 ({(cover1PreviewCovers.length > 0 ? 1 : 0) + (cover2PreviewCovers.length > 0 ? 1 : 0)})
							</span>
						</button>
						<button
							disabled={cover1PreviewCovers.length === 0 && cover2PreviewCovers.length === 0}
							onClick={() => {
								setCover1PreviewCovers([]);
								setCover2PreviewCovers([]);
							}}
							className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<RotateCcw className="h-4 w-4" />
							<span className="text-sm font-medium">清空全部</span>
						</button>
					</div>
				</div>
			</div>


			{/* 预览区域 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-blue-100 rounded-lg">
						<Image className="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">封面预览</h4>
						<p className="text-sm text-gray-600">查看生成的封面效果</p>
					</div>
				</div>
				
				<div className="grid grid-cols-[2.25fr_1fr] gap-6 w-full">
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
			</div>

			{/* 图片来源选择 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<CoverEditor
					coverNumber={selectedCover}
					aspectRatio={selectedCover === 1 ? '2.25:1' : '1:1'}
					selectedImages={selectedImages}
					onCreateCover={async (imageUrl, source) => await createCover(imageUrl, source, selectedCover)}
					getDimensions={() => getDimensions(selectedCover)}
					generationStatus={generationStatus}
					setGenerationStatus={setGenerationStatus}
					generationError={generationError}
					setGenerationError={setGenerationError}
				/>
			</div>

			{/* 隐藏的 canvas 元素 */}
			<canvas ref={canvasRef} style={{display: 'none'}}/>
		</div>
	);
};
