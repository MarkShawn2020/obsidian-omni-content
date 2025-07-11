import { PersistentFile, PersistentCover } from '../types';

const STORAGE_KEYS = {
	FILES: 'lovpen-persistent-files',
	COVERS: 'lovpen-persistent-covers'
} as const;

export class PersistentStorageService {
	private static instance: PersistentStorageService;
	private obsidianVault: any;

	private constructor() {
		this.obsidianVault = (window as any).app?.vault;
	}

	static getInstance(): PersistentStorageService {
		if (!PersistentStorageService.instance) {
			PersistentStorageService.instance = new PersistentStorageService();
		}
		return PersistentStorageService.instance;
	}

	async saveFile(file: File, customName?: string): Promise<PersistentFile> {
		const id = this.generateId();
		const name = customName || file.name;
		const fileName = `lovpen-files/${id}-${name}`;
		
		try {
			const arrayBuffer = await file.arrayBuffer();
			const uint8Array = new Uint8Array(arrayBuffer);
			
			if (this.obsidianVault?.adapter?.write) {
				await this.obsidianVault.adapter.write(fileName, uint8Array);
			}
			
			const persistentFile: PersistentFile = {
				id,
				name,
				path: fileName,
				type: file.type,
				size: file.size,
				createdAt: new Date().toISOString(),
				lastUsed: new Date().toISOString(),
				blob: file
			};
			
			await this.addFileToIndex(persistentFile);
			return persistentFile;
		} catch (error) {
			console.error('保存文件失败:', error);
			throw error;
		}
	}

	async saveFileFromUrl(url: string, name: string, type: string): Promise<PersistentFile> {
		const id = this.generateId();
		const fileName = `lovpen-files/${id}-${name}`;
		
		try {
			let arrayBuffer: ArrayBuffer;
			
			if (url.startsWith('http://') || url.startsWith('https://')) {
				const { requestUrl } = require('obsidian');
				const response = await requestUrl({ url, method: 'GET' });
				arrayBuffer = response.arrayBuffer;
			} else if (url.startsWith('blob:') || url.startsWith('data:')) {
				const response = await fetch(url);
				arrayBuffer = await response.arrayBuffer();
			} else {
				throw new Error('不支持的URL类型');
			}
			
			const uint8Array = new Uint8Array(arrayBuffer);
			
			if (this.obsidianVault?.adapter?.write) {
				await this.obsidianVault.adapter.write(fileName, uint8Array);
			}
			
			const persistentFile: PersistentFile = {
				id,
				name,
				path: fileName,
				type,
				size: arrayBuffer.byteLength,
				createdAt: new Date().toISOString(),
				lastUsed: new Date().toISOString()
			};
			
			await this.addFileToIndex(persistentFile);
			return persistentFile;
		} catch (error) {
			console.error('从URL保存文件失败:', error);
			throw error;
		}
	}

	async saveCover(coverData: {
		name: string;
		aspectRatio: '2.25:1' | '1:1';
		imageUrl: string;
		width: number;
		height: number;
		tags?: string[];
	}): Promise<PersistentCover> {
		const id = this.generateId();
		const fileName = `lovpen-covers/${id}-${coverData.name}.jpg`;
		
		try {
			let arrayBuffer: ArrayBuffer;
			
			if (coverData.imageUrl.startsWith('http://') || coverData.imageUrl.startsWith('https://')) {
				const { requestUrl } = require('obsidian');
				const response = await requestUrl({ url: coverData.imageUrl, method: 'GET' });
				arrayBuffer = response.arrayBuffer;
			} else if (coverData.imageUrl.startsWith('blob:') || coverData.imageUrl.startsWith('data:')) {
				const response = await fetch(coverData.imageUrl);
				arrayBuffer = await response.arrayBuffer();
			} else {
				throw new Error('不支持的图片URL类型');
			}
			
			const uint8Array = new Uint8Array(arrayBuffer);
			
			if (this.obsidianVault?.adapter?.write) {
				await this.obsidianVault.adapter.write(fileName, uint8Array);
			}
			
			const persistentCover: PersistentCover = {
				id,
				name: coverData.name,
				aspectRatio: coverData.aspectRatio,
				imageUrl: fileName,
				width: coverData.width,
				height: coverData.height,
				createdAt: new Date().toISOString(),
				lastUsed: new Date().toISOString(),
				tags: coverData.tags || []
			};
			
			await this.addCoverToIndex(persistentCover);
			return persistentCover;
		} catch (error) {
			console.error('保存封面失败:', error);
			throw error;
		}
	}

