import React, {useEffect, useRef, useState} from "react";
import {ToggleSwitch} from "../ui/ToggleSwitch";
import {SelectWrapper} from "../ui/Select";
import {PluginData} from "../../types";
import {logger} from "../../../../src/logger";

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

// const loadFromStorage = (key: string) => {
// 	try {
// 		const stored = localStorage.getItem(key);
// 		return stored ? JSON.parse(stored) : null;
// 	} catch (error) {
// 		console.warn('Failed to load from localStorage:', error);
// 		return null;
// 	}
// };


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
					<div className="accordion-title">
						<div className="plugin-title">{item.name}</div>
						{item.description && (
							<div
								className="plugin-description"
								style={{
									fontSize: "11px",
									color: "var(--text-muted)",
									marginTop: "2px",
									lineHeight: "1.3",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									maxWidth: "200px"
								}}
								title={item.description}
							>
								{item.description}
							</div>
						)}
					</div>
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
										<SelectWrapper
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

