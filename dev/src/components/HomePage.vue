<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, shallowRef, watch } from 'vue';
import { SimpleSheet } from '../../../src';
import type { Column, SheetOptions } from '../../../src';
import '../../../src/styles/index.css';

// Monaco Editor
import * as monaco from 'monaco-editor';

const emit = defineEmits(['go-docs']);

// 容器引用
const sheetContainer = ref<HTMLElement | null>(null);

// Sheet 实例
let sheet: SimpleSheet | null = null;

// 状态
const currentTheme = ref<'light' | 'dark'>('light');
const searchKeyword = ref('');
const searchResults = ref<any[]>([]);
const currentSearchIndex = ref(-1);
const filterDepartment = ref('');
const showStats = ref({ total: 0, filtered: 0 });
const testLog = ref<string[]>([]);
const activeSection = ref('demo');
const showSourceCode = ref(false);
const copySuccess = ref(false);

// 代码编辑器状态
const showCodeEditor = ref(false);
const editorCode = ref('');
const editorError = ref('');
const saveSuccess = ref(false);
const monacoEditorContainer = ref<HTMLElement | null>(null);
let monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null;

// 当前配置（会被代码编辑器修改）
let currentConfig: SheetOptions | null = null;

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
  { 
    key: 'avatar', 
    title: '头像', 
    width: 80, 
    type: 'file' as const,
    fileUpload: {
      accept: ['image/*'],
      maxSize: 30 * 1024 * 1024,
    },
  },
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
  { key: 'website', title: '个人主页', width: 160, type: 'link' as const },
  { key: 'tags', title: '标签', width: 180, type: 'select' as const, options: tagOptions, multiple: true },
  { key: 'remark', title: '备注', width: 200, wrapText: 'ellipsis' as const },
]);

const departments = ['技术部', '产品部', '设计部', '市场部', '运营部'];

// 生成测试数据
const generateData = () => {
  const names = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵强', '黄丽', '周杰', '吴敏'];
  const remarks = [
    '表现优秀', '工作认真\n态度积极', '团队协作能力强\n沟通顺畅',
    '需要加强技术能力', '表现稳定', '有潜力\n值得培养', '',
    '绩效达标', '这是一段很长的备注文本，用于测试省略号显示效果',
    '多行文本测试\n第二行\n第三行内容',
  ];
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
      website: i % 3 === 0 ? `https://github.com/user${i + 1}` : '',
      tags: selectedTags,
      remark: remarks[i % remarks.length],
    });
  }
  return data;
};

const originalData = generateData();
const currentData = ref([...originalData]);

// 日志
const log = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  testLog.value.unshift(`[${time}] ${msg}`);
  if (testLog.value.length > 100) {
    testLog.value.pop();
  }
};

const clearLog = () => {
  testLog.value = [];
};

// 获取默认配置
const getDefaultConfig = (): SheetOptions => {
  return {
    columns: columns.value,
    data: currentData.value,
    rowHeight: 36,
    headerHeight: 40,
    theme: currentTheme.value,
    showRowNumber: true,
    allowInsertRow: true,
    allowDeleteRow: true,
    allowInsertColumn: true,
    allowDeleteColumn: true,
    allowMultiSelect: true,
    features: {
      columnReorder: true,
      rowReorder: true,
      columnResize: true,
      autoFill: true,
      sorter: true,
      filter: true,
      search: true,
      validator: true,
      filePaste: true,
    },
    contextMenuOptions: {
      showCopy: true,
      showPaste: true,
      showCut: true,
      showSelectAll: true,
      showInsertRowAbove: true,
      showInsertRowBelow: true,
      showDeleteRow: true,
      showClearRow: true,
      showInsertColumnLeft: true,
      showInsertColumnRight: true,
      showDeleteColumn: true,
      showClearColumn: true,
      showSortAsc: true,
      showSortDesc: true,
      showSortCancel: true,
      showFilter: true,
      showMergeCell: true,
      showUnmergeCell: true,
    },
  };
};

// 初始化表格
const initSheet = async () => {
  await nextTick();
  if (!sheetContainer.value) return;

  // 使用当前配置或默认配置
  const config = currentConfig || getDefaultConfig();
  
  sheet = new SimpleSheet(sheetContainer.value, config);

  // 更新统计
  const data = config.data || [];
  showStats.value = { total: data.length, filtered: data.length };

  // 添加验证规则
  sheet.addValidationRule('email', { type: 'email', message: '请输入有效的邮箱地址' });
  sheet.addValidationRule('age', { type: 'range', min: 18, max: 65, message: '年龄必须在 18-65 之间' });
  sheet.addValidationRule('performance', { type: 'range', min: 0, max: 5, message: '绩效必须在 0-5 之间' });

  // 事件监听
  sheet.on('cell:click', (e) => {
    log(`点击单元格：行${e.row + 1}, 列${e.col + 1}`);
  });
  sheet.on('selection:change', () => {});
  sheet.on('copy', () => log('已复制'));
  sheet.on('paste', () => log('已粘贴'));
  
  // 数据变更事件 - 实时打印所有数据变更
  sheet.on('data:change', (e) => {
    if (e.changes && Array.isArray(e.changes) && e.changes.length > 0) {
      // 批量变更
      e.changes.forEach((change: any) => {
        const row = change.row ?? 0;
        const col = change.col ?? 0;
        const oldValue = change.oldValue ?? '';
        const newValue = change.newValue ?? '';
        const colName = config.columns?.[col]?.title ?? `列${col + 1}`;
        log(`数据变更：行${row + 1} ${colName} "${oldValue}" → "${newValue}"`);
      });
    } else if (e.row !== undefined && e.col !== undefined) {
      // 单个变更
      const row = e.row;
      const col = e.col;
      const oldValue = e.oldValue ?? '';
      const newValue = e.newValue ?? '';
      const colName = config.columns?.[col]?.title ?? `列${col + 1}`;
      log(`数据变更：行${row + 1} ${colName} "${oldValue}" → "${newValue}"`);
    }
  });
  
  sheet.on('row:insert', (e) => {
    log(`插入行：位置${e.index + 1}`);
  });
  sheet.on('row:delete', (e) => {
    log(`删除行：位置${e.index + 1}`);
  });
  sheet.on('column:insert', (e) => {
    log(`插入列：位置${e.index + 1}`);
  });
  sheet.on('column:delete', (e) => {
    log(`删除列：位置${e.index + 1}`);
  });

  // 文件上传事件
  sheet.on('file:paste:start', (e: any) => {
    log(`📤 开始上传 ${e.files.length} 个文件到行${e.row + 1}`);
  });
  sheet.on('file:paste', (e: any) => {
    log(`✅ 文件上传成功: ${e.result.name}`);
  });
  sheet.on('file:paste:error', (e: any) => {
    log(`❌ 文件上传失败: ${e.file.name} - ${e.error.message}`);
  });

  // 列隐藏/显示事件
  sheet.on('column:hide', (e) => {
    const cols = config.columns || [];
    const colName = cols[e.index]?.title || `列${e.index + 1}`;
    log(`🙈 隐藏列：${colName}`);
  });
  sheet.on('column:show', (e) => {
    const cols = config.columns || [];
    const colName = cols[e.index]?.title || `列${e.index + 1}`;
    log(`👁️ 显示列：${colName}`);
  });

  // 排序事件
  sheet.on('sort:change', (e) => {
    const cols = config.columns || [];
    const colName = cols[e.column]?.title || `列${e.column + 1}`;
    const direction = e.direction === 'asc' ? '升序' : (e.direction === 'desc' ? '降序' : '取消');
    log(`🔃 排序：${colName} - ${direction}`);
  });

  // 配置变更事件
  sheet.on('config:change', (e) => {
    const typeLabels: Record<string, string> = {
      'sort': '排序',
      'column-resize': '列宽调整',
      'column-reorder': '列顺序调整',
      'column-insert': '插入列',
      'column-delete': '删除列',
      'column-hide': '隐藏列',
      'column-show': '显示列',
      'row-reorder': '行顺序调整',
      'row-insert': '插入行',
      'row-delete': '删除行',
      'freeze': '冻结设置',
      'merge': '合并单元格',
      'filter': '筛选',
      'load': '加载配置',
    };
    const label = typeLabels[e.type] || e.type;

    let detail = '';
    const cols = config.columns || [];
    switch (e.type) {
      case 'sort':
        const col = e.detail.column;
        const colName = col !== undefined && cols[col] ? cols[col].title : `列${(col ?? 0) + 1}`;
        const direction = e.detail.direction === 'asc' ? '升序' : (e.detail.direction === 'desc' ? '降序' : '取消');
        detail = `列：${colName}, 方式：${direction}`;
        break;
      case 'column-resize':
        const resizeCol = e.detail.column;
        const resizeColName = resizeCol !== undefined && cols[resizeCol] ? cols[resizeCol].title : `列${(resizeCol ?? 0) + 1}`;
        detail = `列：${resizeColName}, ${e.detail.oldWidth}px → ${e.detail.newWidth}px`;
        break;
      case 'column-reorder':
        const fromIndex = e.detail.fromIndex ?? 0;
        const toIndex = e.detail.toIndex ?? 0;
        detail = `${fromIndex + 1} → ${toIndex + 1}`;
        break;
      case 'column-hide':
      case 'column-show':
        const hideColIndex = e.detail.index;
        const hideColName = hideColIndex !== undefined && cols[hideColIndex] ? cols[hideColIndex].title : `列${(hideColIndex ?? 0) + 1}`;
        detail = `列：${hideColName}`;
        break;
    }

    log(`📋 配置变更 [${label}] ${detail ? '- ' + detail : ''}`);
  });

  log('表格初始化完成');
};

