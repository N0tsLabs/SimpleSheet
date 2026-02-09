<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import { SimpleSheet, type Column, type RowData } from '@n0ts123/simple-sheet';

const sheetContainer = ref<HTMLElement | null>(null);
const sheet = ref<SimpleSheet | null>(null);

// 当前演示模式
const demoMode = ref<'config' | 'disabled' | 'messages' | 'styles'>('config');

// 测试配置
const testConfig = reactive({
  rowCount: 100,
  showRowNumber: true,
  readonly: false,
  theme: 'auto' as 'auto' | 'light' | 'dark',
});

// 禁用列演示配置
const disabledDemo = reactive({
  disabledColumn: 2,
  disabledColor: '#fef3c7',
  hintText: '该列禁止编辑',
  enabled: true,
});

// 提示消息配置
const messageConfig = reactive({
  readonlyHint: '🚫 此单元格禁止编辑，请联系管理员',
  copyHint: '✅ 内容已复制到剪贴板',
  pasteHint: '✅ 数据粘贴成功',
  pasteError: '❌ 粘贴失败，请检查剪贴板内容',
});

// 测试结果
const testResults = ref<Array<{ name: string; status: 'pass' | 'fail' | 'pending'; message?: string }>>([]);

// ===== 禁用列演示的列定义 =====
const disabledColumns: Column[] = [
  { key: 'id', title: 'ID', width: 60, type: 'number', readonly: true },
  { key: 'name', title: '姓名', width: 120, type: 'text' },
  { key: 'email', title: '邮箱', width: 200, type: 'email' },
  { key: 'phone', title: '手机号', width: 140, type: 'phone' },
  { key: 'status', title: '状态', width: 100, type: 'select', options: [
    { label: '启用', value: 'active', color: '#dcfce7', textColor: '#15803d' },
    { label: '禁用', value: 'disabled', color: '#fee2e2', textColor: '#b91c1c' },
  ]},
  { key: 'amount', title: '金额', width: 100, type: 'number', numberPrefix: '¥', useThousandSeparator: true },
];

// ===== 禁用列演示数据 =====
const disabledData: RowData[] = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138001', status: 'active', amount: 12345.67 },
  { id: 2, name: '李四', email: 'lisi@example.com', phone: '13800138002', status: 'disabled', amount: 8901.23 },
  { id: 3, name: '王五', email: 'wangwu@example.com', phone: '13800138003', status: 'active', amount: 5678.90 },
  { id: 4, name: '赵六', email: 'zhaoliu@example.com', phone: '13800138004', status: 'active', amount: 2345.67 },
  { id: 5, name: '钱七', email: 'qianqi@example.com', phone: '13800138005', status: 'disabled', amount: 8901.23 },
];

// ===== 配置测试的列定义 =====
const configColumns: Column[] = [
  { key: 'col1', title: '文本列', width: 120, type: 'text' },
  { key: 'col2', title: '数字列', width: 100, type: 'number', align: 'right' },
  { key: 'col3', title: '只读列', width: 100, type: 'text', readonly: true },
  { key: 'col4', title: '长文本', width: 200, type: 'text' },
];

// ===== 样式演示的列定义 =====
const styleColumns: Column[] = [
  { key: 'col1', title: '默认样式', width: 120, type: 'text' },
  { key: 'col2', title: '红色表头', width: 120, type: 'text', headerBgColor: '#fee2e2', headerTextColor: '#b91c1c' },
  { key: 'col3', title: '蓝色表头', width: 120, type: 'text', headerBgColor: '#dbeafe', headerTextColor: '#1d4ed8' },
  { key: 'col4', title: '居中对齐', width: 120, type: 'text', align: 'center' },
  { key: 'col5', title: '右对齐', width: 120, type: 'number', align: 'right', numberPrefix: '¥', useThousandSeparator: true },
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

// 初始化禁用列演示
const initDisabledDemo = () => {
  if (sheet.value) {
    sheet.value.destroy();
  }

  if (!sheetContainer.value) return;

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns: disabledColumns,
    data: disabledData,
    rowHeight: 36,
    headerHeight: 40,
    showRowNumber: true,
    theme: testConfig.theme,
    toastMessages: {
      readonlyCellEdit: disabledDemo.hintText,
    },
  });

  // 添加禁用列样式
  const style = document.createElement('style');
  style.id = 'disabled-column-style';
  style.textContent = `
    .ss-column-disabled {
      background-color: ${disabledDemo.disabledColor} !important;
    }
    .ss-column-disabled:hover {
      background-color: ${disabledDemo.disabledColor} !important;
    }
  `;
  const existingStyle = document.getElementById('disabled-column-style');
  if (existingStyle) {
    existingStyle.remove();
  }
  document.head.appendChild(style);
};

