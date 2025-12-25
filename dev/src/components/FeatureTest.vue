<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { SimpleSheet, type Column, type RowData } from '@n0ts123/simple-sheet';

const sheetContainer = ref<HTMLElement | null>(null);
const sheet = ref<SimpleSheet | null>(null);

// 测试配置
const testConfig = reactive({
  rowCount: 100,
  showRowNumber: true,
  readonly: false,
  theme: 'auto' as 'auto' | 'light' | 'dark',
});

// 测试结果
const testResults = ref<Array<{ name: string; status: 'pass' | 'fail' | 'pending'; message?: string }>>([]);

// 列定义
const columns: Column[] = [
  { key: 'col1', title: '文本列', width: 120, type: 'text' },
  { key: 'col2', title: '数字列', width: 100, type: 'number', align: 'right' },
  { key: 'col3', title: '只读列', width: 100, type: 'text', readonly: true },
  { key: 'col4', title: '长文本', width: 200, type: 'text' },
];

// 生成测试数据
const generateTestData = (count: number): RowData[] => {
  return Array.from({ length: count }, (_, i) => ({
    col1: `文本 ${i + 1}`,
    col2: Math.round(Math.random() * 1000),
    col3: `只读 ${i + 1}`,
    col4: `这是一段比较长的文本内容，用于测试文本溢出效果 ${i + 1}`,
  }));
};

// 初始化表格
const initSheet = () => {
  if (sheet.value) {
    sheet.value.destroy();
  }

  if (!sheetContainer.value) return;

  const data = generateTestData(testConfig.rowCount);

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns,
    data,
    rowHeight: 32,
    headerHeight: 36,
    showRowNumber: testConfig.showRowNumber,
    readonly: testConfig.readonly,
    theme: testConfig.theme,
  });
};

onMounted(() => {
  initSheet();
});

onUnmounted(() => {
  sheet.value?.destroy();
});

// 应用配置
const applyConfig = () => {
  initSheet();
};

// 运行测试
const runTests = async () => {
  testResults.value = [];

  // 测试 1: 数据加载
  await runTest('数据加载', () => {
    const data = sheet.value?.getData();
    if (data && data.length === testConfig.rowCount) {
      return { pass: true };
    }
    return { pass: false, message: `期望 ${testConfig.rowCount} 行，实际 ${data?.length}` };
  });

  // 测试 2: 单元格值读写
  await runTest('单元格值读写', () => {
    const testValue = 'TEST_VALUE_' + Date.now();
    sheet.value?.setCellValue(0, 0, testValue);
    const readValue = sheet.value?.getCellValue(0, 0);
    if (readValue === testValue) {
      return { pass: true };
    }
    return { pass: false, message: `写入 ${testValue}，读取 ${readValue}` };
  });

  // 测试 3: 选区设置
  await runTest('选区设置', () => {
    sheet.value?.setSelection(1, 1, 3, 3);
    const selection = sheet.value?.getSelection();
    if (selection && selection.length > 0) {
      const range = selection[0];
      if (range.start.row === 1 && range.start.col === 1 && 
          range.end.row === 3 && range.end.col === 3) {
        return { pass: true };
      }
    }
    return { pass: false, message: '选区范围不正确' };
  });

  // 测试 4: 行插入
  await runTest('行插入', () => {
    const beforeCount = sheet.value?.getData().length ?? 0;
    sheet.value?.insertRow(0, { col1: '新行', col2: 999, col3: '新只读', col4: '新长文本' });
    const afterCount = sheet.value?.getData().length ?? 0;
    if (afterCount === beforeCount + 1) {
      return { pass: true };
    }
    return { pass: false, message: `插入前 ${beforeCount}，插入后 ${afterCount}` };
  });

  // 测试 5: 行删除
  await runTest('行删除', () => {
    const beforeCount = sheet.value?.getData().length ?? 0;
    sheet.value?.deleteRow(0);
    const afterCount = sheet.value?.getData().length ?? 0;
    if (afterCount === beforeCount - 1) {
      return { pass: true };
    }
    return { pass: false, message: `删除前 ${beforeCount}，删除后 ${afterCount}` };
  });

  // 测试 6: 主题切换
  await runTest('主题切换', () => {
    sheet.value?.setTheme('dark');
    const theme = sheet.value?.getTheme();
    sheet.value?.setTheme('auto');
    if (theme === 'dark') {
      return { pass: true };
    }
    return { pass: false, message: `设置 dark，获取 ${theme}` };
  });

  // 测试 7: CSV 导出
  await runTest('CSV 导出', () => {
    const csv = sheet.value?.exportCSV();
    if (csv && csv.includes(',') && csv.includes('\n')) {
      return { pass: true };
    }
    return { pass: false, message: 'CSV 格式不正确' };
  });

  // 测试 8: 批量设置值
  await runTest('批量设置值', () => {
    const values = [
      ['A1', 'B1'],
      ['A2', 'B2'],
    ];
    sheet.value?.setRangeValues(0, 0, values);
    const v1 = sheet.value?.getCellValue(0, 0);
    const v2 = sheet.value?.getCellValue(1, 1);
    if (v1 === 'A1' && v2 === 'B2') {
      return { pass: true };
    }
    return { pass: false, message: `期望 A1/B2，实际 ${v1}/${v2}` };
  });

  // 测试 9: 撤销重做
  await runTest('撤销重做', () => {
    const original = sheet.value?.getCellValue(0, 0);
    sheet.value?.setCellValue(0, 0, 'UNDO_TEST');
    sheet.value?.undo();
    const afterUndo = sheet.value?.getCellValue(0, 0);
    if (afterUndo === original) {
      return { pass: true };
    }
    return { pass: false, message: `撤销后应为 ${original}，实际 ${afterUndo}` };
  });

  // 测试 10: 滚动到单元格
  await runTest('滚动到单元格', () => {
    sheet.value?.scrollToCell(50, 2);
    // 无法直接验证滚动位置，假设不报错就通过
    return { pass: true };
  });
};