const destroySheet = () => {
  sheet?.destroy();
  sheet = null;
};

// 主题切换
const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
  sheet?.setTheme(currentTheme.value);
};

// 搜索 - 使用筛选功能过滤数据
const doSearch = () => {
  if (!searchKeyword.value) {
    searchResults.value = [];
    currentSearchIndex.value = -1;
    if (filterDepartment.value) {
      applyFilter();
    } else {
      sheet?.clearFilter();
    }
    const data = currentConfig?.data || currentData.value;
    showStats.value.filtered = data.length;
    return;
  }
  const results = sheet?.doSearch(searchKeyword.value, { caseSensitive: false }) || [];
  searchResults.value = results;
  currentSearchIndex.value = results.length > 0 ? 0 : -1;
  
  const matchingRowIndices = new Set<number>();
  for (const result of results) {
    matchingRowIndices.add(result.row);
  }
  
  let finalRowIndices: number[] = [];
  const data = currentConfig?.data || currentData.value;
  if (filterDepartment.value) {
    const deptValue = deptValueMap[filterDepartment.value] || filterDepartment.value;
    const deptRowIndices = new Set<number>();
    data.forEach((row: any, index: number) => {
      if (row.department === deptValue) {
        deptRowIndices.add(index);
      }
    });
    matchingRowIndices.forEach(idx => {
      if (deptRowIndices.has(idx)) {
        finalRowIndices.push(idx);
      }
    });
  } else {
    finalRowIndices = Array.from(matchingRowIndices);
  }
  
  const matchingRowKeys = finalRowIndices.map(idx => data[idx]?.id).filter(id => id !== undefined);
  
  if (matchingRowKeys.length > 0) {
    sheet?.setFilter('id', matchingRowKeys);
  } else {
    sheet?.clearFilter();
  }
  
  showStats.value.filtered = matchingRowKeys.length;
  log(`搜索 "${searchKeyword.value}": ${results.length} 个结果，显示 ${matchingRowKeys.length} 行`);
};

const searchNext = () => {
  if (searchResults.value.length === 0) return;
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length;
  const result = searchResults.value[currentSearchIndex.value];
  if (result && sheet) {
    sheet.scrollToCell(result.row, result.col, true, true);
  }
};

const searchPrev = () => {
  if (searchResults.value.length === 0) return;
  currentSearchIndex.value = currentSearchIndex.value <= 0 ? searchResults.value.length - 1 : currentSearchIndex.value - 1;
  const result = searchResults.value[currentSearchIndex.value];
  if (result && sheet) {
    sheet.scrollToCell(result.row, result.col, true, true);
  }
};

const clearSearch = () => {
  searchKeyword.value = '';
  searchResults.value = [];
  currentSearchIndex.value = -1;
  sheet?.clearFilter();
  const data = currentConfig?.data || currentData.value;
  showStats.value.filtered = data.length;
};

// 筛选
const deptValueMap: Record<string, string> = {
  '技术部': 'tech', '产品部': 'product', '设计部': 'design', '市场部': 'market', '运营部': 'operation',
};

const applyFilter = () => {
  if (filterDepartment.value) {
    const deptValue = deptValueMap[filterDepartment.value] || filterDepartment.value;
    sheet?.setFilter('department', [deptValue]);
  } else {
    sheet?.clearFilter();
  }
};

// 排序
const doSort = (colKey: string, dir: 'asc' | 'desc') => {
  sheet?.sortByKey(colKey, dir);
};

const clearSort = () => {
  sheet?.sortByKey('', null);
  const data = currentConfig?.data || currentData.value;
  const original = [...originalData];
  sheet?.setData(original);
  showStats.value.filtered = original.length;
  log('清除排序');
};