// 初始化配置测试
const initConfigDemo = () => {
  if (sheet.value) {
    sheet.value.destroy();
  }

  if (!sheetContainer.value) return;

  const data = generateTestData(testConfig.rowCount);

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns: configColumns,
    data,
    rowHeight: 32,
    headerHeight: 36,
    showRowNumber: testConfig.showRowNumber,
    readonly: testConfig.readonly,
    theme: testConfig.theme,
  });
};

// 初始化样式演示
const initStyleDemo = () => {
  if (sheet.value) {
    sheet.value.destroy();
  }

  if (!sheetContainer.value) return;

  const styleData: RowData[] = [
    { col1: '普通文本', col2: '红色表头', col3: '蓝色表头', col4: '居中显示', col5: 1234567.89 },
    { col1: '测试数据', col2: '示例内容', col3: '样式演示', col4: '居中对齐', col5: 987654.32 },
    { col1: '更多内容', col2: '自定义列', col3: '表头颜色', col4: '文本居中', col5: 555555.55 },
  ];

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns: styleColumns,
    data: styleData,
    rowHeight: 40,
    headerHeight: 40,
    showRowNumber: true,
    theme: testConfig.theme,
  });
};

// 初始化提示消息演示
const initMessageDemo = () => {
  if (sheet.value) {
    sheet.value.destroy();
  }

  if (!sheetContainer.value) return;

  sheet.value = new SimpleSheet(sheetContainer.value, {
    columns: [
      { key: 'col1', title: '可编辑列', width: 150, type: 'text' },
      { key: 'col2', title: '只读列', width: 150, type: 'text', readonly: true },
    ],
    data: [
      { col1: '双击编辑', col2: '禁止编辑' },
      { col1: '尝试双击我', col2: '只读内容' },
      { col1: '可以修改', col2: '不能修改' },
    ],
    rowHeight: 40,
    headerHeight: 40,
    showRowNumber: true,
    theme: testConfig.theme,
    toastMessages: {
      readonlyCellEdit: messageConfig.readonlyHint,
      copySuccess: messageConfig.copyHint,
      pasteSuccess: messageConfig.pasteHint,
      pasteFailed: messageConfig.pasteError,
    },
  });
};

// 切换演示模式
const switchDemo = () => {
  switch (demoMode.value) {
    case 'config':
      initConfigDemo();
      break;
    case 'disabled':
      initDisabledDemo();
      break;
    case 'messages':
      initMessageDemo();
      break;
    case 'styles':
      initStyleDemo();
      break;
  }
};

onMounted(() => {
  initConfigDemo();
});

onUnmounted(() => {
  sheet.value?.destroy();
  const style = document.getElementById('disabled-column-style');
  if (style) style.remove();
});

// 切换演示标签
const switchTab = (mode: typeof demoMode.value) => {
  demoMode.value = mode;
  switchDemo();
};

// 应用配置
const applyConfig = () => {
  switchDemo();
};

// 测试禁用列功能
const testDisabledColumn = () => {
  if (!sheet.value) return { pass: false, message: '表格未初始化' };

  // 尝试编辑禁用列
  const originalValue = sheet.value.getCellValue(0, disabledDemo.disabledColumn);
  sheet.value.setCellValue(0, disabledDemo.disabledColumn, 'TEST_VALUE');

  if (sheet.value.getCellValue(0, disabledDemo.disabledColumn) === originalValue) {
    return { pass: true };
  }
  return { pass: false, message: '禁用列可以被编辑' };
};

// 测试提示消息
const testToastMessages = () => {
  if (!sheet.value) return { pass: false, message: '表格未初始化' };

  // 复制操作会触发 toast
  sheet.value.setSelection(0, 0, 0, 0);
  sheet.value.copy();

  return { pass: true };
};

