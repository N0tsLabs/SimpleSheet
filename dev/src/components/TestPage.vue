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
  Validator,
  ValidationRules,
} from '../../../src';
import '../../../src/styles/index.css';

// 容器引用
const sheetContainer = ref<HTMLElement | null>(null);

// Sheet 实例
let sheet: SimpleSheet | null = null;
let contextMenu: ContextMenu | null = null;
let columnReorder: ColumnReorder | null = null;
let sorter: Sorter | null = null;
let filter: Filter | null = null;
let search: Search | null = null;
let validator: Validator | null = null;

// 状态
const testLog = ref<string[]>([]);
const currentTheme = ref<'light' | 'dark'>('light');
const searchKeyword = ref('');
const searchResults = ref<any[]>([]);
const currentSearchIndex = ref(-1);
const filterDepartment = ref('');
const showStats = ref({ total: 0, filtered: 0 });

// 列定义
const columns = ref([
  { key: 'id', title: 'ID', width: 60, type: 'number' as const, readonly: true, sortable: true },
  { key: 'name', title: '姓名', width: 100, sortable: true },
  { key: 'department', title: '部门', width: 100, sortable: true },
  { key: 'email', title: '邮箱', width: 180 },
  { key: 'age', title: '年龄', width: 80, type: 'number' as const, sortable: true },
  { key: 'salary', title: '薪资', width: 100, type: 'number' as const, sortable: true },
  { key: 'performance', title: '绩效', width: 80, type: 'number' as const, sortable: true },
  { key: 'joinDate', title: '入职日期', width: 110 },
  { key: 'remark', title: '备注', width: 200, wrapText: 'ellipsis' as const },
]);

// 部门列表
const departments = ['技术部', '产品部', '设计部', '市场部', '运营部'];