// 验证
const validateAll = () => {
  if (!sheet) return;
  sheet.clearAllValidationErrors();
  const data = sheet.getData();
  const cols = currentConfig?.columns || columns.value;
  const errors: { row: number; col: number; message: string }[] = [];
  data.forEach((row: any, rowIndex: number) => {
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push({ row: rowIndex, col: cols.findIndex((c: any) => c.key === 'email'), message: '邮箱格式不正确' });
    }
    if (row.age && (row.age < 18 || row.age > 65)) {
      errors.push({ row: rowIndex, col: cols.findIndex((c: any) => c.key === 'age'), message: '年龄必须在 18-65 之间' });
    }
  });
  if (errors.length === 0) {
    log('✅ 数据验证通过');
  } else {
    log(`❌ 验证失败：${errors.length} 个错误`);
    errors.forEach((err) => {
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

// 复制代码
const copyInstall = () => {
  navigator.clipboard.writeText('npm install @n0ts123/simple-sheet');
};

const copyCode = () => {
  navigator.clipboard.writeText(codeExample);
};

const codeExample = `import { SimpleSheet } from '@n0ts123/simple-sheet';
import '@n0ts123/simple-sheet/dist/simple-sheet.css';

const sheet = new SimpleSheet('#container', {
  columns: [
    { key: 'name', title: '姓名', width: 150 },
    { key: 'age', title: '年龄', width: 100, type: 'number' },
    { key: 'email', title: '邮箱', width: 200 },
  ],
  data: [
    { name: '张三', age: 28, email: 'zhangsan@example.com' },
    { name: '李四', age: 32, email: 'lisi@example.com' },
  ],
});`;

// 默认的编辑器代码模板 - 完整的配置，包含事件监听
const defaultEditorCode = `// ============================================
// SimpleSheet 实时代码编辑器
// 在这里编辑完整的表格配置，然后点击"应用代码"
// ============================================

// 返回配置对象，支持所有 SimpleSheet 配置项
// 通过 onLog 回调函数将日志输出到操作日志面板
return {
  // 列定义
  columns: [
    { key: 'id', title: 'ID', width: 60, type: 'number', readonly: true, sortable: true },
    { 
      key: 'avatar', 
      title: '头像', 
      width: 80, 
      type: 'file',
      fileUpload: {
        accept: ['image/*'],
        maxSize: 30 * 1024 * 1024,
      },
    },
    { key: 'name', title: '姓名', width: 100, sortable: true },
    { key: 'department', title: '部门', width: 110, type: 'select', options: [
      { label: '技术部', value: 'tech', color: '#e3f2fd', textColor: '#1565c0' },
      { label: '产品部', value: 'product', color: '#e8f5e9', textColor: '#2e7d32' },
      { label: '设计部', value: 'design', color: '#fce4ec', textColor: '#c2185b' },
      { label: '市场部', value: 'market', color: '#fff3e0', textColor: '#ef6c00' },
      { label: '运营部', value: 'operation', color: '#f3e5f5', textColor: '#7b1fa2' },
    ], sortable: true },
    { key: 'status', title: '状态', width: 100, type: 'select', options: [
      { label: '在职', value: 'active', color: '#c8e6c9', textColor: '#2e7d32' },
      { label: '试用期', value: 'probation', color: '#fff9c4', textColor: '#f9a825' },
      { label: '离职', value: 'resigned', color: '#ffcdd2', textColor: '#c62828' },
      { label: '休假', value: 'vacation', color: '#b3e5fc', textColor: '#0277bd' },
    ]},
    { key: 'email', title: '邮箱', width: 180, type: 'email' },
    { key: 'phone', title: '电话', width: 130, type: 'phone' },
    { key: 'age', title: '年龄', width: 80, type: 'number', sortable: true },
    { key: 'salary', title: '薪资', width: 120, type: 'number', sortable: true, numberPrefix: '¥', useThousandSeparator: true },
    { key: 'performance', title: '绩效', width: 80, type: 'number', sortable: true, decimalPlaces: 1 },
    { key: 'isFullTime', title: '全职', width: 70, type: 'boolean' },
    { key: 'joinDate', title: '入职日期', width: 120, type: 'date', dateFormat: 'YYYY-MM-DD' },
    { key: 'website', title: '个人主页', width: 160, type: 'link' },
    { key: 'tags', title: '标签', width: 180, type: 'select', options: [
      { label: '核心成员', value: 'core', color: '#ff5722', textColor: '#ffffff' },
      { label: '技术骨干', value: 'tech_lead', color: '#2196f3', textColor: '#ffffff' },
      { label: '新人', value: 'newcomer', color: '#4caf50', textColor: '#ffffff' },
      { label: '管理层', value: 'management', color: '#9c27b0', textColor: '#ffffff' },
      { label: '远程办公', value: 'remote', color: '#607d8b', textColor: '#ffffff' },
    ], multiple: true },
    { key: 'remark', title: '备注', width: 200, wrapText: 'ellipsis' },
  ],
  
  // 数据
  data: (() => {
    const names = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵强', '黄丽', '周杰', '吴敏'];
    const remarks = [
      '表现优秀', '工作认真\\n态度积极', '团队协作能力强\\n沟通顺畅',
      '需要加强技术能力', '表现稳定', '有潜力\\n值得培养', '',
      '绩效达标', '这是一段很长的备注文本，用于测试省略号显示效果',
      '多行文本测试\\n第二行\\n第三行内容',
    ];
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
    
    const data = [];
    for (let i = 0; i < 100; i++) {
      const numTags = 1 + Math.floor(Math.random() * 3);
      const shuffledTags = [...tagValues].sort(() => Math.random() - 0.5);
      const selectedTags = shuffledTags.slice(0, numTags);
      
      data.push({
        id: i + 1,
        avatar: i < 5 ? (avatars[i] ? { url: avatars[i], name: 'avatar'+(i+1)+'.svg' } : null) : null,
        name: names[i % names.length],
        department: deptValues[i % deptValues.length],
        status: statusValues[i % statusValues.length],
        email: 'user'+(i + 1)+'@example.com',
        phone: '138'+String(10000000 + Math.floor(Math.random() * 90000000)).slice(0, 8),
        age: 22 + Math.floor(Math.random() * 30),
        salary: Math.floor(8000 + Math.random() * 42000),
        performance: Number((3 + Math.random() * 2).toFixed(1)),
        isFullTime: Math.random() > 0.2,
        joinDate: '202'+Math.floor(Math.random() * 4)+'-'+String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')+'-'+String(1 + Math.floor(Math.random() * 28)).padStart(2, '0'),
        website: i % 3 === 0 ? 'https://github.com/user'+(i + 1) : '',
        tags: selectedTags,
        remark: remarks[i % remarks.length],
      });
    }
    return data;
  })(),
  
  // 行高（像素）
  rowHeight: 36,
  
  // 表头高度（像素）
  headerHeight: 40,
  
  // 主题: 'light' | 'dark'
  theme: 'light',
  
  // 显示行号
  showRowNumber: true,
  
  // 显示复选框列
  showCheckbox: false,
  
  // 行号列宽度（像素）
  rowNumberWidth: 50,
  
  // 全局只读模式
  readonly: false,
  
  // 允许插入行
  allowInsertRow: true,
  
  // 允许删除行
  allowDeleteRow: true,
  
  // 允许插入列
  allowInsertColumn: true,
  
  // 允许删除列
  allowDeleteColumn: true,
  
  // 允许多选
  allowMultiSelect: true,
  
  // 最大撤销步数
  maxHistorySize: 50,
  
  // 虚拟滚动缓冲区大小（行数）
  virtualScrollBuffer: 5,
  
  // 表格上下边距（像素）
  verticalPadding: 0,
  
  // 启用右键菜单（总开关）
  enableContextMenu: true,
  
  // 功能特性
  features: {
    columnReorder: true,    // 列拖拽排序
    rowReorder: true,       // 行拖拽排序
    columnResize: true,     // 列宽调整
    autoFill: true,         // 自动填充
    sorter: true,           // 排序
    filter: true,           // 筛选
    search: true,           // 搜索
    validator: true,        // 验证
    filePaste: true,        // 文件粘贴
  },
  
  // 右键菜单配置
  contextMenuOptions: {
    showCopy: true,           // 显示复制
    showPaste: true,          // 显示粘贴
    showCut: true,            // 显示剪切
    showSelectAll: true,      // 显示全选
    showInsertRowAbove: true, // 显示上方插入行
    showInsertRowBelow: true, // 显示下方插入行
    showDeleteRow: true,      // 显示删除行
    showClearRow: true,       // 显示清空行
    showInsertColumnLeft: true,  // 显示左侧插入列
    showInsertColumnRight: true, // 显示右侧插入列
    showDeleteColumn: true,   // 显示删除列
    showClearColumn: true,    // 显示清空列
    showSortAsc: true,        // 显示升序排序
    showSortDesc: true,       // 显示降序排序
    showSortCancel: true,     // 显示取消排序
    showFilter: true,         // 显示筛选
    showMergeCell: true,      // 显示合并单元格
    showUnmergeCell: true,    // 显示取消合并单元格
  },
  
  // 提示文本配置
  toastMessages: {
    readonlyCellEdit: '该单元格为只读，无法编辑',
    copySuccess: '复制成功',
    pasteSuccess: '粘贴成功',
    pasteFailed: '粘贴失败',
  },
  
  // ============================================
  // 事件监听配置 - 通过 onLog 回调输出到日志面板
  // ============================================
  onLog: (msg) => console.log('[Sheet]', msg),  // 内部日志
  
  // 单元格事件
  onCellClick: (e) => console.log('点击单元格：行' + (e.row + 1) + ', 列' + (e.col + 1)),
  onCellDoubleClick: (e) => console.log('双击单元格：行' + (e.row + 1) + ', 列' + (e.col + 1)),
  onEditStart: (e) => console.log('开始编辑：行' + (e.row + 1) + ', 列' + (e.col + 1)),
  onEditEnd: (e) => console.log('结束编辑：行' + (e.row + 1) + ', 列' + (e.col + 1) + ', 值：' + e.newValue),
  
  // 数据变更事件 - 每次单元格数据变化时触发
  onDataChange: (e) => {
    if (e.changes) {
      // 批量变更（如自动填充、粘贴）
      console.log('批量数据变更：' + e.changes.length + '个单元格');
    } else {
      // 单个变更
      console.log('数据变更：行' + (e.row + 1) + ', 列' + (e.col + 1) + ', 从 "' + e.oldValue + '" 变为 "' + e.newValue + '"');
    }
  },
  onRowInsert: (e) => console.log('插入行：位置' + (e.index + 1)),
  onRowDelete: (e) => console.log('删除行：位置' + (e.index + 1)),
  onRowReorder: (e) => console.log('行排序：从' + (e.fromIndex + 1) + '到' + (e.toIndex + 1)),
  onRowHide: (e) => console.log('隐藏行：行' + (e.index + 1)),
  onRowShow: (e) => console.log('显示行：行' + (e.index + 1)),
  
  // 列事件
  onColumnInsert: (e) => console.log('插入列：位置' + (e.index + 1)),
  onColumnDelete: (e) => console.log('删除列：位置' + (e.index + 1)),
  onColumnResize: (e) => console.log('列宽调整：列' + (e.column + 1) + ', ' + e.oldWidth + 'px → ' + e.newWidth + 'px'),
  onColumnReorder: (e) => console.log('列排序：从' + (e.fromIndex + 1) + '到' + (e.toIndex + 1)),
  onColumnHide: (e) => console.log('隐藏列：列' + (e.index + 1)),
  onColumnShow: (e) => console.log('显示列：列' + (e.index + 1)),
  
  // 选区事件
  onSelectionChange: (e) => console.log('选区变更：' + (e.ranges?.length || 0) + '个范围, ' + (e.cells?.length || 0) + '个单元格'),
  
  // 复制粘贴事件
  onCopy: (e) => console.log('复制：' + e.data.length + '个单元格'),
  onPaste: (e) => console.log('粘贴：' + e.data.length + '个单元格'),
  onCut: (e) => console.log('剪切：' + e.data.length + '个单元格'),
  
  // 排序事件
  onSortChange: (e) => console.log('排序变更：列' + (e.column + 1) + ', 方向：' + e.direction),
  
  // 筛选事件
  onFilterChange: (e) => console.log('筛选变更：' + e.filters.length + '个条件'),
  
  // 文件上传事件
  onFilePasteStart: (e) => console.log('开始上传' + e.files.length + '个文件到行' + (e.row + 1)),
  onFilePaste: (e) => console.log('文件上传成功：' + e.result.name),
  onFilePasteError: (e) => console.log('文件上传失败：' + e.file.name + ' - ' + e.error.message),
  
  // 配置变更事件
  onConfigChange: (e) => console.log('配置变更：' + e.type),
  
  // 验证事件
  onValidationError: (e) => console.log('验证错误：行' + (e.row + 1) + ', 列' + (e.col + 1) + ' - ' + e.message),
  
  // 历史事件
  onUndo: () => console.log('撤销操作'),
  onRedo: () => console.log('重做操作'),
};`;

// 代码版本号（每次修改 defaultEditorCode 时更新）
const CODE_VERSION = 'v8';

// 初始化编辑器代码
const initEditorCode = () => {
  const savedVersion = localStorage.getItem('simple-sheet-demo-code-version');
  const saved = localStorage.getItem('simple-sheet-demo-code-v3');
  
  // 如果版本不匹配或没有保存的代码，使用默认代码
  if (savedVersion !== CODE_VERSION || !saved) {
    editorCode.value = defaultEditorCode;
    localStorage.setItem('simple-sheet-demo-code-v3', defaultEditorCode);
    localStorage.setItem('simple-sheet-demo-code-version', CODE_VERSION);
  } else {
    editorCode.value = saved;
  }
};

// 应用代码
const applyCode = async () => {
  editorError.value = '';
  try {
    const code = editorCode.value;
    
    // 使用 Function 构造器执行代码
    const fn = new Function(`
      "use strict";
      ${code}
    `);
    
    // 执行代码并获取返回的配置
    const result = fn();
    
    if (!result || typeof result !== 'object') {
      throw new Error('代码必须返回一个配置对象');
    }
    
    // 验证必要的字段
    if (!result.columns || !Array.isArray(result.columns)) {
      throw new Error('配置对象必须包含 columns 数组');
    }
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error('配置对象必须包含 data 数组');
    }
    
    // 保存到 localStorage
    localStorage.setItem('simple-sheet-demo-code-v3', code);
    
    // 显示成功提示
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 2000);
    
    log('✅ 代码已应用，正在重新初始化表格...');
    
    // 保存当前配置
    currentConfig = result;
    
    // 重新初始化表格
    destroySheet();
    await initSheetWithConfig(result);
    
    // 应用主题
    if (result.theme) {
      currentTheme.value = result.theme;
    }
    
    log('✅ 表格重新初始化完成，共 ' + result.data.length + ' 行数据');
  } catch (err: any) {
    editorError.value = err.message || '代码执行出错';
    log(`❌ 代码执行错误: ${err.message}`);
  }
};

// 使用配置初始化表格（支持事件监听）
const initSheetWithConfig = async (config: any) => {
  await nextTick();
  if (!sheetContainer.value) return;

  // 创建表格实例
  sheet = new SimpleSheet(sheetContainer.value, config);

  // 更新统计
  const data = config.data || [];
  showStats.value = { total: data.length, filtered: data.length };

  // 添加验证规则（如果配置中有）
  if (config.validationRules) {
    Object.entries(config.validationRules).forEach(([key, rule]: [string, any]) => {
      sheet?.addValidationRule(key, rule);
    });
  }

  // 绑定事件监听
  bindEventListeners(config);

  log('表格初始化完成');
};

// 绑定事件监听器
const bindEventListeners = (config: any) => {
  if (!sheet) return;

  // 单元格事件
  if (config.onCellClick) {
    sheet.on('cell:click', (e) => {
      log(`点击单元格：行${e.row + 1}, 列${e.col + 1}`);
      config.onCellClick(e);
    });
  }
  if (config.onCellDoubleClick) {
    sheet.on('cell:dblclick', (e) => {
      log(`双击单元格：行${e.row + 1}, 列${e.col + 1}`);
      config.onCellDoubleClick(e);
    });
  }
  if (config.onEditStart) {
    sheet.on('edit:start', (e) => {
      log(`开始编辑：行${e.row + 1}, 列${e.col + 1}`);
      config.onEditStart(e);
    });
  }
  // 强制监听 edit:end 事件，使用正确的 newValue 属性
  sheet.on('edit:end', (e) => {
    log(`结束编辑：行${e.row + 1}, 列${e.col + 1}, 值：${e.newValue}`);
    // 如果配置中有 onEditEnd，也调用它（但可能使用错误的属性名）
    if (config.onEditEnd) {
      config.onEditEnd(e);
    }
  });

  // 数据变更事件 - 始终监听，实时打印所有数据变更
  sheet.on('data:change', (e) => {
    // 处理批量变更（changes数组）或单个变更（row/col属性）
    if (e.changes && Array.isArray(e.changes) && e.changes.length > 0) {
      // 批量变更（如自动填充、粘贴）
      e.changes.forEach((change: any) => {
        const row = change.row ?? 0;
        const col = change.col ?? 0;
        const oldValue = change.oldValue ?? '';
        const newValue = change.newValue ?? '';
        const colName = config.columns?.[col]?.title ?? `列${col + 1}`;
        log(`数据变更：行${row + 1} ${colName} "${oldValue}" → "${newValue}"`);
      });
    } else if (e.row !== undefined && e.col !== undefined) {
      // 单个变更
      const row = e.row;
      const col = e.col;
      const oldValue = e.oldValue ?? '';
      const newValue = e.newValue ?? '';
      const colName = config.columns?.[col]?.title ?? `列${col + 1}`;
      log(`数据变更：行${row + 1} ${colName} "${oldValue}" → "${newValue}"`);
    }
    config.onDataChange?.(e);
  });
  // 行插入删除事件 - 始终监听，不依赖配置
  sheet.on('row:insert', (e) => {
    log(`插入行：位置${e.index + 1}`);
    config.onRowInsert?.(e);
  });
  sheet.on('row:delete', (e) => {
    log(`删除行：位置${e.index + 1}`);
    config.onRowDelete?.(e);
  });
  if (config.onRowReorder) {
    sheet.on('row:reorder', (e) => {
      log(`行排序：从${e.fromIndex + 1}到${e.toIndex + 1}`);
      config.onRowReorder(e);
    });
  }

  // 列事件 - 始终监听，不依赖配置
  sheet.on('column:insert', (e) => {
    log(`插入列：位置${e.index + 1}`);
    config.onColumnInsert?.(e);
  });
  sheet.on('column:delete', (e) => {
    log(`删除列：位置${e.index + 1}`);
    config.onColumnDelete?.(e);
  });
  if (config.onColumnResize) {
    sheet.on('column:resize', (e) => {
      log(`列宽调整：列${e.index + 1}, ${e.oldWidth}px → ${e.newWidth}px`);
      config.onColumnResize(e);
    });
  }
  if (config.onColumnReorder) {
    sheet.on('column:reorder', (e) => {
      log(`列排序：从${e.fromIndex + 1}到${e.toIndex + 1}`);
      config.onColumnReorder(e);
    });
  }
  if (config.onColumnHide) {
    sheet.on('column:hide', (e) => {
      log(`隐藏列：列${e.index + 1}`);
      config.onColumnHide(e);
    });
  }
  if (config.onColumnShow) {
    sheet.on('column:show', (e) => {
      log(`显示列：列${e.index + 1}`);
      config.onColumnShow(e);
    });
  }

  // 选区事件
  if (config.onSelectionChange) {
    sheet.on('selection:change', (e) => {
      log(`选区变更：${e.ranges?.length || 0}个范围, ${e.cells?.length || 0}个单元格`);
      config.onSelectionChange(e);
    });
  }

  // 复制粘贴事件
  if (config.onCopy) {
    sheet.on('copy', (e) => {
      log(`复制：${e.data?.length || 0}个单元格`);
      config.onCopy(e);
    });
  }
  if (config.onPaste) {
    sheet.on('paste', (e) => {
      log(`粘贴：${e.data?.length || 0}个单元格`);
      config.onPaste(e);
    });
  }
  if (config.onCut) {
    sheet.on('cut', (e) => {
      log(`剪切：${e.data?.length || 0}个单元格`);
      config.onCut(e);
    });
  }

  // 历史事件
  if (config.onUndo) {
    sheet.on('undo', (e) => {
      log(`撤销操作`);
      config.onUndo(e);
    });
  }
  if (config.onRedo) {
    sheet.on('redo', (e) => {
      log(`重做操作`);
      config.onRedo(e);
    });
  }

  // 行隐藏/显示事件
  sheet.on('row:hide', (e) => {
    log(`隐藏行：行${e.index + 1}`);
  });
  sheet.on('row:show', (e) => {
    log(`显示行：行${e.index + 1}`);
  });

  // 排序事件
  if (config.onSortChange) {
    sheet.on('sort:change', (e) => {
      const direction = e.direction === 'asc' ? '升序' : (e.direction === 'desc' ? '降序' : '取消');
      log(`排序变更：列${e.column + 1}, 方向：${direction}`);
      config.onSortChange(e);
    });
  }

  // 筛选事件
  if (config.onFilterChange) {
    sheet.on('filter:change', (e) => {
      log(`筛选变更：${e.filters?.length || 0}个条件`);
      config.onFilterChange(e);
    });
  }

  // 文件上传事件
  if (config.onFilePasteStart) {
    sheet.on('file:paste:start', (e) => {
      log(`📤 开始上传${e.files?.length || 0}个文件到行${e.row + 1}`);
      config.onFilePasteStart(e);
    });
  }
  if (config.onFilePaste) {
    sheet.on('file:paste', (e) => {
      log(`✅ 文件上传成功：${e.result?.name || 'unknown'}`);
      config.onFilePaste(e);
    });
  }
  if (config.onFilePasteError) {
    sheet.on('file:paste:error', (e) => {
      log(`❌ 文件上传失败：${e.file?.name || 'unknown'} - ${e.error?.message || 'error'}`);
      config.onFilePasteError(e);
    });
  }

  // 配置变更事件
  if (config.onConfigChange) {
    sheet.on('config:change', (e) => {
      log(`配置变更：${e.type}`);
      config.onConfigChange(e);
    });
  }

  // 验证事件
  if (config.onValidationError) {
    sheet.on('validation:error', (e) => {
      log(`验证错误：行${e.row + 1}, 列${e.col + 1} - ${e.message}`);
      config.onValidationError(e);
    });
  }

  // 内部日志
  if (config.onLog) {
    sheet.on('log', (e) => {
      config.onLog(e);
    });
  }
};

// 重置代码
const resetCode = () => {
  editorCode.value = defaultEditorCode;
  if (monacoEditor) {
    monacoEditor.setValue(defaultEditorCode);
  }
  localStorage.removeItem('simple-sheet-demo-code-v3');
  localStorage.removeItem('simple-sheet-demo-code-version');
  currentConfig = null;
  log('🔄 代码已重置为默认');
};

// 复制编辑器代码
const copyEditorCode = async () => {
  try {
    await navigator.clipboard.writeText(editorCode.value);
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 2000);
  } catch {
    console.warn('复制失败');
  }
};

