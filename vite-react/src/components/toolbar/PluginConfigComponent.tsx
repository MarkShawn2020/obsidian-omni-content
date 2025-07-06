import React, { useState, useEffect, useRef } from "react";
import {ToggleSwitch} from "../ui/ToggleSwitch";
import {Select} from "../ui/Select";
import {ExtensionData, PluginData} from "../../types";

const STORAGE_KEY_PREFIX = 'omni-content-config';

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

const loadFromStorage = (key: string) => {
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : null;
	} catch (error) {
		console.warn('Failed to load from localStorage:', error);
		return null;
	}
};

type ConfigItem = PluginData | ExtensionData;

interface ConfigComponentProps<T extends ConfigItem> {
	item: T;
	type: 'plugin' | 'extension';
	expandedSections: string[];
	onToggle: (sectionId: string, isExpanded: boolean) => void;
	onEnabledChange: (itemName: string, enabled: boolean) => void;
	onConfigChange?: (itemName: string, key: string, value: string | boolean) => void;
}


export const ConfigComponent = <T extends ConfigItem>({
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
	
	// 从localStorage加载初始配置
	const getInitialConfig = () => {
		const storedConfig = loadFromStorage(storageKey);
		return storedConfig || item.config || {};
	};
	
	// 本地配置状态管理
	const [localConfig, setLocalConfig] = useState(getInitialConfig);
	const hasLocalUpdate = useRef(false);

	// 当外部配置变化时同步本地状态（但避免覆盖刚刚的本地更新）
	useEffect(() => {
		if (!hasLocalUpdate.current) {
			const storedConfig = loadFromStorage(storageKey);
			if (storedConfig) {
				setLocalConfig(storedConfig);
			} else {
				setLocalConfig({ ...item.config });
			}
		} else {
			// 重置标记，允许下次外部更新
			const timer = setTimeout(() => {
				hasLocalUpdate.current = false;
			}, 1000); // 1秒后允许外部同步
			return () => clearTimeout(timer);
		}
	}, [item.config, storageKey]);

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
		
		// 立即更新本地状态
		const newConfig = { ...localConfig, [key]: value };
		setLocalConfig(newConfig);
		
		// 持久化到localStorage
		saveToStorage(storageKey, newConfig);
		
		// 同时直接更新原始配置对象作为备用方案
		item.config[key] = value;
		
		// 调试日志
		console.log(`[PluginConfigComponent] 配置更新: ${item.name}.${key} = ${value}`);
		console.log(`[PluginConfigComponent] 更新后的配置:`, { ...item.config });
		
		// 尝试调用外部回调更新原始数据
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
			className="accordion-section"
			style={{
				marginBottom: "8px",
				border: "1px solid var(--background-modifier-border)",
				borderRadius: "4px",
			}}
		>
			<div
				className="accordion-header"
				style={{
					padding: "10px",
					cursor: hasConfigOptions ? "pointer" : "default",
					backgroundColor: "var(--background-secondary)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
				onClick={handleToggle}
			>
				<div
					className="accordion-header-left"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<div onClick={(e) => e.stopPropagation()}>
						<ToggleSwitch
							checked={item.enabled}
							onChange={handleEnabledChange}
							size="small"
						/>
					</div>
					<div className="accordion-title">{item.name}</div>
				</div>

				{hasConfigOptions && (
					<div
						className="accordion-icon"
						style={{
							transition: "transform 0.3s",
							transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
						}}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M6 9l6 6 6-6"/>
						</svg>
					</div>
				)}
			</div>

			{hasConfigOptions && isExpanded && (
				<div
					className="accordion-content"
					style={{
						padding: "16px",
						transition: "0.3s ease-out",
						display: "block",
					}}
				>
					<div
						className={`${type}-config-container`}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						{configEntries.map(([key, meta]) => (
							<div
								key={key}
								className={`${type}-config-item`}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<div className={`${type}-config-title`}>{meta.title}</div>
								<div className={`${type}-config-control`} onClick={(e) => e.stopPropagation()}>
									{meta.type === "switch" ? (
										<ToggleSwitch
											checked={!!localConfig[key]}
											onChange={(value) => handleConfigChange(key, value)}
											size="small"
										/>
									) : meta.type === "select" ? (
										<Select
											value={String(localConfig[key] || "")}
											options={meta.options || []}
											onChange={(value) => handleConfigChange(key, value)}
											className={`${type}-config-select`}
										/>
									) : meta.type === "input" ? (
										<input
											type="text"
											value={String(localConfig[key] || "")}
											onChange={(e) => handleConfigChange(key, e.target.value)}
											style={{
												padding: "4px 8px",
												border: "1px solid var(--background-modifier-border)",
												borderRadius: "4px",
												backgroundColor: "var(--background-primary)",
												color: "var(--text-normal)",
											}}
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

