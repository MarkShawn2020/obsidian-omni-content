import React, { useState, useEffect, useRef } from 'react';
import { PersistentFile } from '../../types';
import { persistentStorageService } from '../../services/persistentStorage';
import { Trash2, Upload, Clock, FileText, Image, FolderOpen } from 'lucide-react';

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
			}).sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
			
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
		if (!confirm(`确定要删除文件 "${file.name}" 吗？`)) return;

		try {
			await persistentStorageService.deleteFile(file.id);
			await loadFiles();
		} catch (err) {
			setError('删除文件失败');
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

	const getFileIcon = (type: string) => {
		if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
		return <FileText className="h-4 w-4" />;
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
				<div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
					{files.map(file => (
						<div
							key={file.id}
							onClick={() => handleFileSelect(file)}
							className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
						>
							<div className="flex-shrink-0 text-gray-500">
								{getFileIcon(file.type)}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium text-gray-900 truncate">
										{file.name}
									</p>
									<button
										onClick={(e) => handleDeleteFile(file, e)}
										className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
								<div className="flex items-center gap-2 text-xs text-gray-500">
									<span>{formatFileSize(file.size)}</span>
									<span>•</span>
									<div className="flex items-center gap-1">
										<Clock className="h-3 w-3" />
										<span>{formatDate(file.lastUsed)}</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};