// 初始化 Monaco Editor
const initMonacoEditor = () => {
  if (!monacoEditorContainer.value || monacoEditor) return;
  
  monacoEditor = monaco.editor.create(monacoEditorContainer.value, {
    value: editorCode.value,
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 13,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    padding: { top: 16, bottom: 16 },
  });
  
  // 监听内容变化
  monacoEditor.onDidChangeModelContent(() => {
    editorCode.value = monacoEditor?.getValue() || '';
  });
};

// 销毁 Monaco Editor
const destroyMonacoEditor = () => {
  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
  }
};

// 监听编辑器显示状态
watch(showCodeEditor, (newValue) => {
  if (newValue) {
    nextTick(() => {
      initMonacoEditor();
    });
  } else {
    destroyMonacoEditor();
  }
});

const demoSourceCode = `<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { SimpleSheet } from '@n0ts123/simple-sheet';
import type { Column } from '@n0ts123/simple-sheet';
import '@n0ts123/simple-sheet/dist/simple-sheet.css';

const sheetContainer = ref<HTMLElement | null>(null);
let sheet: SimpleSheet | null = null;

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
  { key: 'id', title: 'ID', width: 60, type: 'number', readonly: true, sortable: true },
  {
    key: 'avatar',
    title: '头像',
    width: 80,
    type: 'file',
    fileUpload: {
      accept: ['image/*'],
      maxSize: 30 * 1024 * 1024,
    },
  },
  { key: 'name', title: '姓名', width: 100, sortable: true },
  { key: 'department', title: '部门', width: 110, type: 'select', options: departmentOptions, sortable: true },
  { key: 'status', title: '状态', width: 100, type: 'select', options: statusOptions },
  { key: 'email', title: '邮箱', width: 180, type: 'email' },
  { key: 'phone', title: '电话', width: 130, type: 'phone' },
  { key: 'age', title: '年龄', width: 80, type: 'number', sortable: true },
  { key: 'salary', title: '薪资', width: 120, type: 'number', sortable: true, numberPrefix: '¥', useThousandSeparator: true },
  { key: 'performance', title: '绩效', width: 80, type: 'number', sortable: true, decimalPlaces: 1 },
  { key: 'isFullTime', title: '全职', width: 70, type: 'boolean' },
  { key: 'joinDate', title: '入职日期', width: 120, type: 'date', dateFormat: 'YYYY-MM-DD' },
  { key: 'website', title: '个人主页', width: 160, type: 'link' },
  { key: 'tags', title: '标签', width: 180, type: 'select', options: tagOptions, multiple: true },
  { key: 'remark', title: '备注', width: 200, wrapText: 'ellipsis' },
]);

// 生成测试数据
const generateData = () => {
  const names = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵强', '黄丽', '周杰', '吴敏'];
  const deptValues = ['tech', 'product', 'design', 'market', 'operation'];
  const statusValues = ['active', 'probation', 'resigned', 'vacation'];
  const tagValues = ['core', 'tech_lead', 'newcomer', 'management', 'remote'];

  const data = [];
  for (let i = 0; i < 100; i++) {
    const numTags = 1 + Math.floor(Math.random() * 3);
    const shuffledTags = [...tagValues].sort(() => Math.random() - 0.5);
    const selectedTags = shuffledTags.slice(0, numTags);

    data.push({
      id: i + 1,
      name: names[i % names.length],
      department: deptValues[i % deptValues.length],
      status: statusValues[i % statusValues.length],
      email: 'user'+(i + 1)+'@example.com',
      phone: '138'+String(10000000 + Math.floor(Math.random() * 90000000)).slice(0, 8),
      age: 22 + Math.floor(Math.random() * 30),
      salary: Math.floor(8000 + Math.random() * 42000),
      performance: Number((3 + Math.random() * 2).toFixed(1)),
      isFullTime: Math.random() > 0.2,
      joinDate: '202'+Math.floor(Math.random() * 4)+'-'+String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')+'-'+String(1 + Math.floor(Math.random() * 28)).padStart(2, '0'),
      website: i % 3 === 0 ? 'https://github.com/user'+(i + 1) : '',
      tags: selectedTags,
      remark: '',
    });
  }
  return data;
};

const currentData = ref(generateData());

// 初始化表格
const initSheet = async () => {
  await nextTick();
  if (!sheetContainer.value) return;

  sheet = new SimpleSheet(sheetContainer.value, {
    columns: columns.value,
    data: currentData.value,
    rowHeight: 36,
    headerHeight: 40,
    theme: 'light',
    showRowNumber: true,
    allowInsertRow: true,
    allowDeleteRow: true,
    allowInsertColumn: true,
    allowDeleteColumn: true,
    allowMultiSelect: true,
    features: {
      columnReorder: true,
      rowReorder: true,
      columnResize: true,
      autoFill: true,
      sorter: true,
      filter: true,
      search: true,
      validator: true,
      filePaste: true,
    },
    contextMenuOptions: {
      showCopy: true,
      showPaste: true,
      showCut: true,
      showSelectAll: true,
      showInsertRowAbove: true,
      showInsertRowBelow: true,
      showDeleteRow: true,
      showClearRow: true,
      showInsertColumnLeft: true,
      showInsertColumnRight: true,
      showDeleteColumn: true,
      showClearColumn: true,
      showSortAsc: true,
      showSortDesc: true,
      showSortCancel: true,
      showFilter: true,
      showMergeCell: true,
      showUnmergeCell: true,
    },
  });

  // 添加验证规则
  sheet.addValidationRule('email', { type: 'email', message: '请输入有效的邮箱地址' });
  sheet.addValidationRule('age', { type: 'range', min: 18, max: 65, message: '年龄必须在 18-65 之间' });
  sheet.addValidationRule('performance', { type: 'range', min: 0, max: 5, message: '绩效必须在 0-5 之间' });

  // 事件监听
  sheet.on('cell:click', (e) => {
    console.log('点击单元格：行'+(e.row + 1)+', 列'+(e.col + 1));
  });
};

onMounted(() => {
  initSheet();
});

onUnmounted(() => {
  sheet?.destroy();
  sheet = null;
});
<` + `/script>

<template>
  <div ref="sheetContainer" class="sheet-container"></div>
</template>

<style scoped>
.sheet-container {
  height: 500px;
  width: 100%;
}
</style>`;

