<script setup lang="ts">
import { ref } from 'vue';
import ShowcasePage from './components/ShowcasePage.vue';
import TestPage from './components/TestPage.vue';

const currentPage = ref<'showcase' | 'test'>('test');
</script>

<template>
  <!-- 页面切换按钮 -->
  <div class="page-switcher">
    <button :class="{ active: currentPage === 'showcase' }" @click="currentPage = 'showcase'">
      展示页面
    </button>
    <button :class="{ active: currentPage === 'test' }" @click="currentPage = 'test'">
      功能测试
    </button>
  </div>

  <ShowcasePage v-if="currentPage === 'showcase'" />
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
  top: 10px;
  right: 10px;
  z-index: 9999;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0,0,0,0.8);
  border-radius: 6px;
}

.page-switcher button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-switcher button:hover {
  color: white;
}

.page-switcher button.active {
  background: #3b82f6;
  color: white;
}
</style>
