import React, { useState } from 'react';
import { PersonalInfoSettings } from './PersonalInfoSettings';
import { AISettings } from './AISettings';
import { PersonalInfo, ViteReactSettings } from '../../types';

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	personalInfo: PersonalInfo;
	onPersonalInfoChange: (info: PersonalInfo) => void;
	onSaveSettings: () => void;
	settings: ViteReactSettings;
	onSettingsChange: (settings: Partial<ViteReactSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	personalInfo,
	onPersonalInfoChange,
	onSaveSettings,
	settings,
	onSettingsChange
}) => {
	const [activeTab, setActiveTab] = useState<'personal' | 'ai' | 'general'>('personal');

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* 背景遮罩 */}
			<div 
				className="absolute inset-0 bg-black bg-opacity-50"
				onClick={onClose}
			/>
			
			{/* 模态框内容 */}
			<div className="relative z-10 w-full max-w-4xl mx-4">
				<div className="bg-white rounded-lg shadow-xl overflow-hidden">
					{/* 标签页标题 */}
					<div className="border-b border-gray-200">
						<div className="flex">
							<button
								onClick={() => setActiveTab('personal')}
								className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
									activeTab === 'personal'
										? 'border-blue-500 text-blue-600 bg-blue-50'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								}`}
							>
								个人信息
							</button>
							<button
								onClick={() => setActiveTab('ai')}
								className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
									activeTab === 'ai'
										? 'border-blue-500 text-blue-600 bg-blue-50'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								}`}
							>
								AI设置
							</button>
							<button
								onClick={() => setActiveTab('general')}
								className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
									activeTab === 'general'
										? 'border-blue-500 text-blue-600 bg-blue-50'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								}`}
							>
								通用设置
							</button>
						</div>
					</div>

					{/* 标签页内容 */}
					<div className="max-h-[80vh] overflow-y-auto">
						{activeTab === 'personal' && (
							<PersonalInfoSettings
								personalInfo={personalInfo}
								onPersonalInfoChange={onPersonalInfoChange}
								onSaveSettings={onSaveSettings}
								onClose={onClose}
							/>
						)}
						
						{activeTab === 'ai' && (
							<AISettings
								settings={settings}
								onSettingsChange={onSettingsChange}
								onSaveSettings={onSaveSettings}
								onClose={onClose}
							/>
						)}
						
						{activeTab === 'general' && (
							<div className="p-6 space-y-4">
								<h3 className="text-lg font-medium text-gray-900">通用设置</h3>
								<div className="text-gray-600">
									<p>通用设置功能即将推出...</p>
									<ul className="mt-2 space-y-1 text-sm">
										<li>• 应用主题设置</li>
										<li>• 语言偏好</li>
										<li>• 快捷键配置</li>
										<li>• 数据导入/导出</li>
									</ul>
								</div>
								<div className="pt-4 border-t">
									<button
										onClick={onClose}
										className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
									>
										关闭
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};