const copyDemoCode = async () => {
  try {
    await navigator.clipboard.writeText(demoSourceCode);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch {
    console.warn('复制失败');
  }
};

// 特性列表
const features = [
  { icon: '🚀', title: '虚拟滚动', desc: '轻松处理 10 万 + 数据' },
  { icon: '📝', title: '多种类型', desc: '文本/数字/日期/下拉/复选等' },
  { icon: '🎨', title: '主题切换', desc: '亮色/暗色主题' },
  { icon: '⌨️', title: '快捷键', desc: '完整键盘操作' },
  { icon: '📋', title: '复制粘贴', desc: '与 Excel 互通' },
  { icon: '✅', title: '数据验证', desc: '可视化错误提示' },
  { icon: '🔍', title: '搜索筛选', desc: '强大搜索筛选功能' },
  { icon: '📊', title: '条件格式', desc: '数据条/色阶/自定义' },
  { icon: '🔒', title: '冻结窗格', desc: '冻结行/列方便查看' },
  { icon: '📐', title: '列宽调整', desc: '拖拽调整列宽' },
  { icon: '🔄', title: '拖拽排序', desc: '行/列拖拽排序' },
  { icon: '📝', title: '自定义悬浮窗', desc: '支持多种内容类型' },
];

// 导航
const navItems = [
  { id: 'features', label: '特性' },
  { id: 'demo', label: '演示' },
  { id: 'code', label: '代码' },
];

// 跳转到文档页面
const goDocs = () => {
  emit('go-docs');
};

// 滚动到指定区块
const scrollToSection = (id: string) => {
  activeSection.value = id;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(() => {
  initSheet();
  initEditorCode();
});

onUnmounted(() => {
  destroySheet();
});
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
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="'#' + item.id"
          :class="{ active: activeSection === item.id }"
          @click.prevent="scrollToSection(item.id)"
        >
          {{ item.label }}
        </a>
        <button class="nav-btn nav-btn-docs" @click="goDocs">
          📖 文档
        </button>
        <a href="https://github.com/n0tssss/simple-sheet" target="_blank" class="nav-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <a href="https://www.npmjs.com/package/@n0ts123/simple-sheet" target="_blank" class="nav-btn nav-btn-primary">
          npm
        </a>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1>
          轻量级 <span class="highlight">Excel 风格</span> 表格框架
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
            <span class="stat-value">100K+</span>
            <span class="stat-label">行数据</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">30+</span>
            <span class="stat-label">功能特性</span>
          </div>
        </div>
        <div class="hero-install">
          <code>npm install @n0ts123/simple-sheet</code>
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
      <p class="section-desc">完整功能演示：编辑、选区、右键菜单、拖拽排序、搜索筛选、数据验证、撤销重做、复制粘贴</p>

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
          <button class="btn" @click="exportCSV">导出 CSV</button>
          <button class="btn" @click="exportJSON">导出 JSON</button>
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

      <!-- 主内容区 -->
      <div class="demo-main">
        <!-- 表格区域 -->
        <div class="sheet-wrapper">
          <div ref="sheetContainer" class="sheet-container"></div>
        </div>

        <!-- 日志面板 -->
        <div class="log-panel">
          <div class="log-header">
            <span>操作日志</span>
            <button class="btn btn-xs" @click="clearLog">清空</button>
          </div>
          <div class="log-content">
            <div v-for="(msg, i) in testLog" :key="i" class="log-item">{{ msg }}</div>
            <div v-if="testLog.length === 0" class="log-empty">暂无日志</div>
          </div>
        </div>
      </div>

      <div class="demo-tips">
        💡 提示：双击编辑 · Alt+Enter 换行 · 右键菜单 · 拖拽排序图标排序 · Ctrl+C/V 复制粘贴 · Ctrl+Z/Y 撤销重做
      </div>

      <!-- 代码编辑器 -->
      <div class="code-editor-toggle">
        <button class="btn code-editor-btn" @click="showCodeEditor = !showCodeEditor">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
          </svg>
          {{ showCodeEditor ? '收起代码编辑器' : '✏️ 实时编辑代码' }}
        </button>
      </div>

      <div v-if="showCodeEditor" class="code-editor-panel">
        <div class="code-editor-header">
          <div class="code-editor-title">
            <span>📝 实时代码编辑器</span>
            <span class="code-editor-subtitle">编辑完整的表格配置，点击"应用代码"实时预览</span>
          </div>
          <div class="code-editor-actions">
            <button class="btn btn-sm" @click="copyEditorCode">
              📋 复制
            </button>
            <button class="btn btn-sm" @click="resetCode">
              🔄 重置
            </button>
            <button class="btn btn-primary btn-sm" @click="applyCode">
              {{ saveSuccess ? '✓ 已应用' : '▶️ 应用代码' }}
            </button>
          </div>
        </div>
        <div v-if="editorError" class="code-editor-error">
          ❌ {{ editorError }}
        </div>
        <div class="code-editor-content">
          <div ref="monacoEditorContainer" class="monaco-editor-wrapper"></div>
        </div>
        <div class="code-editor-footer">
          <div class="code-editor-hints">
            <span class="hint">💡 代码必须返回一个包含 columns 和 data 的配置对象</span>
            <span class="hint">📝 支持所有 SimpleSheet 配置项：theme, rowHeight, features, contextMenuOptions 等</span>
            <span class="hint">🎨 支持完整的事件监听：onCellClick, onDataChange, onSortChange 等</span>
            <span class="hint">📊 事件会自动输出到右侧操作日志面板</span>
          </div>
        </div>
      </div>

      <!-- 查看源码 -->
      <div class="source-code-toggle">
        <button class="btn source-code-btn" @click="showSourceCode = !showSourceCode">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
          </svg>
          {{ showSourceCode ? '收起源码' : '查看源码' }}
        </button>
      </div>

      <div v-if="showSourceCode" class="source-code-panel">
        <div class="code-block">
          <button class="copy-btn" @click="copyDemoCode">
            {{ copySuccess ? '✓ 已复制' : '📋 复制' }}
          </button>
          <pre><code>{{ demoSourceCode }}</code></pre>
        </div>
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
              <code>npm install @n0ts123/simple-sheet</code>
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
}

.nav-links a {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
  cursor: pointer;
}

.nav-links a:hover,
.nav-links a.active {
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

.dark .nav-btn:hover {
  background: #334155;
}

.nav-btn-primary {
  background: #3b82f6;
  color: white !important;
}

.nav-btn-primary:hover {
  background: #2563eb;
}

.nav-btn-docs {
  background: #10b981;
  color: white !important;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.nav-btn-docs:hover {
  background: #059669;
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
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
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

.btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-icon {
  padding: 8px 10px;
}

.search-info {
  font-size: 12px;
  color: #64748b;
}

/* 主内容区 */
.demo-main {
  display: flex;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.sheet-wrapper {
  flex: 1;
  background: #ffffff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dark .sheet-wrapper {
  background: #0f172a;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.sheet-container {
  height: 500px;
}

/* 日志面板 */
.log-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dark .log-panel {
  background: #0f172a;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 500;
  font-size: 13px;
}

.dark .log-header {
  background: #1e293b;
  border-color: #334155;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 500px;
}

.log-item {
  padding: 6px 10px;
  font-size: 11px;
  font-family: monospace;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
  word-break: break-all;
}

.dark .log-item {
  color: #bbb;
  border-color: #1e293b;
}

.log-empty {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 12px;
}

.btn-xs {
  padding: 2px 8px;
  font-size: 11px;
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

/* 代码编辑器 */
.code-editor-toggle {
  max-width: 1400px;
  margin: 24px auto 0;
  text-align: center;
}

.code-editor-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.code-editor-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.code-editor-panel {
  max-width: 1400px;
  margin: 16px auto 0;
  animation: slideDown 0.3s ease;
  background: #1e293b;
  border-radius: 12px;
  overflow: hidden;
}

.code-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.code-editor-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.code-editor-title span:first-child {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.code-editor-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.code-editor-actions {
  display: flex;
  gap: 8px;
}

.code-editor-error {
  padding: 12px 20px;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  color: #dc2626;
  font-size: 13px;
  font-family: monospace;
}

.dark .code-editor-error {
  background: #450a0a;
  color: #fca5a5;
}

.code-editor-content {
  padding: 0;
}

/* Monaco Editor 容器样式 */
.monaco-editor-wrapper {
  width: 100%;
  min-height: 500px;
  max-height: 700px;
  overflow: hidden;
}

.monaco-editor-wrapper :deep(.monaco-editor) {
  border-radius: 0 !important;
}

.code-editor-footer {
  padding: 12px 20px;
  background: #0f172a;
  border-top: 1px solid #334155;
}

.code-editor-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.code-editor-hints .hint {
  font-size: 12px;
  color: #94a3b8;
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

/* 查看源码 */
.source-code-toggle {
  max-width: 1400px;
  margin: 16px auto 0;
  text-align: center;
}

.source-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.source-code-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.dark .source-code-btn {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

.dark .source-code-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

.source-code-panel {
  max-width: 1400px;
  margin: 16px auto 0;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.source-code-panel .code-block {
  background: #1e293b;
  border-radius: 12px;
  padding: 20px;
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
}

.source-code-panel .code-block pre {
  margin: 0;
  padding-right: 10px;
}

.source-code-panel .code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #e2e8f0;
  white-space: pre;
}

.source-code-panel .copy-btn {
  position: sticky;
  top: 0;
  float: right;
  margin-bottom: 12px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.source-code-panel .copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .demo-main {
    flex-direction: column;
  }

  .log-panel {
    width: 100%;
    max-height: 200px;
  }
}

@media (max-width: 768px) {
  .navbar {
    padding: 12px 16px;
  }

  .nav-links {
    gap: 12px;
  }

  .nav-links a:not(.nav-btn) {
    display: none;
  }

  .nav-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .hero {
    padding: 60px 16px 40px;
  }

  .hero h1 {
    font-size: 28px;
  }

  .hero-desc {
    font-size: 15px;
  }

  .hero-stats {
    gap: 20px;
    flex-wrap: wrap;
  }

  .stat-value {
    font-size: 22px;
  }

  .hero-install {
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    width: 100%;
  }

  .hero-install code {
    font-size: 13px;
    word-break: break-all;
  }

  .features-section,
  .demo-section,
  .code-section {
    padding: 48px 16px;
  }

  .section-title {
    font-size: 24px;
  }

  .section-desc {
    font-size: 14px;
    padding: 0 16px;
  }

  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }

  .feature-card {
    padding: 20px 16px;
  }

  .feature-icon {
    font-size: 28px;
  }

  .demo-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }

  .toolbar-group {
    flex-wrap: wrap;
  }

  .input-field {
    flex: 1;
    min-width: 120px;
  }

  .toolbar-stats {
    margin-left: 0;
    text-align: center;
  }

  .sheet-container {
    height: 400px;
  }

  .log-panel {
    display: none;
  }

  .code-step {
    flex-direction: column;
  }

  .step-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .code-block {
    padding: 12px;
  }

  .code-block code {
    font-size: 12px;
  }

  .code-editor-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .code-editor-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .monaco-editor-wrapper {
    min-height: 300px;
  }
}

@media (max-width: 480px) {
  .hero h1 {
    font-size: 24px;
  }

  .hero-stats {
    gap: 16px;
  }

  .stat-item {
    flex: 0 0 45%;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 12px;
  }

  .features-section,
  .demo-section,
  .code-section {
    padding: 32px 12px;
  }

  .section-title {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .feature-card {
    padding: 16px 12px;
  }

  .feature-card h3 {
    font-size: 14px;
  }

  .feature-card p {
    font-size: 12px;
  }

  .sheet-container {
    height: 350px;
  }
}
</style>
