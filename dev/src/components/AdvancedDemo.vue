<template>
  <div class="advanced-demo">
    <div class="demo-header">
      <h1>SimpleSheet 高级功能演示</h1>
      <p class="subtitle">展示排序、筛选、搜索、条件格式等高级功能</p>
    </div>

    <div class="toolbar">
      <!-- 搜索框 -->
      <div class="search-box">
        <input 
          v-model="searchKeyword" 
          placeholder="搜索..." 
          @keyup.enter="doSearch"
        />
        <button @click="doSearch">搜索</button>
        <button @click="searchPrev" :disabled="searchResults.length === 0">上一个</button>
        <button @click="searchNext" :disabled="searchResults.length === 0">下一个</button>
        <span v-if="searchResults.length > 0" class="search-info">
          {{ currentSearchIndex + 1 }} / {{ searchResults.length }}
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button @click="toggleSort" title="切换排序">
          排序: {{ sortState }}
        </button>
        <button @click="showFilterPanel = !showFilterPanel">
          筛选
        </button>
        <button @click="clearFilters">清除筛选</button>
      </div>
    </div>

    <!-- 筛选面板 -->
    <div v-if="showFilterPanel" class="filter-panel">
      <div class="filter-item">
        <label>部门:</label>
        <select v-model="filterDept" @change="applyFilters">
          <option value="">全部</option>
          <option value="技术部">技术部</option>
          <option value="产品部">产品部</option>
          <option value="市场部">市场部</option>
          <option value="人事部">人事部</option>
        </select>
      </div>
      <div class="filter-item">
        <label>工资范围:</label>
        <input type="number" v-model.number="salaryMin" placeholder="最小" @input="applyFilters" />
        <span>-</span>
        <input type="number" v-model.number="salaryMax" placeholder="最大" @input="applyFilters" />
      </div>
      <div class="filter-item">
        <label>绩效评分 &gt;</label>
        <input type="number" v-model.number="ratingMin" placeholder="最小评分" @input="applyFilters" />
      </div>
    </div>

    <!-- 条件格式说明 -->
    <div class="cf-legend">
      <span class="cf-item high">
        <span class="cf-color" style="background: #dcfce7"></span>
        绩效 ≥ 4.5
      </span>
      <span class="cf-item low">
        <span class="cf-color" style="background: #fef2f2"></span>
        绩效 &lt; 3.0
      </span>
      <span class="cf-item bar">
        <span class="cf-color" style="background: linear-gradient(90deg, #3b82f6 60%, transparent 60%)"></span>
        工资数据条
      </span>
    </div>

    <div ref="sheetContainer" class="sheet-container"></div>

    <div class="stats">
      <span>总计: {{ totalRows }} 行</span>
      <span>显示: {{ filteredRows }} 行</span>
      <span v-if="validationErrors.length > 0" class="error">
        验证错误: {{ validationErrors.length }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { 
  SimpleSheet, 
  Sorter, 
  Filter, 
  FilterConditions,
  Search,
  Validator,
  ValidationRules,
  ConditionalFormat,
  ConditionalFormatRules,
} from '../../../src';
import '../../../src/styles/index.css';

// Refs
const sheetContainer = ref<HTMLElement | null>(null);
let sheet: SimpleSheet | null = null;
let sorter: Sorter | null = null;
let filter: Filter | null = null;
let search: Search | null = null;
let validator: Validator | null = null;
let cf: ConditionalFormat | null = null;

// 搜索状态
const searchKeyword = ref('');
const searchResults = ref<any[]>([]);
const currentSearchIndex = ref(-1);

// 筛选状态
const showFilterPanel = ref(false);
const filterDept = ref('');
const salaryMin = ref<number | undefined>(undefined);
const salaryMax = ref<number | undefined>(undefined);
const ratingMin = ref<number | undefined>(undefined);

// 排序状态
const sortState = ref<string>('无');

// 统计
const totalRows = ref(0);
const filteredRows = ref(0);
const validationErrors = ref<any[]>([]);

// 测试数据
const departments = ['技术部', '产品部', '市场部', '人事部'];
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二'];

const generateData = (count: number) => {
  const data: any[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: i + 1,
      name: names[i % names.length] + (Math.floor(i / names.length) || ''),
      department: departments[i % departments.length],
      salary: Math.floor(8000 + Math.random() * 42000),
      rating: Number((2 + Math.random() * 3).toFixed(1)),
      joinDate: new Date(2018 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)).toISOString().split('T')[0],
      email: `user${i + 1}@company.com`,
    });
  }
  return data;
};

const columns = [
  { key: 'id', title: 'ID', width: 60, editable: false },
  { key: 'name', title: '姓名', width: 100 },
  { key: 'department', title: '部门', width: 100 },
  { key: 'salary', title: '工资', width: 120, type: 'number' as const },
  { key: 'rating', title: '绩效评分', width: 100, type: 'number' as const },
  { key: 'joinDate', title: '入职日期', width: 120 },
  { key: 'email', title: '邮箱', width: 200 },
];

let originalData = generateData(100);
let currentData = [...originalData];

// 方法
const doSearch = () => {
  if (!search) return;
  
  const results = search.search(searchKeyword.value, {
    caseSensitive: false,
  });
  searchResults.value = results;
  currentSearchIndex.value = results.length > 0 ? 0 : -1;
  
  if (results.length > 0) {
    highlightSearchResult(results[0]);
  }
};

