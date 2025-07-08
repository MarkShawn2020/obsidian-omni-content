export interface ThemeOption {
    name: string;
    className: string;
    desc?: string;
    author?: string;
}

export interface HighlightOption {
    name: string;
    url?: string;
}

export interface TemplateOption {
    name: string;
    filename: string;
}

export interface ResourceLoader {
    loadThemes(): Promise<ThemeOption[]>;
    loadHighlights(): Promise<HighlightOption[]>;
    loadTemplates(): Promise<TemplateOption[]>;
}

class LocalResourceLoader implements ResourceLoader {
    private basePath = '../../dist/assets/';

    async loadThemes(): Promise<ThemeOption[]> {
        try {
            const response = await fetch(`${this.basePath}themes.json`);
            const themes = await response.json();
            return themes.map((theme: any) => ({
                name: theme.name,
                className: theme.className,
                desc: theme.desc,
                author: theme.author
            }));
        } catch (error) {
            console.error('Failed to load themes:', error);
            return [
                { name: "默认主题", className: "default" },
                { name: "深色主题", className: "dark" },
                { name: "浅色主题", className: "light" }
            ];
        }
    }

    async loadHighlights(): Promise<HighlightOption[]> {
        try {
            const response = await fetch(`${this.basePath}highlights.json`);
            const highlights = await response.json();
            return highlights.map((highlight: any) => ({
                name: highlight.name,
                url: highlight.url
            }));
        } catch (error) {
            console.error('Failed to load highlights:', error);
            return [
                { name: "default" },
                { name: "github" },
                { name: "vscode" }
            ];
        }
    }

    async loadTemplates(): Promise<TemplateOption[]> {
        try {
            const response = await fetch(`${this.basePath}templates/`);
            const text = await response.text();
            
            // 解析HTML目录列表来获取模板文件
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = doc.querySelectorAll('a');
            
            const templates: TemplateOption[] = [
                { name: "不使用模板", filename: "none" }
            ];
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.endsWith('.html')) {
                    const filename = href.substring(0, href.lastIndexOf('.html'));
                    templates.push({
                        name: filename,
                        filename: filename
                    });
                }
            });
            
            return templates;
        } catch (error) {
            console.error('Failed to load templates:', error);
            // 返回静态模板列表作为fallback
            return [
                { name: "不使用模板", filename: "none" },
                { name: "Bento 1", filename: "Bento 1" },
                { name: "Bento 2", filename: "Bento 2" },
                { name: "Bento 3", filename: "Bento 3" },
                { name: "Bento 4", filename: "Bento 4" },
                { name: "Bento 5", filename: "Bento 5" },
                { name: "张小珺风格", filename: "张小珺风格" },
                { name: "手工川 - 2", filename: "手工川 - 2" },
                { name: "手工川 - 3", filename: "手工川 - 3" },
                { name: "手工川 - 张小珺风格", filename: "手工川 - 张小珺风格" }
            ];
        }
    }
}

export const resourceLoader = new LocalResourceLoader();