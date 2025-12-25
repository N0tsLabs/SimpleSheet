<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { 
  SimpleSheet,
  ContextMenu,
  createDefaultMenuItems,
  ColumnReorder,
  Sorter,
  Filter,
  FilterConditions,
  Search,
  ConditionalFormat,
  ConditionalFormatRules,
} from '../../../src';
import '../../../src/styles/index.css';

// Demo refs
const demoContainer = ref<HTMLElement | null>(null);
let sheet: SimpleSheet | null = null;
let sorter: Sorter | null = null;
let filter: Filter | null = null;
let search: Search | null = null;
let cf: ConditionalFormat | null = null;
let contextMenu: ContextMenu | null = null;
let columnReorder: ColumnReorder | null = null;

// Column definitions (reactive for reorder)
const columnsRef = ref([
  { key: 'id', title: 'ID', width: 60, editable: false },
  { key: 'name', title: '姓名', width: 100 },
  { key: 'department', title: '部门', width: 100 },
  { key: 'position', title: '职位', width: 120, wrapText: 'ellipsis' as const }, // 省略模式：显示...可预览
  { key: 'salary', title: '薪资', width: 100, type: 'number' as const },
  { key: 'performance', title: '绩效', width: 80, type: 'number' as const },
  { key: 'joinDate', title: '入职日期', width: 110 },
  { key: 'remark', title: '备注', width: 150, wrapText: 'wrap' as const }, // 换行模式：自动换行显示
]);

// UI State
const searchKeyword = ref('');
const searchResults = ref<any[]>([]);
const currentSearchIndex = ref(-1);
const activeFilter = ref('');
const sortColumn = ref<number | null>(null);
const sortDirection = ref<'asc' | 'desc' | null>(null);
const showStats = ref({ total: 0, filtered: 0 });

// Demo data (use columnsRef.value)

const departments = ['技术部', '产品部', '设计部', '市场部', '运营部'];
const positions = ['工程师', '经理', '设计师', '专员', '总监'];
const names = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵强', '黄丽', '周杰', '吴敏'];

const remarks = [
  '表现优秀',
  '工作认真\n态度积极',
  '团队协作能力强\n沟通顺畅',
  '需要加强\n技术能力',
  '表现稳定',
  '有潜力\n值得培养\n持续关注',
  '',
  '绩效达标',
];