// 生成测试数据
const generateData = () => {
  const names = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵强', '黄丽', '周杰', '吴敏'];
  const remarks = [
    '表现优秀',
    '工作认真\n态度积极',
    '团队协作能力强\n沟通顺畅',
    '需要加强技术能力',
    '表现稳定',
    '有潜力\n值得培养',
    '',
    '绩效达标',
    '这是一段很长的备注文本，用于测试省略号显示效果',
    '多行文本测试\n第二行\n第三行内容',
  ];
  
  const data: any[] = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      id: i + 1,
      name: names[i % names.length],
      department: departments[i % departments.length],
      email: `user${i + 1}@example.com`,
      age: 22 + Math.floor(Math.random() * 30),
      salary: Math.floor(8000 + Math.random() * 42000),
      performance: Number((3 + Math.random() * 2).toFixed(1)),
      joinDate: `202${Math.floor(Math.random() * 4)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
      remark: remarks[i % remarks.length],
    });
  }
  return data;
};

let originalData = generateData();
let currentData = [...originalData];

// 日志
const log = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  testLog.value.unshift(`[${time}] ${msg}`);
  if (testLog.value.length > 50) {
    testLog.value.pop();
  }
};

const clearLog = () => {
  testLog.value = [];
};

// 初始化
const initSheet = async () => {
  await nextTick();
  if (!sheetContainer.value) return;

  // 创建 Sheet
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

  // 右键菜单（完整功能）
  contextMenu = new ContextMenu({
    items: createDefaultMenuItems({
      onCopy: () => { sheet?.copy(); log('复制'); },
      onPaste: () => { sheet?.paste(); log('粘贴'); },
      onCut: () => { sheet?.cut(); log('剪切'); },
      onClearContent: () => { sheet?.clearContent(); log('清除内容'); },
      onInsertRowAbove: (ctx) => {
        if (ctx.position) {
          sheet?.insertRow(ctx.position.row);
          log(`在第 ${ctx.position.row + 1} 行上方插入`);
        }
      },
      onInsertRowBelow: (ctx) => {
        if (ctx.position) {
          sheet?.insertRow(ctx.position.row + 1);
          log(`在第 ${ctx.position.row + 1} 行下方插入`);
        }
      },
      onDeleteRow: (ctx) => {
        if (ctx.position) {
          sheet?.deleteRow(ctx.position.row);
          log(`删除第 ${ctx.position.row + 1} 行`);
        }
      },
      onInsertColumnLeft: (ctx) => {
        if (ctx.position) {
          const newCol = { key: `col_${Date.now()}`, title: '新列', width: 100 };
          sheet?.insertColumn(ctx.position.col, newCol);
          columns.value.splice(ctx.position.col, 0, newCol);
          log(`在列 ${ctx.position.col + 1} 左侧插入`);
        }
      },
      onInsertColumnRight: (ctx) => {
        if (ctx.position) {
          const newCol = { key: `col_${Date.now()}`, title: '新列', width: 100 };
          sheet?.insertColumn(ctx.position.col + 1, newCol);
          columns.value.splice(ctx.position.col + 1, 0, newCol);
          log(`在列 ${ctx.position.col + 1} 右侧插入`);
        }
      },
      onDeleteColumn: (ctx) => {
        if (ctx.position) {
          sheet?.deleteColumn(ctx.position.col);
          columns.value.splice(ctx.position.col, 1);
          log(`删除列 ${ctx.position.col + 1}`);
        }
      },
    }),
  });
  contextMenu.mount(document.body);
  sheet.setContextMenu(contextMenu);

  // 右键菜单事件
  sheet.on('cell:contextmenu', (e) => {
    const selection = sheet?.getSelection() || [];
    contextMenu?.show(e.originalEvent.clientX, e.originalEvent.clientY, {
      position: { row: e.row, col: e.col },
      selection,
      selectedCells: selection.length > 0 ? [selection[0].start] : [],
      originalEvent: e.originalEvent,
    });
  });

  // 列拖拽排序
  columnReorder = new ColumnReorder({
    getColumns: () => columns.value,
    setColumns: (newCols: any[]) => {
      columns.value = newCols;
      sheet?.setColumns(newCols);
      sorter?.setColumns(newCols);
      filter?.setColumns(newCols);
      log('列顺序已更新');
    },
    getColumnWidth: (i) => columns.value[i]?.width || 100,
    getHeaderHeight: () => 40,
    showRowNumber: true,
    rowNumberWidth: 50,
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
    log('排序完成');
  });

  // 筛选
  filter = new Filter();
  filter.setColumns(columns.value);
  filter.setData(currentData);
  filter.on('filter:change', ({ data }) => {
    sheet?.setData(data);
    showStats.value.filtered = data.length;
    search?.setData(data, columns.value);
    log(`筛选完成，显示 ${data.length} 条`);
  });

  // 搜索
  search = new Search();
  search.setData(currentData, columns.value);

  // 数据验证
  validator = new Validator();
  validator.addRule('email', ValidationRules.email());
  validator.addRule('age', ValidationRules.range(18, 65));
  validator.addRule('performance', ValidationRules.range(0, 5));

  // 监听事件
  sheet.on('cell:click', (e) => log(`点击 [${e.row + 1}, ${e.col + 1}]`));
  sheet.on('edit:end', (e) => log(`编辑完成 [${e.row + 1}, ${e.col + 1}]`));
  sheet.on('selection:change', (e) => log(`选区: ${e.ranges.length} 个区域`));
  sheet.on('copy', () => log('已复制'));
  sheet.on('paste', () => log('已粘贴'));
  sheet.on('row:insert', (e) => log(`插入行: ${e.index + 1}`));
  sheet.on('row:delete', (e) => log(`删除行: ${e.index + 1}`));

  log('全功能表格初始化完成');
  log('✅ 已启用: 编辑、选区、右键菜单、拖拽排序、排序、筛选、搜索、验证、撤销重做、复制粘贴');
};

// 销毁
const destroySheet = () => {
  contextMenu?.destroy();
  columnReorder?.unmount();
  sheet?.destroy();
  sheet = null;
  contextMenu = null;
  columnReorder = null;
  sorter = null;
  filter = null;
  search = null;
  validator = null;
};

// 主题切换
const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
  sheet?.setTheme(currentTheme.value);
  log(`切换主题: ${currentTheme.value}`);
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
  if (results.length > 0) {
    sheet?.scrollToCell(results[0].row, results[0].col);
  }
  log(`搜索 "${searchKeyword.value}": ${results.length} 个结果`);
};

const searchNext = () => {
  if (!search || searchResults.value.length === 0) return;
  const result = search.next();
  if (result) {
    currentSearchIndex.value = search.getCurrentIndex();
    sheet?.scrollToCell(result.row, result.col);
  }
};

const searchPrev = () => {
  if (!search || searchResults.value.length === 0) return;
  const result = search.prev();
  if (result) {
    currentSearchIndex.value = search.getCurrentIndex();
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
const applyFilter = () => {
  if (!filter) return;
  if (filterDepartment.value) {
    filter.setConditions([FilterConditions.equals('department', filterDepartment.value)]);
  } else {
    filter.clearFilter();
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
  log('清除排序');
};

// 验证
const validateAll = () => {
  if (!validator || !sheet) return;
  const data = sheet.getData();
  const result = validator.validateAll(data, columns.value);
  if (result.valid) {
    log('✅ 数据验证通过');
  } else {
    log(`❌ 验证失败: ${result.errors.length} 个错误`);
    result.errors.forEach((err: any) => {
      log(`  - [${err.row + 1}, ${err.col + 1}]: ${err.message}`);
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
    log('导出 CSV 完成');
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
    log('导出 JSON 完成');
  }
};

onMounted(() => {
  initSheet();
});

onUnmounted(() => {
  destroySheet();
});
</script>

<template>
  <div class="test-page" :class="{ 'dark': currentTheme === 'dark' }">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="toolbar-title">
        <span class="logo">📊</span>
        <span>SimpleSheet 功能测试</span>
      </div>
      
      <div class="toolbar-actions">
        <!-- 搜索 -->
        <div class="toolbar-group">
          <input 
            v-model="searchKeyword" 
            placeholder="搜索..." 
            class="search-input"
            @keyup.enter="doSearch"
          />
          <button class="btn btn-sm" @click="doSearch">搜索</button>
          <template v-if="searchResults.length > 0">
            <button class="btn btn-sm" @click="searchPrev">◀</button>
            <span class="search-count">{{ currentSearchIndex + 1 }}/{{ searchResults.length }}</span>
            <button class="btn btn-sm" @click="searchNext">▶</button>
            <button class="btn btn-sm" @click="clearSearch">✕</button>
          </template>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 筛选 -->
        <div class="toolbar-group">
          <select v-model="filterDepartment" @change="applyFilter" class="select">
            <option value="">全部部门</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 排序 -->
        <div class="toolbar-group">
          <button class="btn btn-sm" @click="doSort('salary', 'desc')">薪资↓</button>
          <button class="btn btn-sm" @click="doSort('performance', 'desc')">绩效↓</button>
          <button class="btn btn-sm" @click="clearSort">清除排序</button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 验证 & 导出 -->
        <div class="toolbar-group">
          <button class="btn btn-sm" @click="validateAll">验证数据</button>
          <button class="btn btn-sm" @click="exportCSV">导出CSV</button>
          <button class="btn btn-sm" @click="exportJSON">导出JSON</button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 主题 -->
        <button class="btn btn-sm" @click="toggleTheme">
          {{ currentTheme === 'light' ? '🌙' : '☀️' }} 切换主题
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 表格区域 -->
      <div class="sheet-wrapper">
        <div ref="sheetContainer" class="sheet-container"></div>
      </div>

      <!-- 日志面板 -->
      <div class="log-panel">
        <div class="log-header">
          <span>操作日志</span>
          <div class="log-stats">
            显示 <strong>{{ showStats.filtered }}</strong> / {{ showStats.total }} 行
          </div>
          <button class="btn btn-xs" @click="clearLog">清空</button>
        </div>
        <div class="log-content">
          <div v-for="(msg, i) in testLog" :key="i" class="log-item">{{ msg }}</div>
          <div v-if="testLog.length === 0" class="log-empty">暂无日志</div>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <footer class="tips">
      <span>💡 提示：双击编辑 · Alt+Enter换行 · 右键菜单 · 拖拽表头排序 · Ctrl+C/V复制粘贴 · Ctrl+Z/Y撤销重做</span>
    </footer>
  </div>
</template>

<style scoped>
.test-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
  color: #333;
}

.test-page.dark {
  background: #1a1a2e;
  color: #e0e0e0;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.dark .toolbar {
  background: #16213e;
  border-color: #0f3460;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.logo {
  font-size: 24px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 180px; /* 为页面切换按钮留出空间 */
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
}

.dark .toolbar-divider {
  background: #0f3460;
}

/* 按钮 */
.btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.dark .btn {
  background: #0f3460;
  border-color: #1a4a7a;
  color: #e0e0e0;
}

.dark .btn:hover {
  background: #1a5a9a;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-xs {
  padding: 2px 6px;
  font-size: 11px;
}

/* 输入框 */
.search-input, .select {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.search-input:focus, .select:focus {
  border-color: #4a90d9;
}

.dark .search-input, .dark .select {
  background: #0f3460;
  border-color: #1a4a7a;
  color: #e0e0e0;
}

.search-count {
  font-size: 12px;
  color: #666;
}

.dark .search-count {
  color: #aaa;
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}

.sheet-wrapper {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.dark .sheet-wrapper {
  background: #16213e;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.sheet-container {
  width: 100%;
  height: 100%;
}

/* 日志面板 */
.log-panel {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.dark .log-panel {
  background: #16213e;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
  font-size: 13px;
}

.dark .log-header {
  background: #0f3460;
  border-color: #1a4a7a;
}

.log-stats {
  font-size: 11px;
  color: #666;
}

.dark .log-stats {
  color: #aaa;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-item {
  padding: 4px 8px;
  font-size: 11px;
  font-family: monospace;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
}

.dark .log-item {
  color: #bbb;
  border-color: #0f3460;
}

.log-empty {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 12px;
}

/* 底部提示 */
.tips {
  padding: 8px 20px;
  background: #e8f4fd;
  color: #1a73e8;
  font-size: 12px;
  text-align: center;
}

.dark .tips {
  background: #0f3460;
  color: #64b5f6;
}
</style>
