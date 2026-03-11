<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineEmits } from 'vue';
import MarkdownIt from 'markdown-it';
import '../../../src/styles/index.css';

// 定义 emits
const emit = defineEmits<{
  (e: 'go-home'): void;
}>();

// Markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// 为 heading 添加 ID (用于 TOC 导航)
// ID 格式与 Markdown 中的中文锚点一致（如 #快速开始）
md.renderer.rules.heading_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const nextToken = tokens[idx + 1];
  const text = nextToken?.content || '';
  // 使用与 Markdown 链接一致的 ID 格式（直接使用中文字符）
  const id = text.trim();
  token.attrSet('id', id);
  return self.renderToken(tokens, idx, options);
};

// 状态
const docContent = ref('');
const docLoading = ref(false);
const docToc = ref<{ id: string; text: string; level: number }[]>([]);
const activeDocSection = ref('');

// 检查项是否高亮
const isActive = (id: string): boolean => {
  return activeDocSection.value === id;
};

// TOC 项点击
const scrollToDocSection = (id: string, event?: Event) => {
  // 阻止默认行为和事件冒泡
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  activeDocSection.value = id;
  const el = document.getElementById(id);
  if (el) {
    // 获取元素相对于文档顶部的位置
    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPosition = rect.top + scrollTop - 80; // 80px 是导航栏高度 + 间距
    
    // 使用 window.scrollTo 滚动到目标位置
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
};

// 返回首页
const goHome = () => {
  emit('go-home');
};

// 加载文档 - 从根目录的 docs/GUIDE.md 加载
const loadDocumentation = async () => {
  docLoading.value = true;
  try {
    // 使用绝对路径从根目录加载文档
    const response = await fetch('/docs/GUIDE.md');
    if (response.ok) {
      const rawContent = await response.text();
      docContent.value = md.render(rawContent);
      extractToc(rawContent);
    } else {
      docContent.value = '<h1>文档加载失败</h1><p>请查看 <code>docs/GUIDE.md</code> 文件。</p>';
    }
  } catch (error) {
    docContent.value = '<h1>文档加载失败</h1><p>请查看 <code>docs/GUIDE.md</code> 文件。</p>';
  }
  docLoading.value = false;
};

// 提取目录 - ID 格式与 markdown-it 渲染的一致
const extractToc = (content: string) => {
  const toc: { id: string; text: string; level: number }[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // 使用与 Markdown 链接一致的 ID 格式（直接使用中文字符）
    const id = text;
    toc.push({ id, text, level });
  }

  docToc.value = toc;
};

onMounted(() => {
  loadDocumentation();
});
</script>

<template>
  <div class="docs-page">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <span class="nav-logo">📊</span>
        <span class="nav-title">SimpleSheet</span>
      </div>
      <div class="nav-links">
        <a href="#" @click.prevent="goHome" class="nav-btn">
          ← 返回首页
        </a>
      </div>
    </nav>

    <!-- 文档内容 -->
    <main class="docs-main">
      <div class="docs-wrapper">
        <!-- 文档导航 -->
        <aside v-if="docToc.length > 0" class="docs-nav">
          <div class="docs-nav-title">目录</div>
          <ul class="docs-nav-list">
            <li
              v-for="item in docToc"
              :key="item.id"
              :class="['toc-item', 'toc-level-' + item.level, { active: isActive(item.id) }]"
              @click.prevent="scrollToDocSection(item.id, $event)"
            >
              {{ item.text }}
            </li>
          </ul>
        </aside>

        <!-- 文档内容 -->
        <div class="docs-container">
          <div v-if="docLoading" class="docs-loading">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="docContent" class="docs-content" v-html="docContent"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.docs-page {
  min-height: 100vh;
  background: #ffffff;
  color: #334155;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e2e8f0;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
}

.nav-logo {
  font-size: 28px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #334155;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-btn:hover {
  background: #e2e8f0;
}

/* 文档主体 */
.docs-main {
  padding: 40px 32px;
}

.docs-wrapper {
  display: flex;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 文档导航 */
.docs-nav {
  flex-shrink: 0;
  width: 240px;
  position: sticky;
  top: 100px;
  align-self: flex-start;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.docs-nav-title {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.docs-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  padding: 8px 12px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.toc-item:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.toc-item.active {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

.toc-level-1 {
  font-weight: 600;
}

.toc-level-2 {
  padding-left: 24px;
}

.toc-level-3 {
  padding-left: 36px;
  font-size: 12px;
}

.toc-level-4,
.toc-level-5,
.toc-level-6 {
  padding-left: 48px;
  font-size: 12px;
}

/* 文档容器 */
.docs-container {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  min-height: 500px;
  overflow: hidden;
}

.docs-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #64748b;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.docs-content {
  padding: 40px;
  font-size: 14px;
  line-height: 1.8;
  color: #334155;
  max-width: 100%;
  overflow-x: hidden;
}

.docs-content :deep(h1) {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.docs-content :deep(h2) {
  font-size: 22px;
  font-weight: 600;
  margin: 32px 0 16px;
  color: #1e293b;
}

.docs-content :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 24px 0 12px;
  color: #334155;
}

.docs-content :deep(h4) {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 10px;
}

.docs-content :deep(p) {
  margin: 0 0 16px;
}

.docs-content :deep(ul),
.docs-content :deep(ol) {
  margin: 0 0 16px;
  padding-left: 24px;
}

.docs-content :deep(li) {
  margin-bottom: 8px;
}

.docs-content :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.docs-content :deep(pre) {
  background: #1e293b;
  padding: 20px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 20px 0;
}

.docs-content :deep(pre code) {
  background: none;
  padding: 0;
  color: #e2e8f0;
}

.docs-content :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 20px;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 0 8px 8px 0;
}

.docs-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.docs-content :deep(th),
.docs-content :deep(td) {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  text-align: left;
}

.docs-content :deep(th) {
  background: #f1f5f9;
  font-weight: 600;
}

.docs-content :deep(a) {
  color: #3b82f6;
  text-decoration: none;
}

.docs-content :deep(a:hover) {
  text-decoration: underline;
}

.docs-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.docs-content :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 32px 0;
}

/* 响应式 */
@media (max-width: 900px) {
  .docs-wrapper {
    flex-direction: column;
  }

  .docs-nav {
    width: 100%;
    position: relative;
    top: 0;
    max-height: none;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .docs-nav-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toc-item {
    margin-bottom: 0;
    padding: 6px 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
  }

  .toc-level-2,
  .toc-level-3,
  .toc-level-4,
  .toc-level-5,
  .toc-level-6 {
    padding-left: 12px;
  }

  .docs-content {
    padding: 24px;
  }
}
</style>