const generateData = () => {
  const data: any[] = [];
  for (let i = 0; i < 50; i++) {
    const dept = departments[i % departments.length];
    data.push({
      id: i + 1,
      name: names[i % names.length],
      department: dept,
      position: positions[i % positions.length],
      salary: Math.floor(10000 + Math.random() * 40000),
      performance: Number((3 + Math.random() * 2).toFixed(1)),
      joinDate: `202${Math.floor(Math.random() * 4)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
      remark: remarks[i % remarks.length],
    });
  }
  return data;
};

let originalData = generateData();
let currentData = [...originalData];

// Feature cards
const features = [
  { icon: '⚡', title: '虚拟滚动', desc: '支持百万级数据，只渲染可视区域' },
  { icon: '🎨', title: '主题切换', desc: '内置明暗主题，跟随系统自动切换' },
  { icon: '⌨️', title: '快捷键', desc: 'Excel 风格键盘操作体验' },
  { icon: '📋', title: '复制粘贴', desc: '支持与 Excel 互相复制粘贴' },
  { icon: '↩️', title: '撤销重做', desc: 'Ctrl+Z / Ctrl+Y 完整历史' },
  { icon: '📝', title: '多行文本', desc: 'Alt+Enter换行，省略/自动换行模式' },
  { icon: '🔍', title: '搜索替换', desc: '支持正则、全字匹配搜索' },
  { icon: '📊', title: '排序筛选', desc: '多列排序、多条件筛选' },
  { icon: '✅', title: '数据验证', desc: '多种内置规则、自定义验证' },
  { icon: '🔀', title: '单元格合并', desc: '支持合并/拆分单元格' },
  { icon: '🎯', title: '条件格式', desc: '数据条、色阶、自定义规则' },
  { icon: '🔧', title: '可扩展', desc: '自定义渲染器和编辑器' },
];

// Methods
const doSearch = () => {
  if (!search || !searchKeyword.value) {
    searchResults.value = [];
    currentSearchIndex.value = -1;
    return;
  }
  
  const results = search.search(searchKeyword.value, { caseSensitive: false });
  searchResults.value = results;
  currentSearchIndex.value = results.length > 0 ? 0 : -1;
  
  if (results.length > 0) {
    scrollToResult(results[0]);
  }
};

const searchNext = () => {
  if (!search || searchResults.value.length === 0) return;
  const result = search.next();
  if (result) {
    currentSearchIndex.value = search.getCurrentIndex();
    scrollToResult(result);
  }
};

const searchPrev = () => {
  if (!search || searchResults.value.length === 0) return;
  const result = search.prev();
  if (result) {
    currentSearchIndex.value = search.getCurrentIndex();
    scrollToResult(result);
  }
};

const scrollToResult = (result: any) => {
  if (!sheet) return;
  sheet.setSelection({
    start: { row: result.row, col: result.col },
    end: { row: result.row, col: result.col },
  });
  sheet.scrollToCell(result.row, result.col);
};

const toggleSort = (colIndex: number) => {
  if (!sorter) return;
  
  sorter.toggleSort(colIndex);
  const configs = sorter.getSortConfigs();
  
  if (configs.length > 0) {
    sortColumn.value = configs[0].columnIndex;
    sortDirection.value = configs[0].direction;
  } else {
    sortColumn.value = null;
    sortDirection.value = null;
  }
};

const applyFilter = (dept: string) => {
  if (!filter) return;
  
  activeFilter.value = dept;
  
  if (dept) {
    filter.setConditions([FilterConditions.equals('department', dept)]);
  } else {
    filter.clearFilter();
  }
};

const clearSearch = () => {
  searchKeyword.value = '';
  searchResults.value = [];
  currentSearchIndex.value = -1;
  search?.clear();
};

onMounted(async () => {
  await nextTick();
  if (!demoContainer.value) return;

  const columns = columnsRef.value;

  // Create sheet
  sheet = new SimpleSheet(demoContainer.value, {
    columns,
    data: currentData,
    rowHeight: 38,
    headerHeight: 42,
    theme: 'light',
  });

  showStats.value = { total: currentData.length, filtered: currentData.length };

  // Context menu - 创建右键菜单（完整功能）
  contextMenu = new ContextMenu({
    items: createDefaultMenuItems({
      onCopy: () => sheet?.copy(),
      onPaste: () => sheet?.paste(),
      onCut: () => sheet?.cut(),
      onClearContent: () => sheet?.clearContent(),
      onInsertRowAbove: (context) => {
        if (context.position) {
          sheet?.insertRow(context.position.row);
        }
      },
      onInsertRowBelow: (context) => {
        if (context.position) {
          sheet?.insertRow(context.position.row + 1);
        }
      },
      onDeleteRow: (context) => {
        if (context.position) {
          sheet?.deleteRow(context.position.row);
        }
      },
      onInsertColumnLeft: (context) => {
        if (context.position) {
          const newCol = { key: `col_${Date.now()}`, title: '新列', width: 100 };
          sheet?.insertColumn(context.position.col, newCol);
          columnsRef.value.splice(context.position.col, 0, newCol);
        }
      },
      onInsertColumnRight: (context) => {
        if (context.position) {
          const newCol = { key: `col_${Date.now()}`, title: '新列', width: 100 };
          sheet?.insertColumn(context.position.col + 1, newCol);
          columnsRef.value.splice(context.position.col + 1, 0, newCol);
        }
      },
      onDeleteColumn: (context) => {
        if (context.position) {
          sheet?.deleteColumn(context.position.col);
          columnsRef.value.splice(context.position.col, 1);
        }
      },
    }),
  });
  contextMenu.mount(demoContainer.value);

  // 关联右键菜单到 sheet（用于主题同步）
  sheet.setContextMenu(contextMenu);

  // 监听表格的 contextmenu 事件来显示菜单
  sheet.on('cell:contextmenu', (event) => {
    const selection = sheet?.getSelection() || [];
    contextMenu?.show(event.originalEvent.clientX, event.originalEvent.clientY, {
      position: { row: event.row, col: event.col },
      selection,
      selectedCells: selection.length > 0 ? [selection[0].start] : [],
      originalEvent: event.originalEvent,
      theme: sheet?.getTheme() || 'light',
    });
  });

  // Column reorder - 拖拽表头排序
  columnReorder = new ColumnReorder({
    getColumns: () => columnsRef.value,
    setColumns: (newColumns) => {
      columnsRef.value = newColumns;
      sheet?.setColumns(newColumns);
      sorter?.setColumns(newColumns);
      filter?.setColumns(newColumns);
    },
    getColumnWidth: (index) => columnsRef.value[index]?.width || 100,
    getHeaderHeight: () => 42,
    showRowNumber: true,
    rowNumberWidth: 50,
  });
  columnReorder.mount(demoContainer.value);

  // Sorter
  sorter = new Sorter();
  sorter.setColumns(columns);
  sorter.setData(currentData);
  sorter.on('sort:change', ({ data }) => {
    currentData = data;
    sheet?.setData(data);
    filter?.setData(data);
    search?.setData(data, columnsRef.value);
  });

  // Filter
  filter = new Filter();
  filter.setColumns(columns);
  filter.setData(currentData);
  filter.on('filter:change', ({ data }) => {
    sheet?.setData(data);
    showStats.value.filtered = data.length;
    search?.setData(data, columnsRef.value);
  });

  // Search
  search = new Search();
  search.setData(currentData, columns);

  // Conditional format
  cf = new ConditionalFormat();
  cf.setData(currentData, columns);
  cf.addRule(ConditionalFormatRules.greaterThan(['performance', 5], 4.5, {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  }));
  cf.addRule(ConditionalFormatRules.lessThan(['performance', 5], 3.5, {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  }));
});

onUnmounted(() => {
  contextMenu?.destroy();
  columnReorder?.unmount();
  sheet?.destroy();
});
</script>

<template>
  <div class="showcase">
    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content">
        <div class="hero-badge">🚀 轻量零依赖</div>
        <h1 class="hero-title">
          <span class="gradient-text">SimpleSheet</span>
        </h1>
        <p class="hero-tagline">
          一个轻量级、高性能的 Excel 风格表格框架
        </p>
        <p class="hero-desc">
          纯 TypeScript 实现，支持虚拟滚动、单元格编辑、复制粘贴、撤销重做、排序筛选等完整功能
        </p>
        <div class="hero-actions">
          <a href="#demo" class="btn btn-primary">查看演示</a>
          <a href="https://github.com" class="btn btn-secondary" target="_blank">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
      <div class="hero-decoration">
        <div class="decoration-grid"></div>
      </div>
    </header>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">核心特性</h2>
        <p class="section-desc">SimpleSheet 提供丰富的功能，满足各种表格需求</p>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card">
            <span class="feature-icon">{{ feature.icon }}</span>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Section -->
    <section id="demo" class="demo-section">
      <div class="container">
        <h2 class="section-title">在线演示</h2>
        <p class="section-desc">体验 SimpleSheet 的完整功能</p>

        <!-- Toolbar -->
        <div class="demo-toolbar">
          <div class="toolbar-group">
            <span class="toolbar-label">搜索</span>
            <div class="search-box">
              <input 
                v-model="searchKeyword" 
                placeholder="输入关键词..."
                @keyup.enter="doSearch"
              />
              <button class="icon-btn" @click="doSearch" title="搜索">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <button 
                v-if="searchResults.length > 0" 
                class="icon-btn" 
                @click="searchPrev"
                title="上一个"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15,18 9,12 15,6"/>
                </svg>
              </button>
              <button 
                v-if="searchResults.length > 0" 
                class="icon-btn" 
                @click="searchNext"
                title="下一个"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
              <button 
                v-if="searchKeyword" 
                class="icon-btn" 
                @click="clearSearch"
                title="清除"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <span v-if="searchResults.length > 0" class="search-count">
              {{ currentSearchIndex + 1 }} / {{ searchResults.length }}
            </span>
          </div>

          <div class="toolbar-divider"></div>

          <div class="toolbar-group">
            <span class="toolbar-label">排序</span>
            <button 
              :class="['sort-btn', { active: sortColumn === 4 }]"
              @click="toggleSort(4)"
            >
              薪资
              <span v-if="sortColumn === 4" class="sort-icon">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
            <button 
              :class="['sort-btn', { active: sortColumn === 5 }]"
              @click="toggleSort(5)"
            >
              绩效
              <span v-if="sortColumn === 5" class="sort-icon">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
          </div>

          <div class="toolbar-divider"></div>

          <div class="toolbar-group">
            <span class="toolbar-label">筛选</span>
            <select v-model="activeFilter" @change="applyFilter(activeFilter)" class="filter-select">
              <option value="">全部部门</option>
              <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
            </select>
          </div>

          <div class="toolbar-spacer"></div>

          <div class="toolbar-group">
            <span class="stats">
              显示 <strong>{{ showStats.filtered }}</strong> / {{ showStats.total }} 行
            </span>
          </div>
        </div>

        <!-- Sheet Container -->
        <div class="demo-sheet-wrapper">
          <div ref="demoContainer" class="demo-sheet"></div>
        </div>

        <!-- Tips -->
        <div class="demo-tips">
          <div class="tip">
            <span class="tip-icon">💡</span>
            <span>双击编辑 · Alt+Enter 换行 · 点击 <b>...</b> 预览多行 · 拖拽表头排序 · 右键菜单</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Code Example -->
    <section class="code-section">
      <div class="container">
        <h2 class="section-title">快速开始</h2>
        <p class="section-desc">几行代码即可创建一个功能完整的表格</p>
        
        <div class="code-tabs">
          <div class="code-block">
            <div class="code-header">
              <span class="code-lang">TypeScript</span>
            </div>
            <pre class="code-content"><code><span class="keyword">import</span> { SimpleSheet } <span class="keyword">from</span> <span class="string">'@n0ts123/simple-sheet'</span>;
<span class="keyword">import</span> <span class="string">'@n0ts123/simple-sheet/dist/simple-sheet.css'</span>;

<span class="keyword">const</span> sheet = <span class="keyword">new</span> <span class="function">SimpleSheet</span>(<span class="string">'#container'</span>, {
  <span class="property">columns</span>: [
    { <span class="property">key</span>: <span class="string">'name'</span>, <span class="property">title</span>: <span class="string">'姓名'</span>, <span class="property">width</span>: <span class="number">150</span> },
    { <span class="property">key</span>: <span class="string">'age'</span>, <span class="property">title</span>: <span class="string">'年龄'</span>, <span class="property">width</span>: <span class="number">100</span>, <span class="property">type</span>: <span class="string">'number'</span> },
    { <span class="property">key</span>: <span class="string">'email'</span>, <span class="property">title</span>: <span class="string">'邮箱'</span>, <span class="property">width</span>: <span class="number">200</span> },
  ],
  <span class="property">data</span>: [
    { <span class="property">name</span>: <span class="string">'张三'</span>, <span class="property">age</span>: <span class="number">28</span>, <span class="property">email</span>: <span class="string">'zhangsan@example.com'</span> },
    { <span class="property">name</span>: <span class="string">'李四'</span>, <span class="property">age</span>: <span class="number">32</span>, <span class="property">email</span>: <span class="string">'lisi@example.com'</span> },
  ],
});</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <p>SimpleSheet · 轻量级 Excel 表格框架</p>
        <p class="footer-sub">MIT License · Made with ❤️</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Base */
.showcase {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Hero */
.hero {
  position: relative;
  padding: 100px 24px 80px;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
  color: var(--c-brand);
  font-size: 14px;
  font-weight: 500;
  border-radius: 20px;
  margin-bottom: 24px;
}

.hero-title {
  font-size: 64px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline {
  font-size: 24px;
  color: var(--c-text);
  margin-bottom: 16px;
  font-weight: 500;
}

.hero-desc {
  font-size: 16px;
  color: var(--c-text-light);
  max-width: 600px;
  margin: 0 auto 32px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--c-brand);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.btn-primary:hover {
  background: var(--c-brand-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
}

.btn-secondary {
  background: white;
  color: var(--c-text);
  border: 1px solid var(--c-border);
}

.btn-secondary:hover {
  border-color: var(--c-brand);
  color: var(--c-brand);
}

.hero-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.decoration-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Features */
.features {
  padding: 80px 0;
  background: var(--c-bg);
}

.section-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
  color: var(--c-text);
}

.section-desc {
  font-size: 16px;
  color: var(--c-text-light);
  text-align: center;
  margin-bottom: 48px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.feature-card {
  padding: 28px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: var(--c-brand-light);
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1);
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 16px;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: 8px;
}

.feature-desc {
  font-size: 14px;
  color: var(--c-text-light);
  line-height: 1.6;
}

/* Demo Section */
.demo-section {
  padding: 80px 0;
  background: var(--c-bg-soft);
}

.demo-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 12px 12px 0 0;
  border-bottom: none;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--c-text-light);
  font-weight: 500;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--c-border);
}

.toolbar-spacer {
  flex: 1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: 6px;
}

.search-box input {
  width: 160px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--c-text-light);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--c-bg-mute);
  color: var(--c-brand);
}

.search-count {
  font-size: 12px;
  color: var(--c-text-lighter);
  padding: 4px 8px;
  background: var(--c-bg-mute);
  border-radius: 4px;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-btn:hover {
  border-color: var(--c-brand);
  color: var(--c-brand);
}

.sort-btn.active {
  background: var(--c-brand);
  border-color: var(--c-brand);
  color: white;
}

.sort-icon {
  font-size: 12px;
}

.filter-select {
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  outline: none;
}

.filter-select:focus {
  border-color: var(--c-brand);
}

.stats {
  font-size: 13px;
  color: var(--c-text-light);
}

.stats strong {
  color: var(--c-brand);
}

.demo-sheet-wrapper {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

.demo-sheet {
  height: 500px;
}

.demo-tips {
  margin-top: 16px;
}

.tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--c-text-light);
}

.tip-icon {
  font-size: 16px;
}

/* Code Section */
.code-section {
  padding: 80px 0;
  background: var(--c-bg);
}

.code-block {
  background: #1e293b;
  border-radius: 12px;
  overflow: hidden;
  max-width: 800px;
  margin: 0 auto;
}

.code-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.code-lang {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.code-content {
  padding: 24px;
  margin: 0;
  overflow-x: auto;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #e2e8f0;
}

.code-content .keyword { color: #c084fc; }
.code-content .string { color: #86efac; }
.code-content .number { color: #fcd34d; }
.code-content .function { color: #7dd3fc; }
.code-content .property { color: #fca5a5; }

/* Footer */
.footer {
  padding: 48px 0;
  text-align: center;
  background: var(--c-bg-soft);
  border-top: 1px solid var(--c-border);
}

.footer p {
  color: var(--c-text-light);
  font-size: 14px;
}

.footer-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--c-text-lighter);
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    padding: 60px 16px 50px;
  }

  .hero-title {
    font-size: 40px;
  }

  .hero-tagline {
    font-size: 18px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .features, .demo-section, .code-section {
    padding: 50px 0;
  }

  .section-title {
    font-size: 28px;
  }

  .demo-toolbar {
    flex-wrap: wrap;
    gap: 12px;
  }

  .toolbar-divider {
    display: none;
  }

  .demo-sheet {
    height: 400px;
  }
}
</style>

