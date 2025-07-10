import React from "react";
import packageJson from "../../../package.json";
import {Copy, Settings, Star, Upload} from "lucide-react";

interface BrandSectionProps {
	onCopy: () => void;
	onDistribute: () => void;
	onSettings?: () => void;
}

export const BrandSection: React.FC<BrandSectionProps> = ({onCopy, onDistribute, onSettings}) => {
	return (
		<div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-blue-500/20">
			<div className="px-6 py-4">
				<div className="flex items-center justify-between gap-2">
					{/* 品牌标识区域 */}
					<div className="flex items-center gap-4">
						<div className="relative">
							<div
								className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
								<div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
									<span className="text-blue-600 font-black text-lg">O</span>
								</div>
							</div>
							<div
								className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
								<Star className="w-2.5 h-2.5 text-yellow-800 fill-current"/>
							</div>
						</div>

						<div className="flex flex-col">
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-bold text-white">Lovpen</h1>
							</div>
							<span
								className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
									v{packageJson.version}
								</span>
							{/*<p className="text-blue-100 text-sm mt-1">智能内容创作平台</p>*/}
						</div>
					</div>

					{/* 操作按钮区域 */}
					<div className="flex items-center gap-2">
						<button
							onClick={onCopy}
							className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg border border-white/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
						>
							<Copy className="h-4 w-4"/>
							<span className="text-sm font-medium">复制</span>
						</button>

						<button
							onClick={onDistribute}
							className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg border border-white/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
						>
							<Upload className="h-4 w-4"/>
							<span className="text-sm font-medium">分发</span>
						</button>

						{onSettings && (
							<button
								onClick={onSettings}
								className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-blue-600 rounded-lg border border-white/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
							>
								<Settings className="h-4 w-4"/>
								<span className="text-sm font-medium">设置</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
