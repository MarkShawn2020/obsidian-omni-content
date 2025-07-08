// 统一的日志工具
export const logger = {
	debug: (...args: any[]) => {
		console.debug(`[NoteToMP] DEBUG:`, ...args);
	},
	info: (...args: any[]) => {
		console.log(`[NoteToMP] INFO:`, ...args);
	},
	warn: (...args: any[]) => {
		console.warn(`[NoteToMP] WARN:`, ...args);
	},
	error: (...args: any[]) => {
		console.error(`[NoteToMP] ERROR:`, ...args);
	},
};
