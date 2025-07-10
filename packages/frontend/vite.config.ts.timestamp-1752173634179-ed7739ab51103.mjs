// vite.config.ts
import { defineConfig } from "file:///Users/mark/projects/obsidian-relative/obsidian-omni-content/node_modules/.pnpm/vite@5.4.19_@types+node@16.18.126_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/mark/projects/obsidian-relative/obsidian-omni-content/node_modules/.pnpm/@vitejs+plugin-react@4.6.0_vite@5.4.19_@types+node@16.18.126_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import tailwindcss from "file:///Users/mark/projects/obsidian-relative/obsidian-omni-content/node_modules/.pnpm/@tailwindcss+vite@4.1.11_vite@5.4.19_@types+node@16.18.126_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/mark/projects/obsidian-relative/obsidian-omni-content/packages/frontend";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    lib: {
      entry: "src/main.tsx",
      name: "OmniContentReact",
      fileName: "omni-content-react",
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        exports: "named"
      }
    },
    minify: false
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFyay9wcm9qZWN0cy9vYnNpZGlhbi1yZWxhdGl2ZS9vYnNpZGlhbi1vbW5pLWNvbnRlbnQvcGFja2FnZXMvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYXJrL3Byb2plY3RzL29ic2lkaWFuLXJlbGF0aXZlL29ic2lkaWFuLW9tbmktY29udGVudC9wYWNrYWdlcy9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFyay9wcm9qZWN0cy9vYnNpZGlhbi1yZWxhdGl2ZS9vYnNpZGlhbi1vbW5pLWNvbnRlbnQvcGFja2FnZXMvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQge2RlZmluZUNvbmZpZ30gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCJcbi8vIEB0cy1pZ25vcmVcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIlxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG5cdHJlc29sdmU6IHtcblx0XHRhbGlhczoge1xuXHRcdFx0XCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG5cdFx0fSxcblx0fSxcblxuXHRidWlsZDoge1xuXHRcdG91dERpcjogJy4vZGlzdCcsXG5cdFx0ZW1wdHlPdXREaXI6IHRydWUsXG5cdFx0bGliOiB7XG5cdFx0XHRlbnRyeTogJ3NyYy9tYWluLnRzeCcsXG5cdFx0XHRuYW1lOiAnT21uaUNvbnRlbnRSZWFjdCcsXG5cdFx0XHRmaWxlTmFtZTogJ29tbmktY29udGVudC1yZWFjdCcsXG5cdFx0XHRmb3JtYXRzOiBbJ2lpZmUnXVxuXHRcdH0sXG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0b3V0cHV0OiB7XG5cdFx0XHRcdGlubGluZUR5bmFtaWNJbXBvcnRzOiB0cnVlLFxuXHRcdFx0XHRleHBvcnRzOiBcIm5hbWVkXCIsXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRtaW5pZnk6IGZhbHNlLFxuXHR9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0WixTQUFRLG9CQUFtQjtBQUN2YixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRWpCLE9BQU8saUJBQWlCO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQUEsRUFDaEMsU0FBUztBQUFBLElBQ1IsT0FBTztBQUFBLE1BQ04sS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3JDO0FBQUEsRUFDRDtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsS0FBSztBQUFBLE1BQ0osT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsU0FBUyxDQUFDLE1BQU07QUFBQSxJQUNqQjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ1Asc0JBQXNCO0FBQUEsUUFDdEIsU0FBUztBQUFBLE1BQ1Y7QUFBQSxJQUNEO0FBQUEsSUFDQSxRQUFRO0FBQUEsRUFDVDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
