import React from "react";
import packageJson from "../../../package.json";

interface BrandSectionProps {
	onCopy: () => void;
	onDistribute: () => void;
}

export const BrandSection: React.FC<BrandSectionProps> = ({onCopy, onDistribute}) => {
	return (
		<div
			className="brand-section"
			style={{
				flex: "0 0 auto",
				padding: "16px",
				background: "linear-gradient(135deg, var(--background-secondary-alt) 0%, var(--background-secondary) 100%)",
				borderBottom: "1px solid var(--background-modifier-border)",
			}}
		>
			<div
				className="brand-content"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
				}}
			>
				<div
					className="brand-left-side"
					style={{
						display: "flex",
						alignItems: "center",
					}}
				>
					<div
						className="logo-container"
						style={{
							width: "48px",
							height: "48px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "linear-gradient(135deg, #6b46c1 0%, #4a6bf5 100%)",
							borderRadius: "8px",
							marginRight: "12px",
							boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
						}}
					>
						<div
							style={{
								color: "white",
								fontWeight: "bold",
								fontSize: "20px",
								fontFamily: "'Arial Black', sans-serif",
							}}
						>
							O
						</div>
					</div>
					<div
						className="title-container"
						style={{
							display: "flex",
							flexDirection: "column",
						}}
					>
						<div
							className="preview-title"
							style={{
								fontSize: "18px",
								fontWeight: "bold",
								background: "linear-gradient(90deg, #6b46c1 0%, #4a6bf5 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
							}}
						>
							Lovpen
						</div>
						<div
							className="version-container"
							style={{
								display: "flex",
								alignItems: "center",
								marginTop: "2px",
							}}
						>
							<div
								className="version-badge"
								style={{
									padding: "1px 6px",
									fontSize: "11px",
									fontWeight: "bold",
									color: "white",
									background: "linear-gradient(90deg, #4a6bf5 0%, #6b46c1 100%)",
									borderRadius: "10px",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
									lineHeight: "1.4",
								}}
							>
								V{packageJson.version}
							</div>
						</div>
					</div>
				</div>
				<div
					className="brand-actions"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>

					{/*<div*/}
					{/*	className="brand-name"*/}
					{/*	style={{*/}
					{/*		fontSize: "14px",*/}
					{/*		background: "linear-gradient(90deg, #4f6ef2 0%, #8a65d9 100%)",*/}
					{/*		WebkitBackgroundClip: "text",*/}
					{/*		WebkitTextFillColor: "transparent",*/}
					{/*		padding: "4px 10px",*/}
					{/*		border: "1px solid rgba(106, 106, 240, 0.3)",*/}
					{/*		borderRadius: "12px",*/}
					{/*		fontWeight: "600",*/}
					{/*		boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",*/}
					{/*	}}*/}
					{/*>*/}
					{/*	手工川智能创作平台*/}
					{/*</div>*/}

					<button
						onClick={onCopy}
						className="action-button copy-button"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							padding: "6px 10px",
							fontSize: "12px",
							fontWeight: "500",
							color: "white",
							background: "linear-gradient(90deg, #4a6bf5 0%, #6b46c1 100%)",
							border: "none",
							borderRadius: "8px",
							cursor: "pointer",
							boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
							transition: "all 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = "translateY(-1px)";
							e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.15)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = "translateY(0)";
							e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
						}}
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
						</svg>
						<span>复制</span>
					</button>
					<button
						onClick={onDistribute}
						className="action-button distribute-button"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							padding: "6px 10px",
							fontSize: "12px",
							fontWeight: "500",
							color: "white",
							background: "linear-gradient(90deg, #6b46c1 0%, #4a6bf5 100%)",
							border: "none",
							borderRadius: "8px",
							cursor: "pointer",
							boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
							transition: "all 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = "translateY(-1px)";
							e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.15)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = "translateY(0)";
							e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
						}}
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
							<polyline points="16 6 12 2 8 6"/>
							<line x1="12" y1="2" x2="12" y2="15"/>
						</svg>
						<span>分发</span>
					</button>
				</div>
			</div>
		</div>
	);
};
