<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { 
  SimpleSheet,
  ContextMenu,
  createDefaultMenuItems,
  createHeaderMenuItems,
  createRowNumberMenuItems,
  ColumnReorder,
  Sorter,
  Filter,
  FilterConditions,
  Search,
  Validator,
  ValidationRules,
  showCreateColumnDialog,
  showEditColumnDialog,
} from '../../../src';
import type { Column } from '../../../src';
import '../../../src/styles/index.css';

// 容器引用
const sheetContainer = ref<HTMLElement | null>(null);

// Sheet 实例
let sheet: SimpleSheet | null = null;
let contextMenu: ContextMenu | null = null;
let headerMenu: ContextMenu | null = null;
let rowNumberMenu: ContextMenu | null = null;
let columnReorder: ColumnReorder | null = null;
let sorter: Sorter | null = null;
let filter: Filter | null = null;
let search: Search | null = null;
let validator: Validator | null = null;

// 状态
const currentTheme = ref<'light' | 'dark'>('light');
const searchKeyword = ref('');
const searchResults = ref<any[]>([]);
const currentSearchIndex = ref(-1);
const filterDepartment = ref('');
const showStats = ref({ total: 0, filtered: 0 });

// 部门选项
const departmentOptions = [
  { label: '技术部', value: 'tech', color: '#e3f2fd', textColor: '#1565c0' },
  { label: '产品部', value: 'product', color: '#e8f5e9', textColor: '#2e7d32' },
  { label: '设计部', value: 'design', color: '#fce4ec', textColor: '#c2185b' },
  { label: '市场部', value: 'market', color: '#fff3e0', textColor: '#ef6c00' },
  { label: '运营部', value: 'operation', color: '#f3e5f5', textColor: '#7b1fa2' },
];

const statusOptions = [
  { label: '在职', value: 'active', color: '#c8e6c9', textColor: '#2e7d32' },
  { label: '试用期', value: 'probation', color: '#fff9c4', textColor: '#f9a825' },
  { label: '离职', value: 'resigned', color: '#ffcdd2', textColor: '#c62828' },
  { label: '休假', value: 'vacation', color: '#b3e5fc', textColor: '#0277bd' },
];

const tagOptions = [
  { label: '核心成员', value: 'core', color: '#ff5722', textColor: '#ffffff' },
  { label: '技术骨干', value: 'tech_lead', color: '#2196f3', textColor: '#ffffff' },
  { label: '新人', value: 'newcomer', color: '#4caf50', textColor: '#ffffff' },
  { label: '管理层', value: 'management', color: '#9c27b0', textColor: '#ffffff' },
  { label: '远程办公', value: 'remote', color: '#607d8b', textColor: '#ffffff' },
];

// 列定义
const columns = ref<Column[]>([
  { key: 'id', title: 'ID', width: 60, type: 'number' as const, readonly: true, sortable: true },
  { key: 'avatar', title: '头像', width: 80, type: 'file' as const },
  { key: 'name', title: '姓名', width: 100, sortable: true },
  { key: 'department', title: '部门', width: 110, type: 'select' as const, options: departmentOptions, sortable: true },
  { key: 'status', title: '状态', width: 100, type: 'select' as const, options: statusOptions },
  { key: 'email', title: '邮箱', width: 180, type: 'email' as const },
  { key: 'phone', title: '电话', width: 130, type: 'phone' as const },
  { key: 'age', title: '年龄', width: 80, type: 'number' as const, sortable: true },
  { key: 'salary', title: '薪资', width: 120, type: 'number' as const, sortable: true, numberPrefix: '¥', useThousandSeparator: true },
  { key: 'performance', title: '绩效', width: 80, type: 'number' as const, sortable: true, decimalPlaces: 1 },
  { key: 'isFullTime', title: '全职', width: 70, type: 'boolean' as const },
  { key: 'joinDate', title: '入职日期', width: 120, type: 'date' as const, dateFormat: 'YYYY-MM-DD' },
  { key: 'tags', title: '标签', width: 180, type: 'select' as const, options: tagOptions, multiple: true },
]);

const departments = ['技术部', '产品部', '设计部', '市场部', '运营部'];

