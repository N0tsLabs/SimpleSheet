<script setup lang="ts">
import { ref } from 'vue';
import HomePage from './components/HomePage.vue';
import DocsPage from './components/DocsPage.vue';

// 简单路由
const currentPage = ref<'home' | 'docs'>('home');

const goDocs = () => {
  currentPage.value = 'docs';
};

const goHome = () => {
  currentPage.value = 'home';
};
</script>

<template>
  <HomePage v-if="currentPage === 'home'" @go-docs="goDocs" />
  <DocsPage v-else @go-home="goHome" />
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
</style>