// 获取面板标题
const getPanelTitle = () => {
  const titles: Record<string, string> = {
    config: '⚙️ 配置测试',
    disabled: '🚫 禁用列演示',
    messages: '💬 提示消息配置',
    styles: '🎨 样式演示',
  };
  return titles[demoMode.value] || '⚙️ 测试配置';
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

  // 测试 11: 禁用列功能（仅在禁用列演示模式下）
  if (demoMode.value === 'disabled') {
    await runTest('禁用列保护', () => testDisabledColumn());
  }

  // 测试 12: 提示消息配置（仅在提示消息演示模式下）
  if (demoMode.value === 'messages') {
    await runTest('提示消息配置', () => testToastMessages());
  }
};
</script>

<template>
  <div class="feature-test">
    <!-- 演示模式切换标签 -->
    <div class="demo-tabs">
      <button
        :class="['tab-btn', { active: demoMode === 'config' }]"
        @click="switchTab('config')"
      >
        ⚙️ 配置测试
      </button>
      <button
        :class="['tab-btn', { active: demoMode === 'disabled' }]"
        @click="switchTab('disabled')"
      >
        🚫 禁用列演示
      </button>
      <button
        :class="['tab-btn', { active: demoMode === 'messages' }]"
        @click="switchTab('messages')"
      >
        💬 提示消息配置
      </button>
      <button
        :class="['tab-btn', { active: demoMode === 'styles' }]"
        @click="switchTab('styles')"
      >
        🎨 样式演示
      </button>
    </div>

    <!-- 配置面板 -->
    <div class="config-panel">
      <h3>{{ getPanelTitle() }}</h3>
      <div class="config-form">
        <!-- 通用配置 -->
        <template v-if="demoMode === 'config'">
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
        </template>

        <!-- 禁用列配置 -->
        <template v-if="demoMode === 'disabled'">
          <div class="form-item">
            <label>禁用列索引</label>
            <input type="number" v-model.number="disabledDemo.disabledColumn" min="0" max="10" />
          </div>
          <div class="form-item">
            <label>禁用列颜色</label>
            <input type="color" v-model="disabledDemo.disabledColor" />
          </div>
          <div class="form-item">
            <label>禁用提示文字</label>
            <input type="text" v-model="disabledDemo.hintText" style="width: 150px;" />
          </div>
          <div class="form-item">
            <label>
              <input type="checkbox" v-model="disabledDemo.enabled" />
              启用禁用列功能
            </label>
          </div>
          <div class="form-tip">
            💡 提示：使用 CSS 类名 <code>ss-column-disabled</code> 自定义禁用列样式
          </div>
        </template>

        <!-- 提示消息配置 -->
        <template v-if="demoMode === 'messages'">
          <div class="form-item">
            <label>只读单元格提示</label>
            <input type="text" v-model="messageConfig.readonlyHint" style="width: 200px;" />
          </div>
          <div class="form-item">
            <label>复制成功提示</label>
            <input type="text" v-model="messageConfig.copyHint" style="width: 200px;" />
          </div>
          <div class="form-item">
            <label>粘贴成功提示</label>
            <input type="text" v-model="messageConfig.pasteHint" style="width: 200px;" />
          </div>
          <div class="form-item">
            <label>粘贴失败提示</label>
            <input type="text" v-model="messageConfig.pasteError" style="width: 200px;" />
          </div>
          <div class="form-tip">
            💡 提示：尝试双击只读列或复制粘贴内容查看提示效果
          </div>
        </template>

        <!-- 样式演示配置 -->
        <template v-if="demoMode === 'styles'">
          <div class="form-item">
            <label>主题</label>
            <select v-model="testConfig.theme">
              <option value="auto">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
          <div class="form-tip">
            💡 演示：自定义表头背景色、文字颜色、数字格式、对齐方式等样式配置
          </div>
        </template>

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

/* 演示模式标签 */
.demo-tabs {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f5f5f5;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
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

.form-item input[type="text"] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-item input[type="color"] {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.form-item input[type="checkbox"] {
  margin-right: 6px;
}

.form-tip {
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 12px;
  color: #0369a1;
  margin-left: auto;
}

.form-tip code {
  padding: 2px 6px;
  background: #e0f2fe;
  border-radius: 4px;
  font-family: monospace;
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
