<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { SimpleSheet, type Column, type RowData, type Theme } from '@n0ts123/simple-sheet';

const sheetContainer = ref<HTMLElement | null>(null);
const sheet = ref<SimpleSheet | null>(null);
const currentTheme = ref<Theme>('auto');
const eventLog = ref<string[]>([]);
const selectedCount = ref(0);
const rowCount = ref(0);

// 列定义
const columns: Column[] = [
  { key: 'id', title: 'ID', width: 60, type: 'number', readonly: true },
  { key: 'name', title: '商品名称', width: 150, type: 'text' },
  { key: 'category', title: '分类', width: 120, type: 'text' },
  { key: 'price', title: '价格 (¥)', width: 100, type: 'number', align: 'right' },
  { key: 'stock', title: '库存', width: 80, type: 'number', align: 'right' },
  { key: 'status', title: '状态', width: 100, type: 'text', align: 'center' },
  { key: 'createTime', title: '创建时间', width: 150, type: 'text' },
];

// 生成示例数据
const generateData = (count: number): RowData[] => {
  const categories = ['水果', '蔬菜', '饮品', '零食', '日用品'];
  const statuses = ['在售', '促销', '预售', '下架'];
  const names = ['苹果', '香蕉', '橙子', '西红柿', '黄瓜', '可乐', '薯片', '纸巾'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}号` : ''),
    category: categories[Math.floor(Math.random() * categories.length)],
    price: Math.round(Math.random() * 100 * 100) / 100,
    stock: Math.floor(Math.random() * 500),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleString('zh-CN'),
  }));
};

const initialData = generateData(100);

// 记录事件日志
const logEvent = (type: string, detail: string) => {
  const time = new Date().toLocaleTimeString('zh-CN');
  eventLog.value.unshift(`[${time}] ${type}: ${detail}`);
  if (eventLog.value.length > 50) {
    eventLog.value.pop();
  }
};

onMounted(() => {
  if (!sheetContainer.value) return;

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns,
    data: initialData,
    rowHeight: 36,
    headerHeight: 40,
    showRowNumber: true,
    theme: 'auto',
  });

  rowCount.value = initialData.length;

  // 监听事件
  sheet.value.on('cell:click', (e) => {
    logEvent('点击', `单元格 [${e.row}, ${e.col}] = ${e.value}`);
  });

  sheet.value.on('cell:dblclick', (e) => {
    logEvent('双击', `进入编辑 [${e.row}, ${e.col}]`);
  });

  sheet.value.on('data:change', (e) => {
    logEvent('数据变更', `${e.changes.length} 个单元格`);
  });

  sheet.value.on('selection:change', (e) => {
    selectedCount.value = e.cells.length;
    logEvent('选区变更', `${e.cells.length} 个单元格`);
  });

  sheet.value.on('edit:start', (e) => {
    logEvent('编辑开始', `[${e.row}, ${e.col}] 原值: ${e.oldValue}`);
  });

  sheet.value.on('edit:end', (e) => {
    logEvent('编辑结束', `[${e.row}, ${e.col}] 新值: ${e.newValue}`);
  });

  sheet.value.on('row:insert', (e) => {
    rowCount.value = sheet.value?.getData().length ?? 0;
    logEvent('插入行', `位置: ${e.index}`);
  });

  sheet.value.on('row:delete', (e) => {
    rowCount.value = sheet.value?.getData().length ?? 0;
    logEvent('删除行', `位置: ${e.index}`);
  });
});

onUnmounted(() => {
  sheet.value?.destroy();
});

// 操作方法
const addRow = () => {
  if (!sheet.value) return;
  const count = sheet.value.getData().length;
  sheet.value.insertRow(count, {
    id: count + 1,
    name: '新商品',
    category: '未分类',
    price: 0,
    stock: 0,
    status: '待上架',
    createTime: new Date().toLocaleString('zh-CN'),
  });
};

const deleteSelectedRow = () => {
  if (!sheet.value) return;
  const selection = sheet.value.getSelection();
  if (selection.length > 0) {
    sheet.value.deleteRow(selection[0].start.row);
  }
};

const toggleTheme = () => {
  const themes: Theme[] = ['auto', 'light', 'dark'];
  const index = themes.indexOf(currentTheme.value);
  currentTheme.value = themes[(index + 1) % themes.length];
  sheet.value?.setTheme(currentTheme.value);
};

const exportData = () => {
  if (!sheet.value) return;
  const csv = sheet.value.exportCSV();
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `export_${Date.now()}.csv`;
  link.click();
  logEvent('导出', 'CSV 文件');
};

const printData = () => {
  if (!sheet.value) return;
  const data = sheet.value.getData();
  console.log('表格数据:', data);
  logEvent('打印', `${data.length} 行数据到控制台`);
};

const loadMoreData = () => {
  if (!sheet.value) return;
  const currentData = sheet.value.getData();
  const newData = [...currentData, ...generateData(100)];
  // 重新分配 ID
  newData.forEach((row, i) => row.id = i + 1);
  sheet.value.loadData(newData);
  rowCount.value = newData.length;
  logEvent('加载数据', `新增 100 行，共 ${newData.length} 行`);
};

const clearEventLog = () => {
  eventLog.value = [];
};

const themeLabel = computed(() => {
  const labels: Record<Theme, string> = {
    auto: '🌗 跟随系统',
    light: '☀️ 浅色',
    dark: '🌙 深色',
  };
  return labels[currentTheme.value];
});
</script>

<template>
  <div class="demo">
    <div class="toolbar">
      <div class="toolbar-group">
        <button @click="addRow" class="btn">➕ 添加行</button>
        <button @click="deleteSelectedRow" class="btn">➖ 删除行</button>
        <button @click="loadMoreData" class="btn">📥 加载更多</button>
      </div>
      <div class="toolbar-group">
        <button @click="exportData" class="btn">📤 导出 CSV</button>
        <button @click="printData" class="btn">🖨️ 打印数据</button>
      </div>
      <div class="toolbar-group">
        <button @click="toggleTheme" class="btn primary">{{ themeLabel }}</button>
      </div>
    </div>

    <div class="content">
      <div class="sheet-wrapper">
        <div ref="sheetContainer" class="sheet-container"></div>
      </div>

      <div class="sidebar">
        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">总行数</span>
            <span class="stat-value">{{ rowCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">选中单元格</span>
            <span class="stat-value">{{ selectedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">当前主题</span>
            <span class="stat-value">{{ currentTheme }}</span>
          </div>
        </div>

        <div class="event-log">
          <div class="event-log-header">
            <h3>📋 事件日志</h3>
            <button @click="clearEventLog" class="btn-small">清空</button>
          </div>
          <div class="event-log-list">
            <div v-for="(log, index) in eventLog" :key="index" class="event-item">
              {{ log }}
            </div>
            <div v-if="eventLog.length === 0" class="empty">暂无事件</div>
          </div>
        </div>
      </div>
    </div>

    <div class="shortcuts">
      <h4>⌨️ 快捷键</h4>
      <div class="shortcut-list">
        <span><kbd>↑↓←→</kbd> 导航</span>
        <span><kbd>Enter</kbd> 编辑</span>
        <span><kbd>Tab</kbd> 下一格</span>
        <span><kbd>Esc</kbd> 取消</span>
        <span><kbd>Del</kbd> 清除</span>
        <span><kbd>Ctrl+C</kbd> 复制</span>
        <span><kbd>Ctrl+V</kbd> 粘贴</span>
        <span><kbd>Ctrl+Z</kbd> 撤销</span>
        <span><kbd>Ctrl+A</kbd> 全选</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.toolbar-group {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn.primary:hover {
  opacity: 0.9;
}

.content {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.sheet-wrapper {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.sheet-container {
  width: 100%;
  height: 500px;
}

.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.event-log {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.event-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.event-log-header h3 {
  font-size: 14px;
  font-weight: 600;
}

.btn-small {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn-small:hover {
  background: #f5f5f5;
}

.event-log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.event-item {
  padding: 4px 0;
  color: #555;
  border-bottom: 1px dashed #f0f0f0;
}

.empty {
  color: #999;
  text-align: center;
  padding: 20px;
}

.shortcuts {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.shortcuts h4 {
  font-size: 14px;
  margin-bottom: 12px;
  color: #333;
}

.shortcut-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shortcut-list span {
  font-size: 12px;
  color: #666;
}

kbd {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: inherit;
}
</style>

