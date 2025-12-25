<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  SimpleSheet, 
  type Column, 
  type RowData,
  DateRenderer,
  LinkRenderer,
  ImageRenderer,
  TagRenderer,
  ProgressRenderer,
  RatingRenderer,
  CheckboxRenderer,
} from '@n0ts123/simple-sheet';

const sheetContainer = ref<HTMLElement | null>(null);
const sheet = ref<SimpleSheet | null>(null);

// 列定义 - 演示不同类型的渲染器
const columns: Column[] = [
  { key: 'id', title: 'ID', width: 50, type: 'number', readonly: true },
  { key: 'name', title: '名称', width: 120, type: 'text' },
  { key: 'date', title: '日期', width: 110, renderer: DateRenderer },
  { key: 'link', title: '链接', width: 150, renderer: LinkRenderer },
  { key: 'image', title: '图片', width: 80, renderer: ImageRenderer },
  { key: 'tags', title: '标签', width: 150, renderer: TagRenderer },
  { key: 'progress', title: '进度', width: 120, renderer: ProgressRenderer },
  { key: 'rating', title: '评分', width: 100, renderer: RatingRenderer },
  { key: 'active', title: '启用', width: 60, renderer: CheckboxRenderer },
];

// 示例数据
const data: RowData[] = [
  {
    id: 1,
    name: 'Vue.js',
    date: '2024-01-15',
    link: { url: 'https://vuejs.org', text: 'Vue 官网' },
    image: 'https://vuejs.org/images/logo.png',
    tags: [{ text: '前端', color: 'blue' }, { text: '框架', color: 'green' }],
    progress: 95,
    rating: 5,
    active: true,
  },
  {
    id: 2,
    name: 'React',
    date: '2024-02-20',
    link: { url: 'https://react.dev', text: 'React 官网' },
    image: 'https://react.dev/favicon.ico',
    tags: [{ text: '前端', color: 'blue' }, { text: '库', color: 'purple' }],
    progress: 88,
    rating: 4.5,
    active: true,
  },
  {
    id: 3,
    name: 'Angular',
    date: '2024-03-10',
    link: 'https://angular.io',
    image: 'https://angular.io/assets/images/logos/angular/angular.svg',
    tags: [{ text: '前端', color: 'blue' }, { text: '框架', color: 'red' }],
    progress: 72,
    rating: 4,
    active: false,
  },
  {
    id: 4,
    name: 'Svelte',
    date: '2024-04-05',
    link: { url: 'https://svelte.dev', text: 'Svelte' },
    image: 'https://svelte.dev/favicon.png',
    tags: [{ text: '编译器', color: 'yellow' }],
    progress: 65,
    rating: 4,
    active: true,
  },
  {
    id: 5,
    name: 'SolidJS',
    date: '2024-05-18',
    link: 'https://www.solidjs.com',
    image: '',
    tags: [{ text: '响应式', color: 'cyan' }],
    progress: 45,
    rating: 3.5,
    active: false,
  },
];

onMounted(() => {
  if (!sheetContainer.value) return;

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns,
    data,
    rowHeight: 40,
    headerHeight: 40,
    showRowNumber: true,
    theme: 'auto',
  });
});

onUnmounted(() => {
  sheet.value?.destroy();
});
</script>

<template>
  <div class="renderers-demo">
    <div class="info-card">
      <h3>🎨 渲染器演示</h3>
      <p>展示内置的各种单元格渲染器：日期、链接、图片、标签、进度条、评分、复选框等。</p>
    </div>
    
    <div class="sheet-wrapper">
      <div ref="sheetContainer" class="sheet-container"></div>
    </div>
    
    <div class="renderer-list">
      <h4>可用渲染器</h4>
      <div class="renderer-items">
        <div class="renderer-item">
          <span class="renderer-icon">📅</span>
          <div class="renderer-info">
            <span class="renderer-name">DateRenderer</span>
            <span class="renderer-desc">日期格式化显示</span>
          </div>
        </div>
        <div class="renderer-item">
          <span class="renderer-icon">🔗</span>
          <div class="renderer-info">
            <span class="renderer-name">LinkRenderer</span>
            <span class="renderer-desc">可点击链接</span>
          </div>
        </div>
        <div class="renderer-item">
          <span class="renderer-icon">🖼️</span>
          <div class="renderer-info">
            <span class="renderer-name">ImageRenderer</span>
            <span class="renderer-desc">缩略图，点击预览</span>
          </div>
        </div>
        <div class="renderer-item">
          <span class="renderer-icon">🏷️</span>
          <div class="renderer-info">
            <span class="renderer-name">TagRenderer</span>
            <span class="renderer-desc">彩色标签</span>
          </div>
        </div>
        <div class="renderer-item">
          <span class="renderer-icon">📊</span>
          <div class="renderer-info">
            <span class="renderer-name">ProgressRenderer</span>
            <span class="renderer-desc">进度条</span>
          </div>
        </div>
        <div class="renderer-item">
          <span class="renderer-icon">⭐</span>
          <div class="renderer-info">
            <span class="renderer-name">RatingRenderer</span>
            <span class="renderer-desc">星级评分</span>
          </div>
        </div>
        <div class="renderer-item">
          <span class="renderer-icon">☑️</span>
          <div class="renderer-info">
            <span class="renderer-name">CheckboxRenderer</span>
            <span class="renderer-desc">复选框</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.renderers-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
}

.info-card h3 {
  margin-bottom: 8px;
}

.info-card p {
  opacity: 0.9;
  font-size: 14px;
}

.sheet-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.sheet-container {
  width: 100%;
  height: 300px;
}

.renderer-list {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.renderer-list h4 {
  margin-bottom: 16px;
  color: #333;
}

.renderer-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.renderer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.renderer-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.renderer-icon {
  font-size: 24px;
}

.renderer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.renderer-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.renderer-desc {
  font-size: 12px;
  color: #666;
}
</style>

