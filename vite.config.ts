import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
// vite.config.ts
import { defineConfig, type PluginOption } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import cdn from 'vite-plugin-cdn-import'

import { cloudflare } from "@cloudflare/vite-plugin"

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
		cloudflare(),
		cdn({
			modules: [
				'vue',
				'vue-router',
				{
					name: 'pinia',
					var: 'Pinia',
					path: 'dist/pinia.iife.prod.js' // 使用 IIFE 生产版本
				},
				{
					name: 'jszip',
					var: 'JSZip',
					path: 'dist/jszip.min.js'
				},
				{
					name: 'naive-ui',
					var: 'naive',
					path: 'dist/index.min.js'
				}
				// 移除了 vicons 的 CDN 配置，因为没有合适的浏览器版本
			]
		})
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		},
	},
	server: {
		allowedHosts: ['localhost', '127.0.0.1', 'dev.zhangjie.me'],
		port: 5173,
	}
})