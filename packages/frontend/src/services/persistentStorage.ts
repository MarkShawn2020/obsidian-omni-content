import {
	PersistentFile,
	PersistentCover,
	PersistentTemplateKit,
	PersistentPluginConfig,
	PersistentPersonalInfo,
	PersistentArticleInfo,
	PersistentStyleSettings,
	TemplateKit,
	PersonalInfo,
	ArticleInfoData
} from '../types';

const STORAGE_KEYS = {
	FILES: 'lovpen-persistent-files',
	COVERS: 'lovpen-persistent-covers',
	TEMPLATE_KITS: 'lovpen-persistent-template-kits',
	PLUGIN_CONFIGS: 'lovpen-persistent-plugin-configs',
	PERSONAL_INFO: 'lovpen-persistent-personal-info',
	ARTICLE_INFO: 'lovpen-persistent-article-info',
	STYLE_SETTINGS: 'lovpen-persistent-style-settings'
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

	// Template Kit Management
	async saveTemplateKit(kitData: TemplateKit, customName?: string): Promise<PersistentTemplateKit> {
		const id = this.generateId();
		const name = customName || kitData.basicInfo.name;
		
		try {
			const persistentKit: PersistentTemplateKit = {
				id,
				name,
				description: kitData.basicInfo.description,
				author: kitData.basicInfo.author,
				version: kitData.basicInfo.version,
				tags: kitData.basicInfo.tags,
				configData: kitData,
				createdAt: new Date().toISOString(),
				lastUsed: new Date().toISOString()
			};
			
			await this.addTemplateKitToIndex(persistentKit);
			return persistentKit;
		} catch (error) {
			console.error('保存模板套装失败:', error);
			throw error;
		}
	}

	async getTemplateKits(): Promise<PersistentTemplateKit[]> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATE_KITS);
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('获取模板套装列表失败:', error);
			return [];
		}
	}

	async deleteTemplateKit(id: string): Promise<void> {
		try {
			const kits = await this.getTemplateKits();
			const updatedKits = kits.filter(k => k.id !== id);
			localStorage.setItem(STORAGE_KEYS.TEMPLATE_KITS, JSON.stringify(updatedKits));
		} catch (error) {
			console.error('删除模板套装失败:', error);
			throw error;
		}
	}

	// Plugin Configuration Management
	async savePluginConfig(pluginName: string, config: any, metaConfig: any): Promise<PersistentPluginConfig> {
		try {
			const configs = await this.getPluginConfigs();
			const existingIndex = configs.findIndex(c => c.pluginName === pluginName);
			
			const persistentConfig: PersistentPluginConfig = {
				id: existingIndex >= 0 ? configs[existingIndex].id : this.generateId(),
				pluginName,
				config,
				metaConfig,
				updatedAt: new Date().toISOString()
			};
			
			if (existingIndex >= 0) {
				configs[existingIndex] = persistentConfig;
			} else {
				configs.push(persistentConfig);
			}
			
			localStorage.setItem(STORAGE_KEYS.PLUGIN_CONFIGS, JSON.stringify(configs));
			return persistentConfig;
		} catch (error) {
			console.error('保存插件配置失败:', error);
			throw error;
		}
	}

	async getPluginConfigs(): Promise<PersistentPluginConfig[]> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.PLUGIN_CONFIGS);
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('获取插件配置失败:', error);
			return [];
		}
	}

	async getPluginConfig(pluginName: string): Promise<PersistentPluginConfig | null> {
		const configs = await this.getPluginConfigs();
		return configs.find(c => c.pluginName === pluginName) || null;
	}

	// Personal Info Management
	async savePersonalInfo(info: PersonalInfo): Promise<PersistentPersonalInfo> {
		try {
			const persistentInfo: PersistentPersonalInfo = {
				id: 'personal-info', // 单例
				data: info,
				updatedAt: new Date().toISOString()
			};
			
			localStorage.setItem(STORAGE_KEYS.PERSONAL_INFO, JSON.stringify(persistentInfo));
			return persistentInfo;
		} catch (error) {
			console.error('保存个人信息失败:', error);
			throw error;
		}
	}

	async getPersonalInfo(): Promise<PersistentPersonalInfo | null> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_INFO);
			return stored ? JSON.parse(stored) : null;
		} catch (error) {
			console.error('获取个人信息失败:', error);
			return null;
		}
	}

	// Article Info Management
	async saveArticleInfo(info: ArticleInfoData): Promise<PersistentArticleInfo> {
		try {
			const persistentInfo: PersistentArticleInfo = {
				id: 'article-info', // 单例
				data: info,
				updatedAt: new Date().toISOString()
			};
			
			localStorage.setItem(STORAGE_KEYS.ARTICLE_INFO, JSON.stringify(persistentInfo));
			return persistentInfo;
		} catch (error) {
			console.error('保存文章信息失败:', error);
			throw error;
		}
	}

	async getArticleInfo(): Promise<PersistentArticleInfo | null> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.ARTICLE_INFO);
			return stored ? JSON.parse(stored) : null;
		} catch (error) {
			console.error('获取文章信息失败:', error);
			return null;
		}
	}

	// Style Settings Management
	async saveStyleSettings(settings: {
		defaultStyle: string;
		defaultHighlight: string;
		defaultTemplate: string;
		useTemplate: boolean;
		enableThemeColor: boolean;
		themeColor: string;
	}): Promise<PersistentStyleSettings> {
		try {
			const persistentSettings: PersistentStyleSettings = {
				id: 'style-settings', // 单例
				...settings,
				updatedAt: new Date().toISOString()
			};
			
			localStorage.setItem(STORAGE_KEYS.STYLE_SETTINGS, JSON.stringify(persistentSettings));
			return persistentSettings;
		} catch (error) {
			console.error('保存样式设置失败:', error);
			throw error;
		}
	}

	async getStyleSettings(): Promise<PersistentStyleSettings | null> {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.STYLE_SETTINGS);
			return stored ? JSON.parse(stored) : null;
		} catch (error) {
			console.error('获取样式设置失败:', error);
			return null;
		}
	}

	// Clear all persistent data
	async clearAllPersistentData(): Promise<void> {
		try {
			Object.values(STORAGE_KEYS).forEach(key => {
				localStorage.removeItem(key);
			});
			console.log('清空所有持久化数据完成');
		} catch (error) {
			console.error('清空持久化数据失败:', error);
			throw error;
		}
	}

	// Export all persistent data
	async exportAllData(): Promise<any> {
		try {
			const data = {
				files: await this.getFiles(),
				covers: await this.getCovers(),
				templateKits: await this.getTemplateKits(),
				pluginConfigs: await this.getPluginConfigs(),
				personalInfo: await this.getPersonalInfo(),
				articleInfo: await this.getArticleInfo(),
				styleSettings: await this.getStyleSettings(),
				exportedAt: new Date().toISOString()
			};
			return data;
		} catch (error) {
			console.error('导出数据失败:', error);
			throw error;
		}
	}

	private async addTemplateKitToIndex(kit: PersistentTemplateKit): Promise<void> {
		const kits = await this.getTemplateKits();
		kits.push(kit);
		localStorage.setItem(STORAGE_KEYS.TEMPLATE_KITS, JSON.stringify(kits));
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const persistentStorageService = PersistentStorageService.getInstance();
