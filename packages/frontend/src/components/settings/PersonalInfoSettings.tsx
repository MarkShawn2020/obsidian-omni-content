import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { PersonalInfo } from '../../types';
import { logger } from '../../../../shared/src/logger';

interface PersonalInfoSettingsProps {
	personalInfo: PersonalInfo;
	onPersonalInfoChange: (info: PersonalInfo) => void;
	onSaveSettings: () => void;
	onClose: () => void;
}

const defaultPersonalInfo: PersonalInfo = {
	name: '',
	avatar: '',
	bio: '',
	email: '',
	website: ''
};

export const PersonalInfoSettings: React.FC<PersonalInfoSettingsProps> = ({
	personalInfo,
	onPersonalInfoChange,
	onSaveSettings,
	onClose
}) => {
	const [localInfo, setLocalInfo] = useState<PersonalInfo>(() => ({
		...defaultPersonalInfo,
		...personalInfo
	}));

	const [previewUrl, setPreviewUrl] = useState<string>('');

	useEffect(() => {
		setLocalInfo(prev => ({
			...defaultPersonalInfo,
			...personalInfo
		}));
	}, [personalInfo]);

	const handleInputChange = (field: keyof PersonalInfo, value: string) => {
		setLocalInfo(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// 验证文件类型
		if (!file.type.startsWith('image/')) {
			alert('请选择图片文件');
			return;
		}

		// 验证文件大小（限制2MB）
		if (file.size > 2 * 1024 * 1024) {
			alert('图片文件不能超过2MB');
			return;
		}

		try {
			// 转换为base64
			const reader = new FileReader();
			reader.onload = (e) => {
				const base64 = e.target?.result as string;
				setLocalInfo(prev => ({
					...prev,
					avatar: base64
				}));
				setPreviewUrl(base64);
			};
			reader.readAsDataURL(file);
		} catch (error) {
			logger.error('处理头像文件失败:', error);
			alert('处理头像文件失败');
		}
	};

	const handleSave = () => {
		// 验证必填字段
		if (!localInfo.name.trim()) {
			alert('请输入姓名');
			return;
		}

		onPersonalInfoChange(localInfo);
		onSaveSettings();
		logger.info('个人信息已保存:', localInfo);
		onClose();
	};

	const handleReset = () => {
		if (confirm('确定要重置个人信息吗？')) {
			setLocalInfo(defaultPersonalInfo);
			setPreviewUrl('');
		}
	};

	return (
		<div className="personal-info-settings space-y-6 p-6 bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
			{/* 标题栏 */}
			<div className="flex items-center justify-between border-b pb-4">
				<h2 className="text-xl font-semibold text-gray-800">个人信息设置</h2>
				<button
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
				>
					×
				</button>
			</div>

			{/* 头像设置 */}
			<div className="space-y-3">
				<label className="block text-sm font-medium text-gray-700">
					头像
				</label>
				<div className="flex items-center space-x-4">
					<div className="relative">
						<div 
							className="w-16 h-16 rounded-full border-2 border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden"
						>
							{(localInfo.avatar || previewUrl) ? (
								<img 
									src={previewUrl || localInfo.avatar} 
									alt="头像预览" 
									className="w-full h-full object-cover"
								/>
							) : (
								<svg 
									className="w-8 h-8 text-gray-400" 
									fill="currentColor" 
									viewBox="0 0 20 20"
								>
									<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
								</svg>
							)}
						</div>
					</div>
					<div className="flex-1">
						<input
							type="file"
							accept="image/*"
							onChange={handleAvatarChange}
							className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
						/>
						<p className="text-xs text-gray-500 mt-1">
							支持 JPG、PNG、GIF 格式，大小不超过 2MB
						</p>
					</div>
				</div>
			</div>

			{/* 姓名 */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700">
					姓名 <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={localInfo.name}
					onChange={(e) => handleInputChange('name', e.target.value)}
					placeholder="请输入您的姓名"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			{/* 简介 */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700">
					个人简介
				</label>
				<textarea
					value={localInfo.bio}
					onChange={(e) => handleInputChange('bio', e.target.value)}
					placeholder="介绍一下您自己..."
					rows={3}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
				/>
			</div>

			{/* 邮箱 */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700">
					邮箱
				</label>
				<input
					type="email"
					value={localInfo.email || ''}
					onChange={(e) => handleInputChange('email', e.target.value)}
					placeholder="your@email.com"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			{/* 个人网站 */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700">
					个人网站
				</label>
				<input
					type="url"
					value={localInfo.website || ''}
					onChange={(e) => handleInputChange('website', e.target.value)}
					placeholder="https://your-website.com"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			{/* 预览区域 */}
			<div className="border-t pt-4">
				<h3 className="text-sm font-medium text-gray-700 mb-3">预览</h3>
				<div className="bg-gray-50 p-4 rounded-lg">
					<div className="flex items-center space-x-3">
						<div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
							{(localInfo.avatar || previewUrl) ? (
								<img 
									src={previewUrl || localInfo.avatar} 
									alt="头像" 
									className="w-full h-full object-cover"
								/>
							) : (
								<svg 
									className="w-6 h-6 text-gray-400" 
									fill="currentColor" 
									viewBox="0 0 20 20"
								>
									<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
								</svg>
							)}
						</div>
						<div className="flex-1">
							<div className="font-medium text-gray-900">
								{localInfo.name || '您的姓名'}
							</div>
							{localInfo.bio && (
								<div className="text-sm text-gray-600 mt-1">
									{localInfo.bio}
								</div>
							)}
							<div className="flex space-x-4 mt-1">
								{localInfo.email && (
									<span className="text-xs text-blue-600">{localInfo.email}</span>
								)}
								{localInfo.website && (
									<span className="text-xs text-blue-600">{localInfo.website}</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 操作按钮 */}
			<div className="flex justify-between border-t pt-4">
				<Button
					onClick={handleReset}
					variant="outline"
					className="text-red-600 border-red-300 hover:bg-red-50"
				>
					重置
				</Button>
				<div className="flex space-x-3">
					<Button
						onClick={onClose}
						variant="outline"
					>
						取消
					</Button>
					<Button
						onClick={handleSave}
						className="bg-blue-600 hover:bg-blue-700 text-white"
					>
						保存
					</Button>
				</div>
			</div>
		</div>
	);
};