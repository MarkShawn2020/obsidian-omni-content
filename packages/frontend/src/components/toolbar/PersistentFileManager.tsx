import React, { useState, useEffect, useRef } from 'react';
import Masonry from 'react-masonry-css';
import { PersistentFile } from '../../types';
import { persistentStorageService } from '../../services/persistentStorage';
import { Trash2, Upload, Clock, FileText, Image, FolderOpen, Pin, PinOff } from 'lucide-react';

interface PersistentFileManagerProps {
	onFileSelect: (fileUrl: string) => void;
	acceptedTypes?: string[];
	title?: string;
}

export const PersistentFileManager: React.FC<PersistentFileManagerProps> = ({
	onFileSelect,
	acceptedTypes = ['image/*'],
	title = '文件管理器'
}) => {
	const [files, setFiles] = useState<PersistentFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>('');
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		loadFiles();
	}, []);

	const loadFiles = async () => {
		try {
			setLoading(true);
			const allFiles = await persistentStorageService.getFiles();
			
			const filteredFiles = allFiles.filter(file => {
				if (acceptedTypes.includes('*')) return true;
				return acceptedTypes.some(type => {
					if (type.endsWith('/*')) {
						const baseType = type.slice(0, -2);
						return file.type.startsWith(baseType);
					}
					return file.type === type;
				});
			}).sort((a, b) => {
				// Pin的文件排在前面
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				// 如果都是pin或都不是pin，按使用时间排序
				return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
			});
			
			setFiles(filteredFiles);
		} catch (err) {
			setError('加载文件失败');
		} finally {
			setLoading(false);
		}
	};

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const uploadedFiles = event.target.files;
		if (!uploadedFiles || uploadedFiles.length === 0) return;

		setLoading(true);
		try {
			for (const file of Array.from(uploadedFiles)) {
				if (acceptedTypes.includes('*') || acceptedTypes.some(type => {
					if (type.endsWith('/*')) {
						const baseType = type.slice(0, -2);
						return file.type.startsWith(baseType);
					}
					return file.type === type;
				})) {
					await persistentStorageService.saveFile(file);
				}
			}
			await loadFiles();
		} catch (err) {
			setError('上传文件失败');
		} finally {
			setLoading(false);
		}
	};

	const handleFileSelect = async (file: PersistentFile) => {
		try {
			await persistentStorageService.updateFileUsage(file.id);
			const fileUrl = await persistentStorageService.getFileUrl(file);
			onFileSelect(fileUrl);
			await loadFiles();
		} catch (err) {
			setError('选择文件失败');
		}
	};

	const handleDeleteFile = async (file: PersistentFile, e: React.MouseEvent) => {
		e.stopPropagation();

		try {
			await persistentStorageService.deleteFile(file.id);
			await loadFiles();
		} catch (err) {
			setError('删除文件失败');
		}
	};

	const handleTogglePin = async (file: PersistentFile, e: React.MouseEvent) => {
		e.stopPropagation();

		try {
			if (file.isPinned) {
				await persistentStorageService.unpinFile(file.id);
			} else {
				await persistentStorageService.pinFile(file.id);
			}
			await loadFiles();
		} catch (err) {
			setError(err instanceof Error ? err.message : '操作失败');
		}
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	};

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 1) return '今天';
		if (diffDays === 2) return '昨天';
		if (diffDays <= 7) return `${diffDays}天前`;
		return date.toLocaleDateString();
	};


	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
				<p className="text-red-700 text-sm">{error}</p>
				<button
					onClick={() => { setError(''); loadFiles(); }}
					className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
				>
					重试
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderOpen className="h-5 w-5 text-blue-600" />
					<h4 className="font-medium text-gray-900">{title}</h4>
					<span className="text-sm text-gray-500">({files.length})</span>
					{files.filter(f => f.isPinned).length > 0 && (
						<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
							<Pin className="h-3 w-3" />
							{files.filter(f => f.isPinned).length}/3
						</span>
					)}
				</div>
				<button
					onClick={() => fileInputRef.current?.click()}
					className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
				>
					<Upload className="h-4 w-4" />
					上传文件
				</button>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept={acceptedTypes.join(',')}
				multiple
				onChange={handleFileUpload}
				className="hidden"
			/>

			{loading && (
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			)}

			{!loading && files.length === 0 && (
				<div className="text-center py-8 text-gray-500">
					<FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
					<p>暂无文件</p>
					<p className="text-sm mt-1">点击上传文件按钮添加文件</p>
				</div>
			)}

			{!loading && files.length > 0 && (
				<div className="max-h-96 overflow-y-auto">
					<style>{`
						.masonry-grid {
							display: flex;
							margin-left: -8px;
							width: auto;
						}
						.masonry-grid-column {
							padding-left: 8px;
							background-clip: padding-box;
						}
						.masonry-grid-column > div {
							margin-bottom: 8px;
						}
					`}</style>
					<Masonry
						breakpointCols={{
							default: 2,
							400: 1
						}}
						className="masonry-grid"
						columnClassName="masonry-grid-column"
					>
						{files.map(file => (
							<FileCard
								key={file.id}
								file={file}
								onSelect={() => handleFileSelect(file)}
								onTogglePin={(e) => handleTogglePin(file, e)}
								onDelete={(e) => handleDeleteFile(file, e)}
								formatFileSize={formatFileSize}
								formatDate={formatDate}
							/>
						))}
					</Masonry>
				</div>
			)}
		</div>
	);
};


