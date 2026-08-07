import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  // 自动打开浏览器、设置端口
  server: {
    host: '0.0.0.0', //通过ip的形式访问
    port: 8080, //端口号
    open: true, //自动打开浏览器
  },
  // 配置别名
  resolve: {
    alias: [
      {
        find: '@', //指向的是src目录
        replacement: resolve(__dirname, 'src')
      }
    ]
  },
})
