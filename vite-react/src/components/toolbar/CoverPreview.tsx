import React from "react";
import {AspectRatio} from "@/components/ui/aspect-ratio";
import {logger} from "../../../../src/logger";
import {XIcon} from "@/components/ui/XIcon";
import {CoverData} from "@/components/toolbar/CoverData";

interface CoverPreviewProps {
	coverData?: CoverData;
	aspectRatio: number;
	label: string;
	onClear: () => void;
	placeholder?: string;
}

export const CoverPreview: React.FC<CoverPreviewProps> = ({
															  coverData,
															  aspectRatio,
															  label,
															  onClear,
															  placeholder = "暂无预览"
														  }) => {
	return (
		<AspectRatio ratio={aspectRatio} className="w-full">
			{coverData ? (
				<div className="h-full border border-gray-200 rounded p-2">
					<div className="h-full w-full border border-gray-300 rounded overflow-hidden relative group">
						<img
							src={coverData.imageUrl}
							alt={`${label}预览`}
							className="w-full h-full object-cover"
							onLoad={(e) => {
								logger.info(`${label}图片加载成功`, {
									src: coverData.imageUrl.substring(0, 100),
									naturalWidth: e.currentTarget.naturalWidth,
									naturalHeight: e.currentTarget.naturalHeight
								});
							}}
							onError={(e) => {
								logger.error(`${label}图片加载失败`, {
									src: coverData.imageUrl.substring(0, 100),
									error: e
								});
								e.currentTarget.style.display = 'none';
								const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
								if (nextElement) {
									nextElement.style.display = 'flex';
								}
							}}
						/>
						<div
							className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm"
							style={{display: 'none'}}
						>
							图片加载失败
						</div>
						<button
							onClick={onClear}
							className="absolute top-2 right-2 bg-black bg-opacity-60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-80"
							style={{width: '24px', height: '24px', borderRadius: '50%', padding: 0, border: 'none'}}
							title={`清空${label}`}
						>
							<XIcon/>
						</button>
					</div>
					{coverData.title && (
						<div className="mt-2 text-sm font-medium text-gray-700">
							{coverData.title}
						</div>
					)}
					<div className="mt-2 text-xs text-gray-600">
						{coverData.aspectRatio} ({coverData.width}x{coverData.height})
					</div>
				</div>
			) : (
				<div
					className="h-full text-center text-gray-400 border border-dashed border-gray-300 rounded flex items-center justify-center w-full">
					<div>
						<p className="text-sm">{placeholder}</p>
						<p className="text-xs mt-1">请在下方设置中创建封面</p>
					</div>
				</div>
			)}
		</AspectRatio>
	);
};
