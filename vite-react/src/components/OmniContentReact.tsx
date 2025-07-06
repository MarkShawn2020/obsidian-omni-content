import React, { useCallback, useEffect, useRef, useState } from "react";
import { OmniContentReactProps } from "../types";
import { Toolbar } from "./toolbar/Toolbar";
import { MessageModal } from "./preview/MessageModal";

export const OmniContentReact: React.FC<OmniContentReactProps> = ({
  settings,
  articleHTML,
  cssContent,
  extensions,
  plugins,
  onRefresh,
  onCopy,
  onDistribute,
  onTemplateChange,
  onThemeChange,
  onHighlightChange,
  onThemeColorToggle,
  onThemeColorChange,
  onRenderArticle,
  onSaveSettings,
  onUpdateCSSVariables,
  onExtensionToggle,
  onPluginToggle,
}) => {
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [showOkButton, setShowOkButton] = useState(false);
  const renderDivRef = useRef<HTMLDivElement>(null);
  const styleElRef = useRef<HTMLStyleElement>(null);
  const articleDivRef = useRef<HTMLDivElement>(null);

  // 拖拽调整大小的状态
  const [renderWidth, setRenderWidth] = useState<string>("flex: 1");

  // 更新CSS样式
  useEffect(() => {
    if (styleElRef.current) {
      styleElRef.current.textContent = cssContent;
    }
  }, [cssContent]);

  // 更新文章内容
  useEffect(() => {
    if (articleDivRef.current) {
      articleDivRef.current.innerHTML = articleHTML;
      // 应用CSS变量更新
      onUpdateCSSVariables();
    }
  }, [articleHTML, onUpdateCSSVariables]);

  // 显示加载消息
  const showLoading = useCallback((msg: string) => {
    setMessageTitle(msg);
    setShowOkButton(false);
    setIsMessageVisible(true);
  }, []);

  // 显示消息
  const showMsg = useCallback((msg: string) => {
    setMessageTitle(msg);
    setShowOkButton(true);
    setIsMessageVisible(true);
  }, []);

  // 暴露方法给外部使用（示例，实际使用时需要通过 ref 传递）
  // React.useImperativeHandle(ref, () => ({
  //   showLoading,
  //   showMsg,
  // }));
  
  // 为了避免编译错误，我们保持这些方法的引用
  // showLoading 和 showMsg 方法在实际使用中会被调用
  void showLoading;
  void showMsg;

  // 关闭消息
  const closeMessage = useCallback(() => {
    setIsMessageVisible(false);
  }, []);

  // 拖拽调整大小的处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!renderDivRef.current) return;

    const startX = e.clientX;
    const startWidth = renderDivRef.current.getBoundingClientRect().width;

    const handleMouseMove = (e: MouseEvent) => {
      if (!renderDivRef.current) return;

      const newWidth = startWidth + e.clientX - startX;
      const containerWidth = renderDivRef.current.parentElement?.getBoundingClientRect().width || 0;
      const minWidth = 200;
      const maxWidth = containerWidth - 250;

      if (newWidth > minWidth && newWidth < maxWidth) {
        setRenderWidth(`0 0 ${newWidth}px`);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      className="note-preview"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 左侧渲染区域 */}
      <div
        ref={renderDivRef}
        className="render-div"
        id="render-div"
        style={{
          order: 0,
          WebkitUserSelect: "text",
          userSelect: "text",
          padding: "10px",
          flex: renderWidth,
          overflow: "auto",
          borderRight: "1px solid var(--background-modifier-border)",
        }}
      >
        <style ref={styleElRef} title="omni-content-style">
          {cssContent}
        </style>
        <div ref={articleDivRef} dangerouslySetInnerHTML={{ __html: articleHTML }} />
      </div>

      {/* 可拖动的分隔条 */}
      <div
        className="column-resizer"
        style={{
          order: 1,
          width: "5px",
          backgroundColor: "var(--background-modifier-border)",
          cursor: "col-resize",
          opacity: 0.7,
          transition: "opacity 0.2s",
          zIndex: 10,
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
      />

      {/* 右侧工具栏容器 */}
      <div
        className="toolbar-container"
        style={{
          order: 2,
          flex: 1,
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          backgroundColor: "var(--background-secondary-alt)",
          borderLeft: "1px solid var(--background-modifier-border)",
        }}
      >
        <Toolbar
          settings={settings}
          extensions={extensions}
          plugins={plugins}
          onRefresh={onRefresh}
          onCopy={onCopy}
          onDistribute={onDistribute}
          onTemplateChange={onTemplateChange}
          onThemeChange={onThemeChange}
          onHighlightChange={onHighlightChange}
          onThemeColorToggle={onThemeColorToggle}
          onThemeColorChange={onThemeColorChange}
          onRenderArticle={onRenderArticle}
          onSaveSettings={onSaveSettings}
          onExtensionToggle={onExtensionToggle}
          onPluginToggle={onPluginToggle}
        />
      </div>

      {/* 消息模态框 */}
      <MessageModal
        isVisible={isMessageVisible}
        title={messageTitle}
        showOkButton={showOkButton}
        onClose={closeMessage}
      />
    </div>
  );
};