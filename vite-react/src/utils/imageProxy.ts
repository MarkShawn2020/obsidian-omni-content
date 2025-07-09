// 图片代理工具，用于处理跨域图片加载问题

const logger = {
	info: (message: string, data?: any) => console.log('[ImageProxy]', message, data),
	warn: (message: string, data?: any) => console.warn('[ImageProxy]', message, data),
	error: (message: string, data?: any) => console.error('[ImageProxy]', message, data)
};

// 缓存已加载的blob URL
const imageCache = new Map<string, string>();

export async function loadImageAsBlob(imageUrl: string): Promise<string> {
	// 检查缓存
	if (imageCache.has(imageUrl)) {
		logger.info('从缓存获取图片', { imageUrl: imageUrl.substring(0, 100) });
		return imageCache.get(imageUrl)!;
	}

	logger.info('开始加载图片', { imageUrl: imageUrl.substring(0, 100) });

	try {
		// 首先尝试使用 no-cors 模式
		const response = await fetch(imageUrl, {
			mode: 'no-cors',
			cache: 'force-cache'
		});

		// 如果是 no-cors 模式，我们无法检查状态，但可以获取 blob
		const blob = await response.blob();
		
		// 如果 blob 大小为 0，说明可能失败了，尝试 cors 模式
		if (blob.size === 0) {
			logger.warn('no-cors 模式返回空 blob，尝试 cors 模式', { imageUrl });
			
			const corsResponse = await fetch(imageUrl, {
				mode: 'cors',
				cache: 'force-cache'
			});

			if (!corsResponse.ok) {
				throw new Error(`HTTP ${corsResponse.status}: ${corsResponse.statusText}`);
			}

			const corsBlob = await corsResponse.blob();
			const blobUrl = URL.createObjectURL(corsBlob);
			imageCache.set(imageUrl, blobUrl);
			
			logger.info('cors 模式图片加载成功', { 
				imageUrl: imageUrl.substring(0, 100),
				blobUrl: blobUrl.substring(0, 50),
				size: corsBlob.size,
				type: corsBlob.type
			});

			return blobUrl;
		}

		const blobUrl = URL.createObjectURL(blob);
		imageCache.set(imageUrl, blobUrl);

		logger.info('no-cors 模式图片加载成功', { 
			imageUrl: imageUrl.substring(0, 100),
			blobUrl: blobUrl.substring(0, 50),
			size: blob.size,
			type: blob.type
		});

		return blobUrl;

	} catch (error) {
		logger.error('图片加载失败', { imageUrl, error });

		// 如果fetch失败，尝试直接返回原URL
		if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
			return imageUrl;
		}

		// 生成一个占位图片
		const placeholderSvg = `
			<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
				<rect width="100%" height="100%" fill="#f0f0f0"/>
				<text x="50%" y="40%" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">
					图片加载失败
				</text>
				<text x="50%" y="60%" text-anchor="middle" fill="#999" font-family="Arial" font-size="12">
					${imageUrl.substring(0, 50)}...
				</text>
			</svg>
		`;

		const placeholderBlob = new Blob([placeholderSvg], { type: 'image/svg+xml' });
		const placeholderUrl = URL.createObjectURL(placeholderBlob);

		logger.info('使用占位图片', { placeholderUrl });
		return placeholderUrl;
	}
}

// 清理缓存中的blob URL
export function clearImageCache() {
	logger.info('清理图片缓存', { count: imageCache.size });
	
	for (const blobUrl of imageCache.values()) {
		if (blobUrl.startsWith('blob:')) {
			URL.revokeObjectURL(blobUrl);
		}
	}
	
	imageCache.clear();
}

// 预加载图片列表
export async function preloadImages(imageUrls: string[]): Promise<Map<string, string>> {
	logger.info('开始预加载图片', { count: imageUrls.length });
	
	const results = new Map<string, string>();
	
	const promises = imageUrls.map(async (url) => {
		try {
			const blobUrl = await loadImageAsBlob(url);
			results.set(url, blobUrl);
		} catch (error) {
			logger.error('预加载失败', { url, error });
		}
	});

	await Promise.allSettled(promises);

	logger.info('预加载完成', { 
		total: imageUrls.length,
		success: results.size,
		failed: imageUrls.length - results.size
	});

	return results;
}