const searchNext = () => {
  if (!search) return;
  const result = search.next();
  if (result) {
    currentSearchIndex.value = search.getCurrentIndex();
    highlightSearchResult(result);
  }
};

const searchPrev = () => {
  if (!search) return;
  const result = search.prev();
  if (result) {
    currentSearchIndex.value = search.getCurrentIndex();
    highlightSearchResult(result);
  }
};

const highlightSearchResult = (result: any) => {
  if (!sheet) return;
  sheet.setSelection({
    start: { row: result.row, col: result.col },
    end: { row: result.row, col: result.col },
  });
  sheet.scrollToCell(result.row, result.col);
};

const toggleSort = () => {
  if (!sorter) return;
  
  // 切换工资列排序
  sorter.toggleSort(3);
  
  const configs = sorter.getSortConfigs();
  if (configs.length === 0) {
    sortState.value = '无';
  } else {
    sortState.value = configs[0].direction === 'asc' ? '工资升序' : '工资降序';
  }
};

const applyFilters = () => {
  if (!filter) return;

  const conditions: any[] = [];

  if (filterDept.value) {
    conditions.push(FilterConditions.equals('department', filterDept.value));
  }

  if (salaryMin.value !== undefined && salaryMax.value !== undefined) {
    conditions.push(FilterConditions.between('salary', salaryMin.value, salaryMax.value));
  } else if (salaryMin.value !== undefined) {
    conditions.push(FilterConditions.greaterThan('salary', salaryMin.value));
  } else if (salaryMax.value !== undefined) {
    conditions.push(FilterConditions.lessThan('salary', salaryMax.value));
  }

  if (ratingMin.value !== undefined) {
    conditions.push(FilterConditions.greaterThan('rating', ratingMin.value));
  }

  filter.setConditions(conditions);
};

const clearFilters = () => {
  filterDept.value = '';
  salaryMin.value = undefined;
  salaryMax.value = undefined;
  ratingMin.value = undefined;
  filter?.clearFilter();
};

onMounted(() => {
  if (!sheetContainer.value) return;

  // 创建表格
  sheet = new SimpleSheet(sheetContainer.value, {
    columns,
    data: currentData,
    rowHeight: 36,
    headerHeight: 40,
    theme: 'auto',
  });

  totalRows.value = currentData.length;
  filteredRows.value = currentData.length;

  // 初始化排序器
  sorter = new Sorter();
  sorter.setColumns(columns);
  sorter.setData(currentData);
  sorter.on('sort:change', ({ data }) => {
    currentData = data;
    sheet?.setData(data);
    filter?.setData(data);
    search?.setData(data, columns);
  });

  // 初始化筛选器
  filter = new Filter();
  filter.setColumns(columns);
  filter.setData(currentData);
  filter.on('filter:change', ({ data }) => {
    sheet?.setData(data);
    filteredRows.value = data.length;
    search?.setData(data, columns);
  });

  // 初始化搜索
  search = new Search();
  search.setData(currentData, columns);

  // 初始化验证器
  validator = new Validator();
  validator.addValidation('email', [
    ValidationRules.required('邮箱不能为空'),
    ValidationRules.email('请输入有效的邮箱'),
  ]);
  validator.addValidation('salary', [
    ValidationRules.required('工资不能为空'),
    ValidationRules.range(5000, 100000, '工资必须在5000-100000之间'),
  ]);

  // 初始化条件格式
  cf = new ConditionalFormat();
  cf.setData(currentData, columns);

  // 添加条件格式规则
  cf.addRule(ConditionalFormatRules.greaterThan(
    ['rating', 4],
    4.5,
    { backgroundColor: '#dcfce7', color: '#15803d' }
  ));

  cf.addRule(ConditionalFormatRules.lessThan(
    ['rating', 4],
    3.0,
    { backgroundColor: '#fef2f2', color: '#dc2626' }
  ));

  // 监听单元格变化进行验证
  sheet.on('cell:change', ({ row, col, value, rowData }) => {
    const column = columns[col];
    const error = validator?.validateCell(row, col, value, rowData, column);
    if (error) {
      console.warn(`验证错误 [${row}, ${col}]:`, error);
    }
    validationErrors.value = validator?.getAllErrors() || [];
  });
});

onUnmounted(() => {
  sheet?.destroy();
});
</script>

<style scoped>
.advanced-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
  background: var(--ss-bg-color, #fff);
  color: var(--ss-text-color, #1f2937);
}

.demo-header {
  text-align: center;
}

.demo-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  width: 200px;
  font-size: 14px;
}

.search-info {
  font-size: 13px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

button:hover {
  background: #2563eb;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.filter-panel {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
}

.filter-item input,
.filter-item select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
}

.filter-item input {
  width: 80px;
}

.cf-legend {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #6b7280;
}

.cf-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cf-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
}

.sheet-container {
  flex: 1;
  min-height: 400px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #6b7280;
}

.stats .error {
  color: #dc2626;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .advanced-demo {
    background: #1f2937;
    color: #f9fafb;
  }

  .subtitle,
  .search-info,
  .stats,
  .cf-legend {
    color: #9ca3af;
  }

  .search-box input,
  .filter-item input,
  .filter-item select {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .filter-panel {
    background: #374151;
  }

  .filter-item label {
    color: #d1d5db;
  }

  .sheet-container {
    border-color: #374151;
  }
}
</style>

