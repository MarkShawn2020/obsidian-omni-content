import React from "react";
import {ToggleSwitch} from "../ui/ToggleSwitch";
import {Select} from "../ui/Select";
import {ExtensionData, PluginData} from "../../types";

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

	const configEntries = Object.entries(item.metaConfig || {});
	const hasConfigOptions = configEntries.length > 0;

	const handleEnabledChange = (enabled: boolean) => {
		onEnabledChange(item.name, enabled);
	};

	const handleConfigChange = (key: string, value: string | boolean) => {
		onConfigChange?.(item.name, key, value);
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
											checked={!!item.config[key]}
											onChange={(value) => handleConfigChange(key, value)}
										/>
									) : meta.type === "select" ? (
										<Select
											value={String(item.config[key] || "")}
											options={meta.options || []}
											onChange={(value) => handleConfigChange(key, value)}
											className={`${type}-config-select`}
										/>
									) : meta.type === "input" ? (
										<input
											type="text"
											value={String(item.config[key] || "")}
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