// FileCard组件用于显示单个文件卡片
interface FileCardProps {
	file: PersistentFile;
	onSelect: () => void;
	onTogglePin: (e: React.MouseEvent) => void;
	onDelete: (e: React.MouseEvent) => void;
	formatFileSize: (bytes: number) => string;
	formatDate: (dateString: string) => string;
}

const FileCard: React.FC<FileCardProps> = ({
	file,
	onSelect,
	onTogglePin,
	onDelete,
	formatFileSize,
	formatDate
}) => {
	const [imageUrl, setImageUrl] = useState<string>('');
	const [imageLoading, setImageLoading] = useState(true);
	const [imageError, setImageError] = useState(false);
	const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

	useEffect(() => {
		let mounted = true;
		
		const loadImage = async () => {
			if (file.type.startsWith('image/')) {
				try {
					setImageLoading(true);
					setImageError(false);
					const url = await persistentStorageService.getFileUrl(file);
					if (mounted) {
						setImageUrl(url);
						// 预加载图片获取尺寸
						const img = document.createElement('img');
						img.onload = () => {
							if (mounted) {
								setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
								setImageLoading(false);
							}
						};
						img.onerror = () => {
							if (mounted) {
								setImageError(true);
								setImageLoading(false);
							}
						};
						img.src = url;
					}
				} catch (error) {
					if (mounted) {
						console.error('加载图片预览失败:', error);
						setImageError(true);
						setImageLoading(false);
					}
				}
			} else {
				setImageLoading(false);
			}
		};

		loadImage();

		return () => {
			mounted = false;
			if (imageUrl && imageUrl.startsWith('blob:')) {
				URL.revokeObjectURL(imageUrl);
			}
		};
	}, [file]);

	const getFileIcon = (type: string) => {
		if (type.startsWith('image/')) return <Image className="h-8 w-8" />;
		return <FileText className="h-8 w-8" />;
	};

	// 计算显示尺寸，让图片保持原始比例
	const getDisplayDimensions = () => {
		if (!imageDimensions) return { width: '100%', height: 120 }; // 默认尺寸
		
		// 计算容器宽度（约为工具栏的一半减去间距）
		const containerWidth = 180; // 大概的容器宽度
		const ratio = imageDimensions.height / imageDimensions.width;
		const displayHeight = Math.min(containerWidth * ratio, 300); // 最大高度300px
		
		return {
			width: '100%',
			height: displayHeight
		};
	};

	const displayDimensions = getDisplayDimensions();

	return (
		<div
			onClick={onSelect}
			className="relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
			style={{ width: '100%' }}
		>
			{/* Pin指示器 */}
			{file.isPinned && (
				<div className="absolute top-2 left-2 z-10">
					<div className="bg-orange-500 text-white rounded-full p-1">
						<Pin className="h-3 w-3" />
					</div>
				</div>
			)}

			{/* 操作按钮 */}
			<div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					onClick={onTogglePin}
					className={`p-1.5 rounded-full transition-all ${
						file.isPinned 
							? 'bg-orange-500 bg-opacity-80 text-white hover:bg-opacity-100' 
							: 'bg-black bg-opacity-60 text-white hover:bg-opacity-80'
					}`}
					title={file.isPinned ? '取消置顶' : '置顶'}
				>
					{file.isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
				</button>
				<button
					onClick={onDelete}
					className="p-1.5 bg-red-500 bg-opacity-80 text-white rounded-full hover:bg-opacity-100 transition-all"
					title="删除文件"
				>
					<Trash2 className="h-3 w-3" />
				</button>
			</div>

			{/* 图片预览区域 */}
			<div 
				className="bg-gray-50 relative"
				style={{ 
					height: file.type.startsWith('image/') ? displayDimensions.height : '120px'
				}}
			>
				{file.type.startsWith('image/') ? (
					<>
						{imageLoading && (
							<div className="w-full h-full flex items-center justify-center">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							</div>
						)}
						{!imageLoading && !imageError && imageUrl && (
							<img
								src={imageUrl}
								alt={file.name}
								className="w-full h-full object-cover"
								onError={() => setImageError(true)}
							/>
						)}
						{!imageLoading && (imageError || !imageUrl) && (
							<div className="w-full h-full flex items-center justify-center text-gray-400">
								<div className="text-center">
									<Image className="h-8 w-8 mx-auto mb-1" />
									<p className="text-xs">预览失败</p>
								</div>
							</div>
						)}
					</>
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-400">
						<div className="text-center">
							{getFileIcon(file.type)}
							<p className="text-xs mt-1">
								{file.type.split('/')[1]?.toUpperCase() || '文件'}
							</p>
						</div>
					</div>
				)}
			</div>

			{/* 文件信息 */}
			<div className="p-2">
				<h5 className="text-xs font-medium text-gray-900 truncate mb-1" title={file.name}>
					{file.name}
				</h5>
				<div className="flex items-center justify-between text-xs text-gray-500">
					<span>{formatFileSize(file.size)}</span>
					<div className="flex items-center gap-1">
						<Clock className="h-3 w-3" />
						<span>{formatDate(file.lastUsed)}</span>
					</div>
				</div>
			</div>
		</div>
	);
};
