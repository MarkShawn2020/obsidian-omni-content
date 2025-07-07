import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
// @ts-ignore
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},

	build: {
		outDir: '../dist/frontend',
		lib: {
			entry: 'src/main.tsx',
			name: 'OmniContentReact',
			fileName: 'omni-content-react',
			formats: ['umd']
		},
		rollupOptions: {
			output: {
				exports: 'named'
			}
		}
	}
})
