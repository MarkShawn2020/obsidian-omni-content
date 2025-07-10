import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ViteReactSettings } from '../../types';
import { logger } from '../../../../shared/src/logger';

interface AISettingsProps {
	settings: ViteReactSettings;
	onSettingsChange: (settings: Partial<ViteReactSettings>) => void;
	onSaveSettings: () => void;
	onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
	settings,
	onSettingsChange,
	onSaveSettings,
	onClose
}) => {
	const [claudeApiKey, setClaudeApiKey] = useState<string>(settings.authKey || '');
	const [isTestingConnection, setIsTestingConnection] = useState(false);
	const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
	const [errorMessage, setErrorMessage] = useState<string>('');

	useEffect(() => {
		setClaudeApiKey(settings.authKey || '');
	}, [settings.authKey]);

	const handleApiKeyChange = (value: string) => {
		setClaudeApiKey(value);
		setConnectionStatus('idle');
		setErrorMessage('');
	};

	const testConnection = async () => {
		if (!claudeApiKey.trim()) {
			setErrorMessage('请输入Claude API密钥');
			setConnectionStatus('error');
			return;
		}

		setIsTestingConnection(true);
		setConnectionStatus('idle');
		setErrorMessage('');

		try {
			// 使用Obsidian的requestUrl API来避免CORS问题
			const { requestUrl } = require('obsidian');
			
			const response = await requestUrl({
				url: 'https://api.anthropic.com/v1/messages',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': claudeApiKey.trim(),
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-3-sonnet-20240229',
					max_tokens: 10,
					messages: [
						{
							role: 'user',
							content: '测试连接'
						}
					]
				})
			});

			if (response.status === 200) {
				setConnectionStatus('success');
				logger.info('Claude API连接测试成功');
			} else {
				throw new Error(`API调用失败: ${response.status}`);
			}
		} catch (error) {
			setConnectionStatus('error');
			setErrorMessage(error instanceof Error ? error.message : '连接测试失败');
			logger.error('Claude API连接测试失败:', error);
		} finally {
			setIsTestingConnection(false);
		}
	};

	const handleSave = () => {
		onSettingsChange({ authKey: claudeApiKey.trim() });
		onSaveSettings();
		logger.info('AI设置已保存');
		onClose();
	};

	const handleReset = () => {
		if (confirm('确定要清空Claude API密钥吗？')) {
			setClaudeApiKey('');
			setConnectionStatus('idle');
			setErrorMessage('');
		}
	};

	return (
		<div className="ai-settings space-y-6 p-6 bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
			{/* 标题栏 */}
			<div className="flex items-center justify-between border-b pb-4">
				<h2 className="text-xl font-semibold text-gray-800">AI设置</h2>
				<button
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
				>
					×
				</button>
			</div>

			{/* 说明文字 */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex items-start">
					<svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
					</svg>
					<div className="text-sm">
						<p className="text-blue-800 font-medium">关于Claude AI集成</p>
						<p className="text-blue-700 mt-1">
							配置Claude API密钥后，可以使用AI功能自动分析文章内容并生成相关的元数据信息，如标题、副标题、标签等。
						</p>
					</div>
				</div>
			</div>

			{/* Claude API密钥设置 */}
			<div className="space-y-3">
				<label className="block text-sm font-medium text-gray-700">
					Claude API密钥 <span className="text-red-500">*</span>
				</label>
				<div className="space-y-2">
					<input
						type="password"
						value={claudeApiKey}
						onChange={(e) => handleApiKeyChange(e.target.value)}
						placeholder="sk-ant-api03-..."
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<div className="flex items-center space-x-3">
						<Button
							onClick={testConnection}
							disabled={isTestingConnection || !claudeApiKey.trim()}
							size="sm"
							variant="outline"
							className="text-blue-600 border-blue-300 hover:bg-blue-50"
						>
							{isTestingConnection ? '测试中...' : '测试连接'}
						</Button>
						
						{connectionStatus === 'success' && (
							<div className="flex items-center text-green-600 text-sm">
								<svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								连接成功
							</div>
						)}
						
						{connectionStatus === 'error' && (
							<div className="flex items-center text-red-600 text-sm">
								<svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
								</svg>
								连接失败
							</div>
						)}
					</div>
					
					{errorMessage && (
						<p className="text-red-600 text-sm">{errorMessage}</p>
					)}
				</div>
			</div>

			{/* API密钥获取说明 */}
			<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
				<h4 className="text-sm font-medium text-gray-900 mb-2">如何获取Claude API密钥？</h4>
				<ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
					<li>访问 <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic控制台</a></li>
					<li>注册账户并登录</li>
					<li>前往API密钥页面</li>
					<li>创建新的API密钥</li>
					<li>复制密钥并粘贴到上方输入框</li>
				</ol>
				<p className="text-xs text-gray-500 mt-2">
					注意：API密钥仅在本地存储，不会上传到任何服务器。
				</p>
			</div>

			{/* AI功能说明 */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-gray-900">AI功能介绍</h4>
				<div className="grid grid-cols-1 gap-3">
					<div className="bg-white border border-gray-200 rounded-lg p-3">
						<h5 className="text-sm font-medium text-gray-800">🤖 智能分析</h5>
						<p className="text-xs text-gray-600 mt-1">
							自动分析文章内容，提取关键信息并生成合适的元数据
						</p>
					</div>
					<div className="bg-white border border-gray-200 rounded-lg p-3">
						<h5 className="text-sm font-medium text-gray-800">📝 内容建议</h5>
						<p className="text-xs text-gray-600 mt-1">
							根据文章内容智能建议标题、副标题、标签等信息
						</p>
					</div>
					<div className="bg-white border border-gray-200 rounded-lg p-3">
						<h5 className="text-sm font-medium text-gray-800">🏷️ 自动标签</h5>
						<p className="text-xs text-gray-600 mt-1">
							基于文章主题和内容自动生成相关标签
						</p>
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
					清空密钥
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