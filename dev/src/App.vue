<script setup lang="ts">
import { ref } from 'vue';
import HomePage from './components/HomePage.vue';
import TestPage from './components/TestPage.vue';

const currentPage = ref<'home' | 'test'>('home');
</script>

<template>
  <!-- 页面切换按钮 -->
  <div class="page-switcher">
    <button :class="{ active: currentPage === 'home' }" @click="currentPage = 'home'">
      🏠 首页
    </button>
    <button :class="{ active: currentPage === 'test' }" @click="currentPage = 'test'">
      🧪 测试
    </button>
  </div>

  <HomePage v-if="currentPage === 'home'" />
  <TestPage v-else />
</template>

<style>
:root {
  --c-brand: #3b82f6;
  --c-brand-light: #60a5fa;
  --c-brand-dark: #2563eb;
  --c-text: #1f2937;
  --c-text-light: #6b7280;
  --c-text-lighter: #9ca3af;
  --c-border: #e5e7eb;
  --c-bg: #ffffff;
  --c-bg-soft: #f9fafb;
  --c-bg-mute: #f3f4f6;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  color: var(--c-text);
  background: var(--c-bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}

.page-switcher {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.page-switcher button {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.page-switcher button:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.page-switcher button.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
}
</style>
