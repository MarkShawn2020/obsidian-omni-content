import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {logger} from '../../../../src/logger';
import {loadImageAsBlob} from '../../utils/imageProxy';
import {CoverPreview} from "@/components/toolbar/CoverPreview";
import {CoverData} from "@/components/toolbar/CoverData";
import {CoverEditor} from "@/components/toolbar/CoverEditor";

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
			ctx.drawImage(leftImg, 0, 0, 325, 200);

			// 绘制右侧封面
			const rightCover = covers[1];
			const rightImg = new Image();
			rightImg.onload = () => {
				ctx.drawImage(rightImg, 325, 0, 325, 200);

				// 绘制中间分割线
				ctx.strokeStyle = '#e0e0e0';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(325, 0);
				ctx.lineTo(325, 200);
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

	// 将已加载的图片转换为本地blob URL，避免Canvas污染
	const convertImageToBlob = useCallback(async (imageElement: HTMLImageElement): Promise<string> => {
		const tempCanvas = document.createElement('canvas');
		const tempCtx = tempCanvas.getContext('2d');
		
		if (!tempCtx) {
			throw new Error('无法创建临时Canvas上下文');
		}

		tempCanvas.width = imageElement.naturalWidth;
		tempCanvas.height = imageElement.naturalHeight;

		// 绘制图片到临时Canvas
		tempCtx.drawImage(imageElement, 0, 0);

		// 转换为blob
		const blob = await new Promise<Blob>((resolve, reject) => {
			tempCanvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('图片转换失败'));
				}
			}, 'image/jpeg', 0.9);
		});

		return URL.createObjectURL(blob);
	}, []);

	const createCombinedCoverForDownload = useCallback(async (covers: CoverData[]): Promise<CoverData> => {
		if (covers.length < 2) {
			throw new Error('需要至少两个封面才能创建合并封面');
		}

		const canvas = canvasRef.current;
		if (!canvas) {
			throw new Error('Canvas元素不存在');
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('无法获取Canvas上下文');
		}

		// 3.25:1 比例
		const combinedWidth = 650;
		const combinedHeight = 200;
		canvas.width = combinedWidth;
		canvas.height = combinedHeight;

		// 绘制背景
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 处理左侧封面
		const leftCover = covers[0];
		const leftExistingImg = document.querySelector(`img[src="${leftCover.imageUrl}"]`) as HTMLImageElement;
		
		if (leftExistingImg && leftExistingImg.complete && leftExistingImg.naturalWidth > 0) {
			logger.info('[CoverDesigner] 合并封面使用页面中已加载的左侧图片', {src: leftCover.imageUrl.substring(0, 100)});
			
			// 如果是外部图片，先转换为本地blob
			let leftImageUrl = leftCover.imageUrl;
			if (leftCover.imageUrl.startsWith('http') && !leftCover.imageUrl.includes(window.location.hostname)) {
				leftImageUrl = await convertImageToBlob(leftExistingImg);
			}

			const leftImg = new Image();
			await new Promise<void>((resolve, reject) => {
				leftImg.onload = () => {
					ctx.drawImage(leftImg, 0, 0, 325, 200);
					// 清理临时blob URL
					if (leftImageUrl !== leftCover.imageUrl) {
						URL.revokeObjectURL(leftImageUrl);
					}
					resolve();
				};
				leftImg.onerror = (error) => {
					logger.error('[CoverDesigner] 左侧封面加载失败，使用占位符', { error });
					// 绘制占位符
					ctx.fillStyle = '#f0f0f0';
					ctx.fillRect(0, 0, 325, 200);
					ctx.fillStyle = '#666';
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText('图片加载失败', 162.5, 100);
					resolve();
				};
				leftImg.src = leftImageUrl;
			});
		} else {
			// 创建新的图片元素
			const leftImg = new Image();
			leftImg.crossOrigin = 'anonymous';
			
			await new Promise<void>((resolve, reject) => {
				leftImg.onload = () => {
					ctx.drawImage(leftImg, 0, 0, 325, 200);
					resolve();
				};
				leftImg.onerror = (error) => {
					logger.error('[CoverDesigner] 左侧封面加载失败，使用占位符', { error });
					// 绘制占位符
					ctx.fillStyle = '#f0f0f0';
					ctx.fillRect(0, 0, 325, 200);
					ctx.fillStyle = '#666';
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText('图片加载失败', 162.5, 100);
					resolve();
				};
				leftImg.src = leftCover.imageUrl;
			});
		}

		// 处理右侧封面
		const rightCover = covers[1];
		const rightExistingImg = document.querySelector(`img[src="${rightCover.imageUrl}"]`) as HTMLImageElement;
		
		if (rightExistingImg && rightExistingImg.complete && rightExistingImg.naturalWidth > 0) {
			logger.info('[CoverDesigner] 合并封面使用页面中已加载的右侧图片', {src: rightCover.imageUrl.substring(0, 100)});
			
			// 如果是外部图片，先转换为本地blob
			let rightImageUrl = rightCover.imageUrl;
			if (rightCover.imageUrl.startsWith('http') && !rightCover.imageUrl.includes(window.location.hostname)) {
				rightImageUrl = await convertImageToBlob(rightExistingImg);
			}

			const rightImg = new Image();
			await new Promise<void>((resolve, reject) => {
				rightImg.onload = () => {
					ctx.drawImage(rightImg, 325, 0, 325, 200);
					// 清理临时blob URL
					if (rightImageUrl !== rightCover.imageUrl) {
						URL.revokeObjectURL(rightImageUrl);
					}
					resolve();
				};
				rightImg.onerror = (error) => {
					logger.error('[CoverDesigner] 右侧封面加载失败，使用占位符', { error });
					// 绘制占位符
					ctx.fillStyle = '#f0f0f0';
					ctx.fillRect(325, 0, 325, 200);
					ctx.fillStyle = '#666';
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText('图片加载失败', 487.5, 100);
					resolve();
				};
				rightImg.src = rightImageUrl;
			});
		} else {
			// 创建新的图片元素
			const rightImg = new Image();
			rightImg.crossOrigin = 'anonymous';
			
			await new Promise<void>((resolve, reject) => {
				rightImg.onload = () => {
					ctx.drawImage(rightImg, 325, 0, 325, 200);
					resolve();
				};
				rightImg.onerror = (error) => {
					logger.error('[CoverDesigner] 右侧封面加载失败，使用占位符', { error });
					// 绘制占位符
					ctx.fillStyle = '#f0f0f0';
					ctx.fillRect(325, 0, 325, 200);
					ctx.fillStyle = '#666';
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText('图片加载失败', 487.5, 100);
					resolve();
				};
				rightImg.src = rightCover.imageUrl;
			});
		}

		// 绘制中间分割线
		ctx.strokeStyle = '#e0e0e0';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(325, 0);
		ctx.lineTo(325, 200);
		ctx.stroke();

		// 生成下载用的blob
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('合并封面生成失败'));
				}
			}, 'image/jpeg', 0.9);
		});

		const combinedCover: CoverData = {
			id: `combined-${Date.now()}`,
			imageUrl: URL.createObjectURL(blob),
			aspectRatio: 'custom',
			width: combinedWidth,
			height: combinedHeight,
			title: '合并封面',
			description: '公众号专用 3.25:1 比例'
		};

		logger.info('[CoverDesigner] 合并封面创建成功', {
			width: combinedWidth,
			height: combinedHeight,
			aspectRatio: '3.25:1'
		});

		return combinedCover;
	}, [convertImageToBlob]);

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

		// 尝试从页面中找到已经加载的图片元素
		const existingImg = document.querySelector(`img[src="${coverData.imageUrl}"]`) as HTMLImageElement;
		
		if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
			logger.info('[CoverDesigner] 使用页面中已加载的图片', {src: coverData.imageUrl.substring(0, 100)});
			
			// 如果是外部图片，先转换为本地blob避免Canvas污染
			let finalImageUrl = coverData.imageUrl;
			if (coverData.imageUrl.startsWith('http') && !coverData.imageUrl.includes(window.location.hostname)) {
				try {
					finalImageUrl = await convertImageToBlob(existingImg);
					logger.info('[CoverDesigner] 外部图片已转换为本地blob', {originalUrl: coverData.imageUrl.substring(0, 100)});
				} catch (error) {
					logger.error('[CoverDesigner] 图片转换失败', {error});
					throw error;
				}
			}

			// 创建新的图片元素使用转换后的URL
			const img = new Image();
			
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
						const blob = await new Promise<Blob>((resolve, reject) => {
							canvas.toBlob((blob) => {
								if (blob) {
									resolve(blob);
								} else {
									reject(new Error('Blob创建失败'));
								}
							}, 'image/jpeg', 0.9);
						});

						const downloadImageUrl = URL.createObjectURL(blob);

						// 清理临时blob URL
						if (finalImageUrl !== coverData.imageUrl) {
							URL.revokeObjectURL(finalImageUrl);
						}

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
					logger.error('[CoverDesigner] 图片加载失败，使用占位符', {error});
					
					// 如果图片加载失败，绘制占位符
					ctx.fillStyle = '#f0f0f0';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					
					ctx.fillStyle = '#666';
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText('图片加载失败', canvas.width / 2, canvas.height / 2);
					
					canvas.toBlob((blob) => {
						if (blob) {
							const downloadImageUrl = URL.createObjectURL(blob);
							resolve({
								...coverData,
								imageUrl: downloadImageUrl
							});
						} else {
							reject(new Error('占位符创建失败'));
						}
					}, 'image/jpeg', 0.9);
				};

				img.src = finalImageUrl;
			});
		} else {
			// 如果页面中没有已加载的图片，创建新的图片元素
			logger.info('[CoverDesigner] 创建新的图片元素', {src: coverData.imageUrl.substring(0, 100)});
			
			const img = new Image();
			img.crossOrigin = 'anonymous';

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
						const blob = await new Promise<Blob>((resolve, reject) => {
							canvas.toBlob((blob) => {
								if (blob) {
									resolve(blob);
								} else {
									reject(new Error('Blob创建失败'));
								}
							}, 'image/jpeg', 0.9);
						});

						const downloadImageUrl = URL.createObjectURL(blob);

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
					logger.error('[CoverDesigner] 图片加载失败，使用占位符', {error});
					
					// 如果图片加载失败，绘制占位符
					ctx.fillStyle = '#f0f0f0';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					
					ctx.fillStyle = '#666';
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText('图片加载失败', canvas.width / 2, canvas.height / 2);
					
					canvas.toBlob((blob) => {
						if (blob) {
							const downloadImageUrl = URL.createObjectURL(blob);
							resolve({
								...coverData,
								imageUrl: downloadImageUrl
							});
						} else {
							reject(new Error('占位符创建失败'));
						}
					}, 'image/jpeg', 0.9);
				};

				img.src = coverData.imageUrl;
			});
		}
	}, [convertImageToBlob]);

	const handleDownloadCovers = useCallback(async () => {
		const allCovers = [...cover1PreviewCovers, ...cover2PreviewCovers];
		if (allCovers.length === 0) return;

		try {
			// 渲染所有封面到Canvas并生成下载链接
			const downloadCovers = await Promise.all(
				allCovers.map(cover => renderCoverToCanvas(cover))
			);

			// 自动生成合并封面（3.25:1 比例）
			let combinedCover: CoverData | null = null;
			if (downloadCovers.length >= 2) {
				combinedCover = await createCombinedCoverForDownload(downloadCovers.slice(0, 2));
			}

			// 准备最终的下载封面列表
			const finalCovers = [...downloadCovers];
			if (combinedCover) {
				finalCovers.push(combinedCover);
			}

			logger.info('[Toolbar] 下载封面', {count: finalCovers.length});

			// 下载处理后的封面
			onDownloadCovers(finalCovers);
		} catch (error) {
			logger.error('[CoverDesigner] 下载封面失败', {error});
		}
	}, [cover1PreviewCovers, cover2PreviewCovers, renderCoverToCanvas, onDownloadCovers]);



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
					<Select value={selectedCover.toString()}
							onValueChange={(value) => setSelectedCover(parseInt(value) as 1 | 2)}>
						<SelectTrigger className="w-48">
							<SelectValue placeholder="选择要设置的封面"/>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1">封面1 (2.25:1)</SelectItem>
							<SelectItem value="2">封面2 (1:1)</SelectItem>
						</SelectContent>
					</Select>

					<button
						onClick={handleDownloadCovers}
						className="flex-1 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
						disabled={cover1PreviewCovers.length === 0 && cover2PreviewCovers.length === 0}
					>
						📥 下载封面
						({(cover1PreviewCovers.length > 0 ? 1 : 0) + (cover2PreviewCovers.length > 0 ? 1 : 0)})
					</button>
					<button
						disabled={cover1PreviewCovers.length === 0 && cover2PreviewCovers.length === 0}
						onClick={() => {
							setCover1PreviewCovers([]);
							setCover2PreviewCovers([]);
						}}
						className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
					>
						清空全部
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

			</div>


			{/* 图片来源选择 */}
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


			{/* 隐藏的 canvas 元素 */}
			<canvas ref={canvasRef} style={{display: 'none'}}/>
		</div>
	);
};
