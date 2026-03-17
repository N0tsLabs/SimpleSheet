import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // 直接引用源码，方便调试
      '@n0ts123/simple-sheet': resolve(__dirname, '../src/index.ts'),
    },
  },
  css: {
    preprocessorOptions: {},
  },
  server: {
    port: 3000,
    strictPort: false, // 端口被占用时自动尝试下一个
    open: true,
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
