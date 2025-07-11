import React, {useEffect, useRef, useState} from "react";
import {ToggleSwitch} from "../ui/ToggleSwitch";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../ui/select";
import {PluginData} from "../../types";

import {logger} from "../../../../shared/src/logger";
import { ChevronDown, Settings, Info, Plug } from "lucide-react";

const STORAGE_KEY_PREFIX = 'lovpen-config';

const getStorageKey = (type: string, itemName: string) => {
	return `${STORAGE_KEY_PREFIX}-${type}-${itemName}`;
};

const saveToStorage = (key: string, value: any) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.warn('Failed to save to localStorage:', error);
	}
};


interface ConfigComponentProps<T extends PluginData> {
	item: T;
	type: 'plugin' | 'extension';
	expandedSections: string[];
	onToggle: (sectionId: string, isExpanded: boolean) => void;
	onEnabledChange: (itemName: string, enabled: boolean) => void;
	onConfigChange?: (itemName: string, key: string, value: string | boolean) => void;
}


export const ConfigComponent = <T extends PluginData>({
														  item,
														  type,
														  expandedSections,
														  onToggle,
														  onEnabledChange,
														  onConfigChange,
													  }: ConfigComponentProps<T>) => {
	const itemId = `${type}-${item.name.replace(/\s+/g, "-").toLowerCase()}`;
	const isExpanded = expandedSections.includes(itemId);
	const storageKey = getStorageKey(type, item.name);

	// 以 item.config 为准，localStorage 只作为备份
	const getInitialConfig = () => {
		// 优先使用 item.config，确保前后端一致
		return item.config || {};
	};

	// 本地配置状态管理
	const [localConfig, setLocalConfig] = useState(getInitialConfig);
	const hasLocalUpdate = useRef(false);

	// 当外部配置变化时同步本地状态（但避免覆盖刚刚的本地更新）
	useEffect(() => {
		if (!hasLocalUpdate.current) {
			// 以 item.config 为准，确保前后端一致
			setLocalConfig({...item.config});
		} else {
			// 重置标记，允许下次外部更新
			hasLocalUpdate.current = false;
		}
	}, [item.config]);

	const configEntries = Object.entries(item.metaConfig || {});
	const hasConfigOptions = configEntries.length > 0;

	const handleEnabledChange = (enabled: boolean) => {
		// 持久化enabled状态
		const enabledStorageKey = `${storageKey}-enabled`;
		saveToStorage(enabledStorageKey, enabled);

		onEnabledChange(item.name, enabled);
	};


	const handleConfigChange = (key: string, value: string | boolean) => {
		// 标记为本地更新，防止外部同步覆盖
		hasLocalUpdate.current = true;

		// 1. 首先更新原始配置对象（确保后端能读取到最新配置）
		item.config[key] = value;

		// 2. 更新本地状态
		const newConfig = {...localConfig, [key]: value};
		setLocalConfig(newConfig);

		// 3. 持久化到localStorage作为备份
		saveToStorage(storageKey, newConfig);

		// 调试日志
		logger.debug(`[PluginConfigComponent] 配置更新: ${item.name}.${key} = ${value}`);
		logger.debug(`[PluginConfigComponent] 更新后的item.config:`, {...item.config});
		logger.debug(`[PluginConfigComponent] 更新后的localConfig:`, {...newConfig});

		// 4. 调用外部回调更新原始数据
		if (onConfigChange) {
			onConfigChange(item.name, key, value);
		}
	};

	const handleToggle = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		e.nativeEvent?.stopImmediatePropagation?.();
		if (hasConfigOptions) {
			onToggle(itemId, !isExpanded);
		}
	};

	return (
		<div
			id={itemId}
			className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-3 transition-all duration-200 hover:shadow-md"
		>
			<div
				className={`p-4 cursor-pointer transition-colors ${hasConfigOptions ? 'hover:bg-gray-50' : ''}`}
				onClick={handleToggle}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div onClick={(e) => e.stopPropagation()}>
							<ToggleSwitch
								checked={item.enabled}
								onChange={handleEnabledChange}
								size="small"
							/>
						</div>
						
						<div className="flex items-center gap-2">
							<div className={`p-1.5 rounded-lg ${item.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
								<Plug className={`h-4 w-4 ${item.enabled ? 'text-green-600' : 'text-gray-400'}`} />
							</div>
							<div>
								<div className="font-medium text-gray-900">{item.name}</div>
								{item.description && (
									<div className="text-xs text-gray-500 mt-0.5 max-w-[300px] truncate" title={item.description}>
										{item.description}
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{item.enabled && (
							<div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
								已启用
							</div>
						)}
						{hasConfigOptions && (
							<div className={`p-1 rounded-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
								<ChevronDown className="h-4 w-4 text-gray-400" />
							</div>
						)}
					</div>
				</div>
			</div>

			{hasConfigOptions && isExpanded && (
				<div className="border-t border-gray-100 bg-gray-50/50 p-4">
					<div className="flex items-center gap-2 mb-4">
						<Settings className="h-4 w-4 text-blue-600" />
						<span className="text-sm font-medium text-gray-900">插件配置</span>
					</div>
					
					<div className="space-y-4">
						{configEntries.map(([key, meta]) => (
							<div key={key} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
								<div className="flex items-center gap-2">
									<Info className="h-4 w-4 text-gray-400" />
									<span className="text-sm font-medium text-gray-700">{meta.title}</span>
								</div>
								<div onClick={(e) => e.stopPropagation()}>
									{meta.type === "switch" ? (
										<ToggleSwitch
											checked={!!localConfig[key]}
											onChange={(value) => handleConfigChange(key, value)}
											size="small"
										/>
									) : meta.type === "select" ? (
										<Select
											value={String(localConfig[key] || "")}
											onValueChange={(value) => handleConfigChange(key, value)}
										>
											<SelectTrigger className="w-40">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{(meta.options || []).map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.text}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : meta.type === "input" ? (
										<input
											type="text"
											value={String(localConfig[key] || "")}
											onChange={(e) => handleConfigChange(key, e.target.value)}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
											placeholder="输入值..."
										/>
									) : null}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

