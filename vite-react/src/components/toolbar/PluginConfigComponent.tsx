import React from "react";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Select } from "../ui/Select";
import { ExtensionData, PluginData } from "../../types";

interface PluginConfigComponentProps {
  plugin: PluginData;
  expandedSections: string[];
  onToggle: (sectionId: string, isExpanded: boolean) => void;
  onEnabledChange: (pluginName: string, enabled: boolean) => void;
  onConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
}

interface ExtensionConfigComponentProps {
  extension: ExtensionData;
  expandedSections: string[];
  onToggle: (sectionId: string, isExpanded: boolean) => void;
  onEnabledChange: (extensionName: string, enabled: boolean) => void;
  onConfigChange?: (extensionName: string, key: string, value: string | boolean) => void;
}

export const PluginConfigComponent: React.FC<PluginConfigComponentProps> = ({
  plugin,
  expandedSections,
  onToggle,
  onEnabledChange,
  onConfigChange,
}) => {
  const pluginId = `plugin-${plugin.name.replace(/\s+/g, "-").toLowerCase()}`;
  const isExpanded = expandedSections.includes(pluginId);
  
  const configEntries = Object.entries(plugin.metaConfig || {});
  const hasConfigOptions = configEntries.length > 0;

  const handleEnabledChange = (enabled: boolean) => {
    onEnabledChange(plugin.name, enabled);
  };

  const handleConfigChange = (key: string, value: string | boolean) => {
    onConfigChange?.(plugin.name, key, value);
  };

  const handleToggle = () => {
    onToggle(pluginId, !isExpanded);
  };

  return (
    <div
      id={pluginId}
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
        onClick={hasConfigOptions ? handleToggle : undefined}
      >
        <div
          className="accordion-header-left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <ToggleSwitch
            checked={plugin.enabled}
            onChange={handleEnabledChange}
            size="small"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="accordion-title">{plugin.name}</div>
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
              <path d="M6 9l6 6 6-6" />
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
            className="plugin-config-container"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {configEntries.map(([key, meta]) => (
              <div
                key={key}
                className="plugin-config-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="plugin-config-title">{meta.title}</div>
                <div className="plugin-config-control">
                  {meta.type === "switch" ? (
                    <ToggleSwitch
                      checked={!!plugin.config[key]}
                      onChange={(value) => handleConfigChange(key, value)}
                    />
                  ) : meta.type === "select" ? (
                    <Select
                      value={String(plugin.config[key] || "")}
                      options={meta.options || []}
                      onChange={(value) => handleConfigChange(key, value)}
                      className="plugin-config-select"
                    />
                  ) : meta.type === "input" ? (
                    <input
                      type="text"
                      value={String(plugin.config[key] || "")}
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

export const ExtensionConfigComponent: React.FC<ExtensionConfigComponentProps> = ({
  extension,
  expandedSections,
  onToggle,
  onEnabledChange,
  onConfigChange,
}) => {
  const extensionId = `extension-${extension.name.replace(/\s+/g, "-").toLowerCase()}`;
  const isExpanded = expandedSections.includes(extensionId);
  
  const configEntries = Object.entries(extension.metaConfig || {});
  const hasConfigOptions = configEntries.length > 0;

  const handleEnabledChange = (enabled: boolean) => {
    onEnabledChange(extension.name, enabled);
  };

  const handleConfigChange = (key: string, value: string | boolean) => {
    onConfigChange?.(extension.name, key, value);
  };

  const handleToggle = () => {
    onToggle(extensionId, !isExpanded);
  };

  return (
    <div
      id={extensionId}
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
        onClick={hasConfigOptions ? handleToggle : undefined}
      >
        <div
          className="accordion-header-left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <ToggleSwitch
            checked={extension.enabled}
            onChange={handleEnabledChange}
            size="small"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="accordion-title">{extension.name}</div>
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
              <path d="M6 9l6 6 6-6" />
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
            className="extension-config-container"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {configEntries.map(([key, meta]) => (
              <div
                key={key}
                className="extension-config-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="extension-config-title">{meta.title}</div>
                <div className="extension-config-control">
                  {meta.type === "switch" ? (
                    <ToggleSwitch
                      checked={!!extension.config[key]}
                      onChange={(value) => handleConfigChange(key, value)}
                    />
                  ) : meta.type === "select" ? (
                    <Select
                      value={String(extension.config[key] || "")}
                      options={meta.options || []}
                      onChange={(value) => handleConfigChange(key, value)}
                      className="extension-config-select"
                    />
                  ) : meta.type === "input" ? (
                    <input
                      type="text"
                      value={String(extension.config[key] || "")}
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