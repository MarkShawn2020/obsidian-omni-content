import React, { useState, useEffect } from 'react';
import { PersistentCover } from '../../types';
import { persistentStorageService } from '../../services/persistentStorage';
import { Trash2, Clock, Image, Star, Tag, Save } from 'lucide-react';

interface PersistentCoverManagerProps {
	onCoverSelect: (coverUrl: string) => void;
	aspectRatio?: '2.25:1' | '1:1' | 'all';
	onSaveCover?: (cover: { name: string; imageUrl: string; aspectRatio: '2.25:1' | '1:1'; width: number; height: number; tags: string[] }) => void;
}

export const PersistentCoverManager: React.FC<PersistentCoverManagerProps> = ({
	onCoverSelect,
	aspectRatio = 'all',
	onSaveCover
}) => {
	const [covers, setCovers] = useState<PersistentCover[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>('');
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [saveDialogData, setSaveDialogData] = useState<{
		name: string;
		imageUrl: string;
		aspectRatio: '2.25:1' | '1:1';
		width: number;
		height: number;
		tags: string[];
	} | null>(null);

	useEffect(() => {
		loadCovers();
	}, []);

	const loadCovers = async () => {
		try {
			setLoading(true);
			const allCovers = await persistentStorageService.getCovers();
			
			const filteredCovers = allCovers.filter(cover => {
				if (aspectRatio === 'all') return true;
				return cover.aspectRatio === aspectRatio;
			}).sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
			
			setCovers(filteredCovers);
		} catch (err) {
			setError('加载封面失败');
		} finally {
			setLoading(false);
		}
	};

	const handleCoverSelect = async (cover: PersistentCover) => {
		try {
			await persistentStorageService.updateCoverUsage(cover.id);
			const coverUrl = await persistentStorageService.getCoverUrl(cover);
			onCoverSelect(coverUrl);
			await loadCovers();
		} catch (err) {
			setError('选择封面失败');
		}
	};

	const handleDeleteCover = async (cover: PersistentCover, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!confirm(`确定要删除封面 "${cover.name}" 吗？`)) return;

		try {
			await persistentStorageService.deleteCover(cover.id);
			await loadCovers();
		} catch (err) {
			setError('删除封面失败');
		}
	};

	const handleSaveCover = async (coverData: {
		name: string;
		imageUrl: string;
		aspectRatio: '2.25:1' | '1:1';
		width: number;
		height: number;
		tags: string[];
	}) => {
		try {
			await persistentStorageService.saveCover(coverData);
			await loadCovers();
			setShowSaveDialog(false);
			setSaveDialogData(null);
		} catch (err) {
			setError('保存封面失败');
		}
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

	const getAspectRatioLabel = (ratio: string) => {
		switch (ratio) {
			case '2.25:1': return '横版';
			case '1:1': return '方形';
			default: return ratio;
		}
	};

	const getUniqueTagsFromCovers = () => {
		const allTags = covers.flatMap(cover => cover.tags);
		return [...new Set(allTags)];
	};

	const filteredCovers = selectedTags.length > 0
		? covers.filter(cover => selectedTags.some(tag => cover.tags.includes(tag)))
		: covers;

	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
				<p className="text-red-700 text-sm">{error}</p>
				<button
					onClick={() => { setError(''); loadCovers(); }}
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
					<Star className="h-5 w-5 text-yellow-500" />
					<h4 className="font-medium text-gray-900">
						我的封面库
						{aspectRatio !== 'all' && (
							<span className="text-sm text-gray-500 ml-2">
								({getAspectRatioLabel(aspectRatio)})
							</span>
						)}
					</h4>
					<span className="text-sm text-gray-500">({filteredCovers.length})</span>
				</div>
				{onSaveCover && (
					<button
						onClick={() => setShowSaveDialog(true)}
						className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
					>
						<Save className="h-4 w-4" />
						保存当前封面
					</button>
				)}
			</div>

			{/* 标签筛选 */}
			{getUniqueTagsFromCovers().length > 0 && (
				<div className="flex flex-wrap gap-2">
					<button
						onClick={() => setSelectedTags([])}
						className={`px-2 py-1 text-xs rounded-full transition-colors ${
							selectedTags.length === 0
								? 'bg-blue-100 text-blue-700 border border-blue-300'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						全部
					</button>
					{getUniqueTagsFromCovers().map(tag => (
						<button
							key={tag}
							onClick={() => {
								setSelectedTags(prev => 
									prev.includes(tag) 
										? prev.filter(t => t !== tag)
										: [...prev, tag]
								);
							}}
							className={`px-2 py-1 text-xs rounded-full transition-colors ${
								selectedTags.includes(tag)
									? 'bg-blue-100 text-blue-700 border border-blue-300'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							<Tag className="h-3 w-3 inline mr-1" />
							{tag}
						</button>
					))}
				</div>
			)}

			{loading && (
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
				</div>
			)}

			{!loading && filteredCovers.length === 0 && (
				<div className="text-center py-8 text-gray-500">
					<Star className="h-12 w-12 mx-auto mb-3 text-gray-400" />
					<p>暂无封面</p>
					<p className="text-sm mt-1">制作封面后点击保存按钮添加到封面库</p>
				</div>
			)}

			{!loading && filteredCovers.length > 0 && (
				<div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
					{filteredCovers.map(cover => (
						<div
							key={cover.id}
							onClick={() => handleCoverSelect(cover)}
							className="relative group cursor-pointer"
						>
							<div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-colors">
								<img
									src={cover.imageUrl}
									alt={cover.name}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEyQzIxIDEyIDIxIDEyIDIxIDEyWiIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
									}}
								/>
							</div>
							<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
							<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onClick={(e) => handleDeleteCover(cover, e)}
									className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
								>
									<Trash2 className="h-3 w-3" />
								</button>
							</div>
							<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
								<p className="text-white text-xs font-medium truncate">
									{cover.name}
								</p>
								<div className="flex items-center justify-between text-xs text-gray-300">
									<span className="bg-black/40 px-1.5 py-0.5 rounded">
										{getAspectRatioLabel(cover.aspectRatio)}
									</span>
									<div className="flex items-center gap-1">
										<Clock className="h-3 w-3" />
										<span>{formatDate(cover.lastUsed)}</span>
									</div>
								</div>
								{cover.tags.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-1">
										{cover.tags.slice(0, 2).map(tag => (
											<span
												key={tag}
												className="bg-blue-500/80 text-white px-1.5 py-0.5 rounded text-xs"
											>
												{tag}
											</span>
										))}
										{cover.tags.length > 2 && (
											<span className="bg-gray-500/80 text-white px-1.5 py-0.5 rounded text-xs">
												+{cover.tags.length - 2}
											</span>
										)}
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* 保存封面对话框 */}
			{showSaveDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
						<h3 className="text-lg font-semibold mb-4">保存封面到库</h3>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									封面名称
								</label>
								<input
									type="text"
									value={saveDialogData?.name || ''}
									onChange={(e) => setSaveDialogData(prev => prev ? { ...prev, name: e.target.value } : null)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="输入封面名称"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									标签（用逗号分隔）
								</label>
								<input
									type="text"
									value={saveDialogData?.tags?.join(', ') || ''}
									onChange={(e) => setSaveDialogData(prev => prev ? { 
										...prev, 
										tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
									} : null)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="例如：科技,蓝色,简约"
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-6">
							<button
								onClick={() => { setShowSaveDialog(false); setSaveDialogData(null); }}
								className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
							>
								取消
							</button>
							<button
								onClick={() => saveDialogData && handleSaveCover(saveDialogData)}
								disabled={!saveDialogData?.name.trim()}
								className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								保存
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};