import {CoverAspectRatio} from "@/components/toolbar/CoverDesigner";

interface CoverData {
	id: string;
	imageUrl: string;
	aspectRatio: CoverAspectRatio;
	width: number;
	height: number;
	title?: string;
	description?: string;
}

export type {CoverData};