	async getFiles(): Promise<PersistentFile[]> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.FILES);
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('获取文件列表失败:', error);
			return [];
		}
	}

	async getCovers(): Promise<PersistentCover[]> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.COVERS);
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('获取封面列表失败:', error);
			return [];
		}
	}

	async deleteFile(id: string): Promise<void> {
		try {
			const files = await this.getFiles();
			const fileToDelete = files.find(f => f.id === id);
			
			if (fileToDelete && this.obsidianVault?.adapter?.remove) {
				await this.obsidianVault.adapter.remove(fileToDelete.path);
			}
			
			const updatedFiles = files.filter(f => f.id !== id);
			localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(updatedFiles));
		} catch (error) {
			console.error('删除文件失败:', error);
			throw error;
		}
	}

	async deleteCover(id: string): Promise<void> {
		try {
			const covers = await this.getCovers();
			const coverToDelete = covers.find(c => c.id === id);
			
			if (coverToDelete && this.obsidianVault?.adapter?.remove) {
				await this.obsidianVault.adapter.remove(coverToDelete.imageUrl);
			}
			
			const updatedCovers = covers.filter(c => c.id !== id);
			localStorage.setItem(STORAGE_KEYS.COVERS, JSON.stringify(updatedCovers));
		} catch (error) {
			console.error('删除封面失败:', error);
			throw error;
		}
	}

	async getFileUrl(file: PersistentFile): Promise<string> {
		try {
			if (file.blob) {
				return URL.createObjectURL(file.blob);
			}
			
			if (this.obsidianVault?.adapter?.read) {
				const uint8Array = await this.obsidianVault.adapter.read(file.path);
				const blob = new Blob([uint8Array], { type: file.type });
				return URL.createObjectURL(blob);
			}
			
			throw new Error('无法获取文件URL');
		} catch (error) {
			console.error('获取文件URL失败:', error);
			throw error;
		}
	}

	async getCoverUrl(cover: PersistentCover): Promise<string> {
		try {
			if (this.obsidianVault?.adapter?.read) {
				const uint8Array = await this.obsidianVault.adapter.read(cover.imageUrl);
				const blob = new Blob([uint8Array], { type: 'image/jpeg' });
				return URL.createObjectURL(blob);
			}
			
			throw new Error('无法获取封面URL');
		} catch (error) {
			console.error('获取封面URL失败:', error);
			throw error;
		}
	}

	async updateFileUsage(id: string): Promise<void> {
		const files = await this.getFiles();
		const fileIndex = files.findIndex(f => f.id === id);
		
		if (fileIndex !== -1) {
			files[fileIndex].lastUsed = new Date().toISOString();
			localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
		}
	}

	async updateCoverUsage(id: string): Promise<void> {
		const covers = await this.getCovers();
		const coverIndex = covers.findIndex(c => c.id === id);
		
		if (coverIndex !== -1) {
			covers[coverIndex].lastUsed = new Date().toISOString();
			localStorage.setItem(STORAGE_KEYS.COVERS, JSON.stringify(covers));
		}
	}

	private async addFileToIndex(file: PersistentFile): Promise<void> {
		const files = await this.getFiles();
		files.push(file);
		localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
	}

	private async addCoverToIndex(cover: PersistentCover): Promise<void> {
		const covers = await this.getCovers();
		covers.push(cover);
		localStorage.setItem(STORAGE_KEYS.COVERS, JSON.stringify(covers));
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const persistentStorageService = PersistentStorageService.getInstance();
