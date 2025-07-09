import {CoverAspectRatio} from "@/components/toolbar/cover/types";

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
