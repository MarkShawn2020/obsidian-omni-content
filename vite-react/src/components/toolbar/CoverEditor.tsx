import React, { useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { logger } from '../../../../src/logger';
import { imageGenerationService } from '../../services/imageGenerationService';
import { CoverData } from '@/components/toolbar/CoverData';
import { CoverAspectRatio, CoverImageSource } from '@/components/toolbar/CoverDesigner';

interface ExtractedImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface AIGenerateParams {
  prompt: string;
  style: string;
  aspectRatio: CoverAspectRatio;
}

interface GenerationStatus {
  isGenerating: boolean;
  progress: number;
  message: string;
}

interface CoverEditorProps {
  coverNumber: 1 | 2;
  aspectRatio: CoverAspectRatio;
  selectedImages: ExtractedImage[];
  onCreateCover: (imageUrl: string, source: CoverImageSource) => Promise<void>;
  getDimensions: () => { width: number; height: number; aspectRatio: CoverAspectRatio };
  generationStatus: GenerationStatus;
  setGenerationStatus: (status: GenerationStatus) => void;
  generationError: string;
  setGenerationError: (error: string) => void;
}

export const CoverEditor: React.FC<CoverEditorProps> = ({
  coverNumber,
  aspectRatio,
  selectedImages,
  onCreateCover,
  getDimensions,
  generationStatus,
  setGenerationStatus,
  generationError,
  setGenerationError
}) => {
  const [activeTab, setActiveTab] = useState<CoverImageSource>('article');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiStyle, setAiStyle] = useState<string>('realistic');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    );

    setUploadedImages(prev => [...prev, ...imageFiles]);
    logger.info(`[CoverEditor] 封面${coverNumber}上传图片`, { count: imageFiles.length });
  }, [coverNumber]);

  const generateAIImage = useCallback(async (params: AIGenerateParams) => {
    setGenerationStatus({
      isGenerating: true,
      progress: 0,
      message: '正在准备生成...'
    });
    setGenerationError('');
    logger.info('[CoverEditor] 开始生成AI图片', params);

    try {
      const progressUpdates = [
        { progress: 20, message: '正在处理提示词...' },
        { progress: 40, message: '正在生成图像...' },
        { progress: 60, message: '正在优化细节...' },
        { progress: 80, message: '正在后处理...' },
        { progress: 100, message: '生成完成!' }
      ];

      for (const update of progressUpdates) {
        setGenerationStatus({
          isGenerating: true,
          progress: update.progress,
          message: update.message
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const dimensions = getDimensions();
      const result = await imageGenerationService.generateImage({
        prompt: params.prompt,
        style: params.style,
        aspectRatio: params.aspectRatio,
        width: dimensions.width,
        height: dimensions.height
      });

      if (result.success && result.imageUrl) {
        setGeneratedImages(prev => [...prev, result.imageUrl!]);
        logger.info(`[CoverEditor] 封面${coverNumber} AI图片生成成功`);
      } else {
        throw new Error(result.error || '生成失败');
      }
    } catch (error) {
      logger.error('[CoverEditor] AI图片生成失败', error);
      setGenerationError(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setGenerationStatus({
        isGenerating: false,
        progress: 0,
        message: ''
      });
    }
  }, [coverNumber, getDimensions, setGenerationStatus, setGenerationError]);

  const renderImageGrid = useCallback((images: string[], onImageClick: (url: string) => Promise<void>) => {
    logger.info(`[CoverEditor] 封面${coverNumber}渲染图片网格`, {
      imageCount: images.length,
      firstImageUrl: images[0]?.substring(0, 100)
    });

    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="relative border border-gray-200 rounded overflow-hidden hover:border-blue-500 cursor-pointer transition-colors"
            onClick={() => onImageClick(imageUrl)}
          >
            <img
              src={imageUrl}
              alt={`Image ${index + 1}`}
              className="w-full h-20 object-cover"
              onLoad={(e) => {
                logger.info(`[CoverEditor] 封面${coverNumber}图片加载成功 ${index + 1}`, {
                  src: imageUrl.substring(0, 100),
                  naturalWidth: e.currentTarget.naturalWidth,
                  naturalHeight: e.currentTarget.naturalHeight
                });
              }}
              onError={(e) => {
                logger.error(`[CoverEditor] 封面${coverNumber}图片加载失败 ${index + 1}`, {
                  src: imageUrl,
                  error: e
                });
              }}
            />
            <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    );
  }, [coverNumber]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        🖼️ 封面{coverNumber}图片来源
      </label>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CoverImageSource)}>
        <TabsList>
          <TabsTrigger value="article">文中图片</TabsTrigger>
          <TabsTrigger value="upload">本地上传</TabsTrigger>
          <TabsTrigger value="ai">AI生成</TabsTrigger>
        </TabsList>

        <TabsContent value="article">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              从文章中选择图片制作封面
            </p>
            <div className="mb-2 text-xs text-gray-600">
              调试信息: 找到 {selectedImages.length} 张图片
              {selectedImages.length > 0 && (
                <div className="mt-1">
                  第一张: {selectedImages[0]?.src?.substring(0, 80)}...
                </div>
              )}
            </div>

            {selectedImages.length > 0 ? (
              renderImageGrid(
                selectedImages.map(img => img.src),
                async (url) => await onCreateCover(url, 'article')
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                文章中没有找到图片
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                为封面{coverNumber}选择图片
              </button>
              <span className="text-sm text-gray-600">
                支持 JPG、PNG、GIF 格式
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploadedImages.length > 0 && (
              renderImageGrid(
                uploadedImages.map(file => URL.createObjectURL(file)),
                async (url) => await onCreateCover(url, 'upload')
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述封面{coverNumber}想要的封面
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例如：科技感蓝色背景，适合科技文章"
                rows={2}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  风格
                </label>
                <select
                  value={aiStyle}
                  onChange={(e) => setAiStyle(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="realistic">写实</option>
                  <option value="illustration">插画</option>
                  <option value="minimalist">简约</option>
                  <option value="abstract">抽象</option>
                  <option value="tech">科技</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => generateAIImage({
                    prompt: aiPrompt,
                    style: aiStyle,
                    aspectRatio: aspectRatio
                  })}
                  disabled={!aiPrompt || generationStatus.isGenerating}
                  className="w-full px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generationStatus.isGenerating ? '生成中' : '生成'}
                </button>
              </div>
            </div>

            {/* 生成进度条 */}
            {generationStatus.isGenerating && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-purple-500 h-1 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${generationStatus.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 text-center">
                  {generationStatus.message}
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {generationError && (
              <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span>{generationError}</span>
                  <button
                    onClick={() => setGenerationError('')}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                  >
                    重试
                  </button>
                </div>
              </div>
            )}
            {generatedImages.length > 0 && (
              renderImageGrid(
                generatedImages,
                async (url) => await onCreateCover(url, 'ai')
              )
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};