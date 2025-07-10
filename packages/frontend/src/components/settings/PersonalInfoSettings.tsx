import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { PersonalInfo } from '../../types';
import { logger } from '../../../../shared/src/logger';
import { User, Mail, Globe, Camera, Eye, RotateCcw, Save } from 'lucide-react';

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
		<div className="space-y-6">
			{/* 头部说明 */}
			<div className="text-center">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">个人信息设置</h3>
				<p className="text-gray-600">配置您的个人资料，这些信息将用于AI生成的内容中</p>
			</div>

			{/* 头像设置卡片 */}
			<div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-blue-100 rounded-lg">
						<Camera className="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">头像设置</h4>
						<p className="text-sm text-gray-600">上传您的个人头像照片</p>
					</div>
				</div>
				
				<div className="flex items-center space-x-6">
					<div className="relative group">
						<div className="w-20 h-20 rounded-full border-3 border-white shadow-lg flex items-center justify-center bg-gray-50 overflow-hidden">
							{(localInfo.avatar || previewUrl) ? (
								<img 
									src={previewUrl || localInfo.avatar} 
									alt="头像预览" 
									className="w-full h-full object-cover"
								/>
							) : (
								<User className="w-8 h-8 text-gray-400" />
							)}
						</div>
						<div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<Camera className="w-6 h-6 text-white" />
						</div>
					</div>
					<div className="flex-1 space-y-3">
						<input
							type="file"
							accept="image/*"
							onChange={handleAvatarChange}
							className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white file:text-blue-600 file:shadow-sm hover:file:bg-blue-50 file:cursor-pointer cursor-pointer"
						/>
						<p className="text-xs text-blue-700 bg-blue-100 px-3 py-1 rounded-full inline-block">
							💡 支持 JPG、PNG、GIF 格式，大小不超过 2MB
						</p>
					</div>
				</div>
			</div>

			{/* 基本信息表单 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<User className="h-5 w-5 text-blue-600" />
					基本信息
				</h4>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* 姓名 */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							姓名 <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								type="text"
								value={localInfo.name}
								onChange={(e) => handleInputChange('name', e.target.value)}
								placeholder="请输入您的姓名"
								className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors"
							/>
							<User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
						</div>
					</div>

					{/* 邮箱 */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							邮箱地址
						</label>
						<div className="relative">
							<input
								type="email"
								value={localInfo.email || ''}
								onChange={(e) => handleInputChange('email', e.target.value)}
								placeholder="your@email.com"
								className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors"
							/>
							<Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
						</div>
					</div>

					{/* 个人网站 */}
					<div className="space-y-2 md:col-span-2">
						<label className="block text-sm font-medium text-gray-700">
							个人网站
						</label>
						<div className="relative">
							<input
								type="url"
								value={localInfo.website || ''}
								onChange={(e) => handleInputChange('website', e.target.value)}
								placeholder="https://your-website.com"
								className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors"
							/>
							<Globe className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
						</div>
					</div>

					{/* 个人简介 */}
					<div className="space-y-2 md:col-span-2">
						<label className="block text-sm font-medium text-gray-700">
							个人简介
						</label>
						<textarea
							value={localInfo.bio}
							onChange={(e) => handleInputChange('bio', e.target.value)}
							placeholder="介绍一下您自己..."
							rows={4}
							className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 resize-none transition-colors"
						/>
						<p className="text-xs text-gray-500 mt-1">
							💡 简介信息将会在AI生成的内容中作为作者介绍使用
						</p>
					</div>
				</div>
			</div>

			{/* 预览卡片 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-green-100 rounded-lg">
						<Eye className="h-5 w-5 text-green-600" />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">信息预览</h4>
						<p className="text-sm text-gray-600">查看您的个人信息显示效果</p>
					</div>
				</div>
				
				<div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
					<div className="flex items-start space-x-4">
						<div className="w-16 h-16 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center overflow-hidden shadow-sm">
							{(localInfo.avatar || previewUrl) ? (
								<img 
									src={previewUrl || localInfo.avatar} 
									alt="头像" 
									className="w-full h-full object-cover"
								/>
							) : (
								<User className="w-8 h-8 text-gray-400" />
							)}
						</div>
						<div className="flex-1">
							<div className="font-bold text-gray-900 text-lg">
								{localInfo.name || '您的姓名'}
							</div>
							{localInfo.bio && (
								<div className="text-gray-600 mt-2 leading-relaxed">
									{localInfo.bio}
								</div>
							)}
							<div className="flex flex-wrap gap-3 mt-3">
								{localInfo.email && (
									<div className="flex items-center gap-1 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
										<Mail className="w-3 h-3" />
										{localInfo.email}
									</div>
								)}
								{localInfo.website && (
									<div className="flex items-center gap-1 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
										<Globe className="w-3 h-3" />
										{localInfo.website.replace(/^https?:\/\//, '')}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 操作按钮 */}
			<div className="flex justify-between items-center pt-2">
				<Button
					onClick={handleReset}
					variant="outline"
					className="text-red-600 border-red-300 hover:bg-red-50"
				>
					<RotateCcw className="w-4 h-4 mr-2" />
					重置信息
				</Button>
				<Button
					onClick={handleSave}
					className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
				>
					<Save className="w-4 h-4 mr-2" />
					保存设置
				</Button>
			</div>
		</div>
	);
};