// 生成测试数据
const generateData = () => {
  const names = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵强', '黄丽', '周杰', '吴敏'];
  const deptValues = ['tech', 'product', 'design', 'market', 'operation'];
  const statusValues = ['active', 'probation', 'resigned', 'vacation'];
  const tagValues = ['core', 'tech_lead', 'newcomer', 'management', 'remote'];
  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    '',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
  ];
  
  const data: any[] = [];
  for (let i = 0; i < 100; i++) {
    const numTags = 1 + Math.floor(Math.random() * 3);
    const shuffledTags = [...tagValues].sort(() => Math.random() - 0.5);
    const selectedTags = shuffledTags.slice(0, numTags);
    
    data.push({
      id: i + 1,
      avatar: i < 5 ? (avatars[i] ? { url: avatars[i], name: `avatar${i+1}.svg` } : null) : null,
      name: names[i % names.length],
      department: deptValues[i % deptValues.length],
      status: statusValues[i % statusValues.length],
      email: `user${i + 1}@example.com`,
      phone: `138${String(10000000 + Math.floor(Math.random() * 90000000)).slice(0, 8)}`,
      age: 22 + Math.floor(Math.random() * 30),
      salary: Math.floor(8000 + Math.random() * 42000),
      performance: Number((3 + Math.random() * 2).toFixed(1)),
      isFullTime: Math.random() > 0.2,
      joinDate: `202${Math.floor(Math.random() * 4)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
      tags: selectedTags,
    });
  }
  return data;
};

let originalData = generateData();
let currentData = [...originalData];

// 初始化表格
const initSheet = async () => {
  await nextTick();
  if (!sheetContainer.value) return;

  sheet = new SimpleSheet(sheetContainer.value, {
    columns: columns.value,
    data: currentData,
    rowHeight: 36,
    headerHeight: 40,
    theme: currentTheme.value,
    showRowNumber: true,
    allowInsertRow: true,
    allowDeleteRow: true,
    allowInsertColumn: true,
    allowDeleteColumn: true,
    allowMultiSelect: true,
  });

  showStats.value = { total: currentData.length, filtered: currentData.length };

  // 右键菜单
  contextMenu = new ContextMenu({
    items: createDefaultMenuItems({
      onCopy: () => sheet?.copy(),
      onPaste: () => sheet?.paste(),
      onCut: () => sheet?.cut(),
      onClearContent: () => sheet?.clearContent(),
      onInsertRowAbove: (ctx) => ctx.position && sheet?.insertRow(ctx.position.row),
      onInsertRowBelow: (ctx) => ctx.position && sheet?.insertRow(ctx.position.row + 1),
      onDeleteRow: (ctx) => ctx.position && sheet?.deleteRow(ctx.position.row),
      onInsertColumnLeft: (ctx) => {
        if (ctx.position) {
          showCreateColumnDialog((newCol: Column) => sheet?.insertColumn(ctx.position!.col, newCol));
        }
      },
      onInsertColumnRight: (ctx) => {
        if (ctx.position) {
          showCreateColumnDialog((newCol: Column) => sheet?.insertColumn(ctx.position!.col + 1, newCol));
        }
      },
      onDeleteColumn: (ctx) => ctx.position && sheet?.deleteColumn(ctx.position.col),
    }),
  });
  contextMenu.mount(document.body);
  sheet.setContextMenu(contextMenu);

  // 表头右键菜单
  headerMenu = new ContextMenu({
    items: createHeaderMenuItems({
      onCopy: () => sheet?.copy(),
      onSortAsc: (ctx) => {
        if (ctx.headerColIndex !== undefined) {
          const col = columns.value[ctx.headerColIndex];
          if (col?.key) sorter?.sort(col.key, 'asc');
        }
      },
      onSortDesc: (ctx) => {
        if (ctx.headerColIndex !== undefined) {
          const col = columns.value[ctx.headerColIndex];
          if (col?.key) sorter?.sort(col.key, 'desc');
        }
      },
      onInsertColumnLeft: (ctx) => {
        if (ctx.headerColIndex !== undefined) {
          showCreateColumnDialog((newCol: Column) => sheet?.insertColumn(ctx.headerColIndex!, newCol));
        }
      },
      onInsertColumnRight: (ctx) => {
        if (ctx.headerColIndex !== undefined) {
          showCreateColumnDialog((newCol: Column) => sheet?.insertColumn(ctx.headerColIndex! + 1, newCol));
        }
      },
      onEditColumn: (ctx) => {
        if (ctx.headerColIndex !== undefined) {
          const col = columns.value[ctx.headerColIndex];
          if (col) {
            showEditColumnDialog(col, (updatedCol: Column) => {
              columns.value[ctx.headerColIndex!] = updatedCol;
              sheet?.setColumns(columns.value);
            });
          }
        }
      },
      onDeleteColumn: (ctx) => ctx.headerColIndex !== undefined && sheet?.deleteColumn(ctx.headerColIndex),
      onHideColumn: (ctx) => ctx.headerColIndex !== undefined && sheet?.hideColumn(ctx.headerColIndex),
      onShowAllColumns: () => sheet?.showAllColumns(),
    }),
  });
  headerMenu.mount(document.body);

  // 行号右键菜单
  rowNumberMenu = new ContextMenu({
    items: createRowNumberMenuItems({
      onCopy: () => sheet?.copy(),
      onInsertRowAbove: (ctx) => ctx.rowNumberIndex !== undefined && sheet?.insertRow(ctx.rowNumberIndex),
      onInsertRowBelow: (ctx) => ctx.rowNumberIndex !== undefined && sheet?.insertRow(ctx.rowNumberIndex + 1),
      onDeleteRow: (ctx) => ctx.rowNumberIndex !== undefined && sheet?.deleteRow(ctx.rowNumberIndex),
      onHideRow: (ctx) => ctx.rowNumberIndex !== undefined && sheet?.hideRow(ctx.rowNumberIndex),
      onShowAllRows: () => sheet?.showAllRows(),
    }),
  });
  rowNumberMenu.mount(document.body);

  // 事件
  sheet.on('cell:contextmenu', (e) => {
    const selection = sheet?.getSelection() || [];
    contextMenu?.show(e.originalEvent.clientX, e.originalEvent.clientY, {
      position: { row: e.row, col: e.col },
      selection,
      selectedCells: selection.length > 0 ? [selection[0].start] : [],
      originalEvent: e.originalEvent,
      clickArea: 'cell',
    });
  });

  sheet.on('header:contextmenu' as any, (e: any) => {
    headerMenu?.show(e.originalEvent.clientX, e.originalEvent.clientY, {
      position: null,
      selection: sheet?.getSelection() || [],
      selectedCells: [],
      originalEvent: e.originalEvent,
      clickArea: 'header',
      headerColIndex: e.col,
    });
  });

  sheet.on('rowNumber:contextmenu' as any, (e: any) => {
    rowNumberMenu?.show(e.originalEvent.clientX, e.originalEvent.clientY, {
      position: null,
      selection: sheet?.getSelection() || [],
      selectedCells: [],
      originalEvent: e.originalEvent,
      clickArea: 'rowNumber',
      rowNumberIndex: e.row,
    });
  });

  // 列拖拽
  columnReorder = new ColumnReorder({
    getColumns: () => columns.value,
    setColumns: (newCols: any[]) => {
      columns.value = newCols;
      sheet?.setColumns(newCols);
      sorter?.setColumns(newCols);
      filter?.setColumns(newCols);
    },
    getColumnWidth: (i) => columns.value[i]?.width || 100,
    getHeaderHeight: () => 40,
    showRowNumber: true,
    rowNumberWidth: 50,
    clearSelection: () => {
      sheet?.clearSelection();
    },
  });
  columnReorder.mount(sheetContainer.value);

  // 排序
  sorter = new Sorter();
  sorter.setColumns(columns.value);
  sorter.setData(currentData);
  sorter.on('sort:change', ({ data }) => {
    currentData = data;
    sheet?.setData(data);
    filter?.setData(data);
    search?.setData(data, columns.value);
  });

  // 筛选
  filter = new Filter();
  filter.setColumns(columns.value);
  filter.setData(currentData);
  filter.on('filter:change', ({ data }) => {
    sheet?.setData(data);
    showStats.value.filtered = data.length;
    search?.setData(data, columns.value);
  });

  // 搜索
  search = new Search();
  search.setData(currentData, columns.value);

  // 验证
  validator = new Validator();
  validator.addRule('email', ValidationRules.email());
  validator.addRule('age', ValidationRules.range(18, 65));
  validator.addRule('performance', ValidationRules.range(0, 5));
};

const destroySheet = () => {
  contextMenu?.destroy();
  headerMenu?.destroy();
  rowNumberMenu?.destroy();
  columnReorder?.unmount();
  sheet?.destroy();
  sheet = null;
};

// 主题切换
const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
  sheet?.setTheme(currentTheme.value);
};

// 搜索
const doSearch = () => {
  if (!search || !searchKeyword.value) {
    searchResults.value = [];
    currentSearchIndex.value = -1;
    return;
  }
  const results = search.search(searchKeyword.value, { caseSensitive: false });
  searchResults.value = results;
  currentSearchIndex.value = results.length > 0 ? 0 : -1;
  if (results.length > 0) sheet?.scrollToCell(results[0].row, results[0].col);
};

const searchNext = () => {
  if (searchResults.value.length === 0) return;
  const result = search?.next();
  if (result) {
    currentSearchIndex.value = search!.getCurrentIndex();
    sheet?.scrollToCell(result.row, result.col);
  }
};

const searchPrev = () => {
  if (searchResults.value.length === 0) return;
  const result = search?.prev();
  if (result) {
    currentSearchIndex.value = search!.getCurrentIndex();
    sheet?.scrollToCell(result.row, result.col);
  }
};

const clearSearch = () => {
  searchKeyword.value = '';
  searchResults.value = [];
  currentSearchIndex.value = -1;
  search?.clear();
};

// 筛选
const deptValueMap: Record<string, string> = {
  '技术部': 'tech', '产品部': 'product', '设计部': 'design', '市场部': 'market', '运营部': 'operation',
};

const applyFilter = () => {
  if (filterDepartment.value) {
    const deptValue = deptValueMap[filterDepartment.value] || filterDepartment.value;
    filter?.setConditions([FilterConditions.equals('department', deptValue)]);
  } else {
    filter?.clearFilter();
  }
};

// 排序
const doSort = (colKey: string, dir: 'asc' | 'desc') => {
  sorter?.sort(colKey, dir);
};

const clearSort = () => {
  sorter?.clear();
  sheet?.setData(originalData);
  currentData = [...originalData];
  filter?.setData(currentData);
  search?.setData(currentData, columns.value);
  showStats.value.filtered = currentData.length;
};

// 验证
const validateAll = () => {
  if (!validator || !sheet) return;
  sheet.clearAllValidationErrors();
  const data = sheet.getData();
  const result = validator.validateAll(data, columns.value);
  if (!result.valid) {
    result.errors.forEach((err: any) => {
      sheet!.setValidationError(err.row, err.col, err.message);
    });
  }
};

// 导出
const exportCSV = () => {
  const csv = sheet?.exportCSV();
  if (csv) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
};

const exportJSON = () => {
  const data = sheet?.getData();
  if (data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
};

// 复制代码
const copyInstall = () => {
  navigator.clipboard.writeText('npm install simple-sheet');
};

const copyCode = () => {
  navigator.clipboard.writeText(codeExample);
};

const codeExample = `import { SimpleSheet } from 'simple-sheet';
import 'simple-sheet/dist/simple-sheet.css';

const sheet = new SimpleSheet('#container', {
  columns: [
    { key: 'name', title: '姓名', width: 100 },
    { key: 'email', title: '邮箱', width: 180, type: 'email' },
    { key: 'salary', title: '薪资', type: 'number', numberPrefix: '¥' },
    { key: 'active', title: '在职', type: 'boolean' },
  ],
  data: [
    { name: '张三', email: 'zhang@example.com', salary: 25000, active: true },
  ],
});

sheet.on('cell:change', ({ row, col, newValue }) => {
  console.log('变化:', row, col, newValue);
});`;

// 特性列表
const features = [
  { icon: '🚀', title: '虚拟滚动', desc: '轻松处理10万+数据' },
  { icon: '📝', title: '多种类型', desc: '文本/数字/日期/下拉/复选等' },
  { icon: '🎨', title: '主题切换', desc: '亮色/暗色主题' },
  { icon: '⌨️', title: '快捷键', desc: '完整键盘操作' },
  { icon: '📋', title: '复制粘贴', desc: '与Excel互通' },
  { icon: '✅', title: '数据验证', desc: '可视化错误提示' },
];

onMounted(() => initSheet());
onUnmounted(() => destroySheet());
</script>

<template>
  <div class="home-page" :class="{ dark: currentTheme === 'dark' }">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <span class="nav-logo">📊</span>
        <span class="nav-title">SimpleSheet</span>
      </div>
      <div class="nav-links">
        <a href="#features">特性</a>
        <a href="#demo">演示</a>
        <a href="#code">代码</a>
        <a href="https://github.com/user/simple-sheet" target="_blank" class="nav-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <a href="https://www.npmjs.com/package/simple-sheet" target="_blank" class="nav-btn nav-btn-primary">
          npm
        </a>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1>
          现代化的 <span class="highlight">Web 表格</span> 组件
        </h1>
        <p class="hero-desc">
          零依赖、高性能、功能丰富，为您的应用带来类 Excel 的数据编辑体验
        </p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">依赖</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">&lt;50KB</span>
            <span class="stat-label">Gzipped</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">100K+</span>
            <span class="stat-label">行数据</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">10+</span>
            <span class="stat-label">列类型</span>
          </div>
        </div>
        <div class="hero-install">
          <code>npm install simple-sheet</code>
          <button @click="copyInstall" title="复制">📋</button>
        </div>
      </div>
    </section>

    <!-- 特性 -->
    <section id="features" class="features-section">
      <h2 class="section-title">核心特性</h2>
      <div class="features-grid">
        <div v-for="f in features" :key="f.title" class="feature-card">
          <span class="feature-icon">{{ f.icon }}</span>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 演示 -->
    <section id="demo" class="demo-section">
      <h2 class="section-title">在线演示</h2>
      <p class="section-desc">完整功能：编辑、选区、右键菜单、拖拽排序、搜索筛选、数据验证、撤销重做、复制粘贴</p>
      
      <!-- 工具栏 -->
      <div class="demo-toolbar">
        <div class="toolbar-group">
          <input 
            v-model="searchKeyword" 
            placeholder="搜索..." 
            class="input-field"
            @keyup.enter="doSearch"
          />
          <button class="btn" @click="doSearch">搜索</button>
          <template v-if="searchResults.length > 0">
            <button class="btn btn-icon" @click="searchPrev">◀</button>
            <span class="search-info">{{ currentSearchIndex + 1 }}/{{ searchResults.length }}</span>
            <button class="btn btn-icon" @click="searchNext">▶</button>
            <button class="btn btn-icon" @click="clearSearch">✕</button>
          </template>
        </div>
        
        <div class="toolbar-group">
          <select v-model="filterDepartment" @change="applyFilter" class="input-field">
            <option value="">全部部门</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        
        <div class="toolbar-group">
          <button class="btn" @click="doSort('salary', 'desc')">薪资↓</button>
          <button class="btn" @click="doSort('performance', 'desc')">绩效↓</button>
          <button class="btn" @click="clearSort">清除排序</button>
        </div>
        
        <div class="toolbar-group">
          <button class="btn" @click="validateAll">验证数据</button>
          <button class="btn" @click="exportCSV">导出CSV</button>
          <button class="btn" @click="exportJSON">导出JSON</button>
        </div>
        
        <div class="toolbar-group">
          <button class="btn" @click="toggleTheme">
            {{ currentTheme === 'light' ? '🌙 暗色' : '☀️ 亮色' }}
          </button>
        </div>
        
        <div class="toolbar-stats">
          显示 <strong>{{ showStats.filtered }}</strong> / {{ showStats.total }} 行
        </div>
      </div>
      
      <!-- 表格 -->
      <div class="demo-sheet-wrapper">
        <div ref="sheetContainer" class="demo-sheet"></div>
      </div>
      
      <div class="demo-tips">
        💡 双击编辑 · Alt+Enter换行 · 右键菜单 · 拖拽表头排序 · Ctrl+C/V复制粘贴 · Ctrl+Z/Y撤销重做
      </div>
    </section>

    <!-- 代码示例 -->
    <section id="code" class="code-section">
      <h2 class="section-title">快速开始</h2>
      <div class="code-steps">
        <div class="code-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>安装</h4>
            <div class="code-block">
              <code>npm install simple-sheet</code>
            </div>
          </div>
        </div>
        <div class="code-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>使用</h4>
            <div class="code-block code-block-large">
              <button class="copy-btn" @click="copyCode">📋 复制</button>
              <pre><code>{{ codeExample }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="footer-logo">📊</span>
          <span>SimpleSheet</span>
        </div>
        <div class="footer-links">
          <a href="https://github.com/user/simple-sheet" target="_blank">GitHub</a>
          <a href="https://www.npmjs.com/package/simple-sheet" target="_blank">npm</a>
          <a href="https://github.com/user/simple-sheet/issues" target="_blank">问题反馈</a>
        </div>
      </div>
      <div class="footer-copyright">
        MIT License © 2024 SimpleSheet
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f8fafc;
  color: #334155;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.home-page.dark {
  background: #0f172a;
  color: #e2e8f0;
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

.dark .navbar {
  background: rgba(15, 23, 42, 0.95);
  border-color: #1e293b;
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
  margin-right: 160px;
}

.nav-links a {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #3b82f6;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: #f1f5f9;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #e2e8f0;
}

.dark .nav-btn {
  background: #1e293b;
}

.nav-btn-primary {
  background: #3b82f6;
  color: white !important;
}

.nav-btn-primary:hover {
  background: #2563eb;
}

/* Hero */
.hero {
  padding: 80px 32px 60px;
  text-align: center;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.dark .hero {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}

.hero h1 {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
  letter-spacing: -1px;
}

.highlight {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 18px;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto 40px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-bottom: 40px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 13px;
  color: #94a3b8;
}

.hero-install {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #1e293b;
  border-radius: 12px;
  color: #e2e8f0;
}

.hero-install code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
}

.hero-install button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.hero-install button:hover {
  opacity: 1;
}

/* 特性 */
.features-section {
  padding: 80px 32px;
  background: #ffffff;
}

.dark .features-section {
  background: #0f172a;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
}

.section-desc {
  text-align: center;
  color: #64748b;
  margin-bottom: 48px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.feature-card {
  padding: 28px;
  background: #f8fafc;
  border-radius: 16px;
  text-align: center;
  transition: all 0.3s;
}

.dark .feature-card {
  background: #1e293b;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.feature-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.feature-card p {
  font-size: 13px;
  color: #94a3b8;
}

/* 演示 */
.demo-section {
  padding: 80px 32px;
  background: #f1f5f9;
}

.dark .demo-section {
  background: #1e293b;
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto 16px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid #e2e8f0;
}

.dark .demo-toolbar {
  background: #0f172a;
  border-color: #334155;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-stats {
  margin-left: auto;
  font-size: 13px;
  color: #64748b;
}

.input-field {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #3b82f6;
}

.dark .input-field {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

.btn {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.dark .btn {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

.dark .btn:hover {
  background: #334155;
}

.btn-icon {
  padding: 8px 10px;
}

.search-info {
  font-size: 12px;
  color: #64748b;
}

.demo-sheet-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dark .demo-sheet-wrapper {
  background: #0f172a;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.demo-sheet {
  height: 500px;
}

.demo-tips {
  max-width: 1400px;
  margin: 16px auto 0;
  padding: 12px 20px;
  background: #e0f2fe;
  border-radius: 8px;
  font-size: 13px;
  color: #0369a1;
  text-align: center;
}

.dark .demo-tips {
  background: #1e3a5f;
  color: #7dd3fc;
}

/* 代码 */
.code-section {
  padding: 80px 32px;
  background: #ffffff;
}

.dark .code-section {
  background: #0f172a;
}

.code-steps {
  max-width: 800px;
  margin: 40px auto 0;
}

.code-step {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
}

.step-number {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  border-radius: 10px;
  color: white;
  font-weight: 700;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  font-size: 16px;
  margin-bottom: 10px;
}

.code-block {
  position: relative;
  background: #1e293b;
  border-radius: 10px;
  padding: 16px 20px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #e2e8f0;
}

.code-block-large {
  padding: 20px;
}

.code-block-large pre {
  margin: 0;
}

.copy-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

/* Footer */
.footer {
  padding: 48px 32px 24px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
}

.dark .footer {
  background: #0f172a;
  border-color: #1e293b;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto 24px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.footer-logo {
  font-size: 24px;
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-links a {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #3b82f6;
}

.footer-copyright {
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.dark .footer-copyright {
  border-color: #1e293b;
}

/* 响应式 */
@media (max-width: 768px) {
  .hero h1 {
    font-size: 32px;
  }
  
  .hero-stats {
    gap: 24px;
  }
  
  .stat-value {
    font-size: 22px;
  }
  
  .nav-links {
    display: none;
  }
  
  .demo-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-stats {
    margin-left: 0;
    text-align: center;
  }
}
</style>
