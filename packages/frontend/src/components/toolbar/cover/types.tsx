export type CoverAspectRatio = '2.25:1' | '1:1' | 'custom';
export type CoverImageSource = 'article' | 'upload' | 'library' | 'covers' | 'ai';

export interface ExtractedImage {
	src: string;
	alt: string;
	width?: number;
	height?: number;
}

export interface GenerationStatus {
	isGenerating: boolean;
	progress: number;
	message: string;
}
