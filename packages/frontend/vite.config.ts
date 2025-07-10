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
		emptyOutDir: true,
		lib: {
			entry: 'src/main.tsx',
			name: 'OmniContentReact',
			fileName: 'omni-content-react',
			formats: ['iife']
		},
		rollupOptions: {
			external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
			output: {
				inlineDynamicImports: true,
				globals: {
					'react': 'React',
					'react-dom': 'ReactDOM',
					'react-dom/client': 'ReactDOM',
					'react/jsx-runtime': 'React'
				}
			}
		},
		minify: false,
	}
})