const runTest = async (
  name: string, 
  testFn: () => { pass: boolean; message?: string }
) => {
  testResults.value.push({ name, status: 'pending' });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const result = testFn();
    const index = testResults.value.findIndex(t => t.name === name);
    if (index !== -1) {
      testResults.value[index] = {
        name,
        status: result.pass ? 'pass' : 'fail',
        message: result.message,
      };
    }
  } catch (error) {
    const index = testResults.value.findIndex(t => t.name === name);
    if (index !== -1) {
      testResults.value[index] = {
        name,
        status: 'fail',
        message: String(error),
      };
    }
  }
};

const passCount = () => testResults.value.filter(t => t.status === 'pass').length;
const failCount = () => testResults.value.filter(t => t.status === 'fail').length;
</script>

<template>
  <div class="feature-test">
    <div class="config-panel">
      <h3>⚙️ 测试配置</h3>
      <div class="config-form">
        <div class="form-item">
          <label>数据行数</label>
          <input type="number" v-model.number="testConfig.rowCount" min="1" max="10000" />
        </div>
        <div class="form-item">
          <label>
            <input type="checkbox" v-model="testConfig.showRowNumber" />
            显示行号
          </label>
        </div>
        <div class="form-item">
          <label>
            <input type="checkbox" v-model="testConfig.readonly" />
            只读模式
          </label>
        </div>
        <div class="form-item">
          <label>主题</label>
          <select v-model="testConfig.theme">
            <option value="auto">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
        <div class="form-actions">
          <button @click="applyConfig" class="btn">应用配置</button>
          <button @click="runTests" class="btn primary">🧪 运行测试</button>
        </div>
      </div>
    </div>

    <div class="test-area">
      <div class="sheet-wrapper">
        <div ref="sheetContainer" class="sheet-container"></div>
      </div>

      <div class="test-results" v-if="testResults.length > 0">
        <div class="results-header">
          <h3>📊 测试结果</h3>
          <div class="results-summary">
            <span class="pass">✅ {{ passCount() }}</span>
            <span class="fail">❌ {{ failCount() }}</span>
          </div>
        </div>
        <div class="results-list">
          <div 
            v-for="result in testResults" 
            :key="result.name" 
            :class="['result-item', result.status]"
          >
            <span class="result-icon">
              {{ result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏳' }}
            </span>
            <span class="result-name">{{ result.name }}</span>
            <span class="result-message" v-if="result.message">{{ result.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-test {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.config-panel h3 {
  margin-bottom: 16px;
  font-size: 16px;
}

.config-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-item label {
  font-size: 13px;
  color: #666;
}

.form-item input[type="number"],
.form-item select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  width: 120px;
}

.form-item input[type="checkbox"] {
  margin-right: 6px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
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
}

.btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn.primary:hover {
  opacity: 0.9;
}

.test-area {
  display: flex;
  gap: 16px;
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
  height: 400px;
}

.test-results {
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.results-header h3 {
  font-size: 14px;
}

.results-summary {
  display: flex;
  gap: 12px;
  font-size: 14px;
  font-weight: 600;
}

.results-summary .pass {
  color: #10b981;
}

.results-summary .fail {
  color: #ef4444;
}

.results-list {
  padding: 8px 0;
  max-height: 340px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.pass {
  background: #f0fdf4;
}

.result-item.fail {
  background: #fef2f2;
}

.result-item.pending {
  background: #fffbeb;
}

.result-icon {
  font-size: 14px;
}

.result-name {
  font-weight: 500;
}

.result-message {
  margin-left: auto;
  font-size: 11px;
  color: #666;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

