# @n0ts123/simple-sheet

轻量级、零依赖的 Excel 风格表格框架。

## ✨ 特性

- 🚀 **轻量零依赖** - 纯 TypeScript 实现，无任何外部依赖
- 📦 **虚拟滚动** - 支持百万级数据量，只渲染可视区域
- 🎨 **主题支持** - 内置明暗主题，支持跟随系统自动切换
- ⌨️ **键盘操作** - 完整的键盘快捷键支持，Excel 风格体验
- 📋 **复制粘贴** - 支持与 Excel 互相复制粘贴
- ↩️ **撤销重做** - 完整的历史记录管理
- 🔧 **可扩展** - 支持自定义渲染器和编辑器
- 💪 **TypeScript** - 完整的类型定义
- 🔍 **搜索替换** - 支持正则表达式、全字匹配
- 📊 **排序筛选** - 多列排序、多条件筛选
- 🎯 **数据验证** - 多种内置规则、自定义验证
- 🔀 **单元格合并** - 支持合并/拆分单元格
- 🧊 **冻结窗格** - 冻结行/列
- 🎨 **条件格式** - 数据条、色阶、自定义规则
- 📝 **右键菜单** - 可自定义菜单项

## 📦 安装

```bash
# npm
npm install @n0ts123/simple-sheet

# yarn
yarn add @n0ts123/simple-sheet

# pnpm
pnpm add @n0ts123/simple-sheet
```

## 🚀 快速开始

### ES Module

```typescript
import { SimpleSheet } from '@n0ts123/simple-sheet';
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
});
```

### UMD (浏览器直接使用)

```html
<link rel="stylesheet" href="simple-sheet.css">
<script src="simple-sheet.umd.js"></script>

<script>
  const sheet = new SimpleSheet.SimpleSheet('#container', {
    columns: [...],
    data: [...]
  });
</script>
```

## 📖 配置选项

```typescript
interface SheetOptions {
  // 列定义（必填）
  columns: Column[];
  
  // 初始数据
  data?: RowData[];
  
  // 行高（默认 32）
  rowHeight?: number;
  
  // 表头高度（默认 36）
  headerHeight?: number;
  
  // 全局只读（默认 false）
  readonly?: boolean;
  
  // 允许多选（默认 true）
  allowMultiSelect?: boolean;
  
  // 显示行号（默认 true）
  showRowNumber?: boolean;
  
  // 主题：'light' | 'dark' | 'auto'（默认 'auto'）
  theme?: Theme;
  
  // 最大撤销步数（默认 100）
  maxHistorySize?: number;
}
```

### 列定义

```typescript
interface Column {
  // 列标识键（对应数据中的字段名）
  key: string;
  
  // 列标题
  title: string;
  
  // 列宽度（默认 100）
  width?: number;
  
  // 列类型：'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom'
  type?: ColumnType;
  
  // 是否只读
  readonly?: boolean;
  
  // 对齐方式：'left' | 'center' | 'right'
  align?: string;
  
  // 自定义渲染器
  renderer?: CellRendererClass;
  
  // 自定义编辑器
  editor?: CellEditorClass;
  
  // 格式化函数
  formatter?: (value: any, rowData: RowData, column: Column) => string;
}
```

## 🔧 API

### 数据操作

```typescript
// 加载数据
sheet.loadData(data);

// 获取所有数据
const data = sheet.getData();

// 获取/设置单元格值
const value = sheet.getCellValue(row, col);
sheet.setCellValue(row, col, value);

// 批量设置值
sheet.setRangeValues(startRow, startCol, values);

// 获取/设置行数据
const rowData = sheet.getRowData(index);
sheet.setRowData(index, data);

// 插入/删除行
sheet.insertRow(index, data);
sheet.deleteRow(index);
```

### 选区操作

```typescript
// 获取选区
const selection = sheet.getSelection();

// 设置选区
sheet.setSelection(startRow, startCol, endRow, endCol);

// 清除选区
sheet.clearSelection();

// 获取选中的数据
const selectedData = sheet.getSelectedData();
```

### 历史记录

```typescript
// 撤销
sheet.undo();

// 重做
sheet.redo();

// 清除历史
sheet.clearHistory();
```

### 导入导出

```typescript
// 导出 CSV
const csv = sheet.exportCSV();

// 导入 CSV
sheet.importCSV(csvString);
```

### 其他

```typescript
// 滚动到单元格
sheet.scrollToCell(row, col);

// 刷新表格
sheet.refresh();

// 设置主题
sheet.setTheme('dark');

// 销毁实例
sheet.destroy();
```

## 📡 事件

```typescript
// 单元格点击
sheet.on('cell:click', (e) => {
  console.log(e.row, e.col, e.value);
});

// 单元格双击
sheet.on('cell:dblclick', (e) => {});

// 数据变更
sheet.on('data:change', (e) => {
  console.log('变更:', e.changes);
});

// 选区变更
sheet.on('selection:change', (e) => {
  console.log('选中单元格:', e.cells);
});

// 编辑开始/结束
sheet.on('edit:start', (e) => {});
sheet.on('edit:end', (e) => {});

// 行插入/删除
sheet.on('row:insert', (e) => {});
sheet.on('row:delete', (e) => {});

// 复制/粘贴
sheet.on('copy', (e) => {});
sheet.on('paste', (e) => {});
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `↑↓←→` | 导航单元格 |
| `Enter` | 开始编辑 / 确认编辑 |
| `Tab` | 移动到下一个单元格 |
| `Shift+Tab` | 移动到上一个单元格 |
| `Escape` | 取消编辑 |
| `Delete` | 清除单元格内容 |
| `Ctrl+C` | 复制 |
| `Ctrl+X` | 剪切 |
| `Ctrl+V` | 粘贴 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+A` | 全选 |
| `Shift+点击` | 范围选择 |
| `Ctrl+点击` | 多选 |
| `Home` | 移动到行首 |
| `End` | 移动到行尾 |
| `Ctrl+Home` | 移动到表格开头 |
| `Ctrl+End` | 移动到表格结尾 |

## 🎨 主题定制

通过 CSS 变量自定义主题：

```css
:root {
  --ss-primary-color: #3b82f6;
  --ss-bg-color: #ffffff;
  --ss-text-color: #1f2937;
  --ss-border-color: #e5e7eb;
  --ss-header-bg: #f3f4f6;
  --ss-selection-bg: rgba(59, 130, 246, 0.08);
  --ss-selection-border: #3b82f6;
  /* ... 更多变量 */
}
```

## 🔌 自定义渲染器

```typescript
import { BaseRenderer } from '@n0ts123/simple-sheet';

class ButtonRenderer extends BaseRenderer {
  render(cell, value, rowData, column) {
    const button = document.createElement('button');
    button.textContent = '编辑';
    button.onclick = () => console.log('点击了', rowData);
    cell.appendChild(button);
  }
}

const sheet = new SimpleSheet('#container', {
  columns: [
    { key: 'action', title: '操作', renderer: ButtonRenderer },
  ],
});
```

## 🔌 自定义编辑器

```typescript
import { BaseEditor } from '@n0ts123/simple-sheet';

class ColorEditor extends BaseEditor {
  private input: HTMLInputElement | null = null;

  protected createElement() {
    const wrapper = this.createWrapper();
    this.input = document.createElement('input');
    this.input.type = 'color';
    wrapper.appendChild(this.input);
    return wrapper;
  }

  protected setValue(value) {
    if (this.input) this.input.value = value || '#000000';
  }

  getValue() {
    return this.input?.value;
  }

  focus() {
    this.input?.focus();
  }
}
```

## 🔌 插件系统

SimpleSheet 提供丰富的插件来扩展功能：

### 数据验证

```typescript
import { Validator, ValidationRules } from '@n0ts123/simple-sheet';

const validator = new Validator();

// 添加验证规则
validator.addValidation('email', [
  ValidationRules.required('邮箱不能为空'),
  ValidationRules.email('请输入有效的邮箱'),
]);

validator.addValidation('age', [
  ValidationRules.number('请输入数字'),
  ValidationRules.range(0, 150, '年龄必须在 0-150 之间'),
]);

// 验证单元格
const error = validator.validateCell(row, col, value, rowData, column);
```

### 排序

```typescript
import { Sorter } from '@n0ts123/simple-sheet';

const sorter = new Sorter({ multiSort: true });
sorter.setColumns(columns);
sorter.setData(data);

// 切换排序
sorter.toggleSort(columnIndex);

// 监听排序变化
sorter.on('sort:change', ({ configs, data }) => {
  // 更新表格数据
});
```

### 筛选

```typescript
import { Filter, FilterConditions } from '@n0ts123/simple-sheet';

const filter = new Filter();
filter.setColumns(columns);
filter.setData(data);

// 添加筛选条件
filter.addCondition(FilterConditions.contains('name', '张'));
filter.addCondition(FilterConditions.greaterThan('age', 18));
filter.addCondition(FilterConditions.between('price', 10, 100));

// 获取筛选结果
const filtered = filter.getData();
```

### 搜索替换

```typescript
import { Search } from '@n0ts123/simple-sheet';

const search = new Search();
search.setData(data, columns);

// 搜索
const results = search.search('关键词', {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
});

// 导航结果
search.next();
search.prev();

// 替换
search.replaceCurrent('新值', setCellValue);
search.replaceAll('新值', setCellValue);
```

### 单元格合并

```typescript
import { MergeCell } from '@n0ts123/simple-sheet';

const merger = new MergeCell();

// 合并单元格
merger.merge({ 
  start: { row: 0, col: 0 }, 
  end: { row: 2, col: 2 } 
});

// 取消合并
merger.unmerge(0, 0);

// 获取合并信息
const info = merger.getMergeInfo(row, col);
```

### 冻结窗格

```typescript
import { FreezePane } from '@n0ts123/simple-sheet';

const freezer = new FreezePane(options);

// 冻结首行首列
freezer.freezeFirstRowAndColumn();

// 自定义冻结
freezer.freeze(2, 1); // 冻结前2行和第1列

// 取消冻结
freezer.unfreeze();
```

### 条件格式

```typescript
import { ConditionalFormat, ConditionalFormatRules } from '@n0ts123/simple-sheet';

const cf = new ConditionalFormat();
cf.setData(data, columns);

// 高亮大于 80 的单元格
cf.addRule(ConditionalFormatRules.greaterThan(
  ['score'], 
  80, 
  { backgroundColor: '#dcfce7', color: '#15803d' }
));

// 数据条
cf.addRule(ConditionalFormatRules.dataBar(['progress'], '#3b82f6'));

// 色阶
cf.addRule(ConditionalFormatRules.colorScale(
  ['temperature'], 
  '#3b82f6',  // 最小值颜色
  '#ef4444'   // 最大值颜色
));

// 获取单元格样式
const style = cf.getCellStyle(row, col);
```

### 右键菜单

```typescript
import { ContextMenu, createDefaultMenuItems } from '@n0ts123/simple-sheet';

const menu = new ContextMenu({
  items: createDefaultMenuItems({
    onCopy: () => sheet.copy(),
    onPaste: () => sheet.paste(),
    onInsertRowAbove: () => sheet.insertRow(row),
    // ...
  }),
});

menu.mount(container);
```

## 🎨 内置渲染器

| 渲染器 | 说明 |
|--------|------|
| `TextRenderer` | 文本（默认） |
| `NumberRenderer` | 数字 |
| `DateRenderer` | 日期 |
| `LinkRenderer` | 链接 |
| `ImageRenderer` | 图片 |
| `TagRenderer` | 标签 |
| `ProgressRenderer` | 进度条 |
| `RatingRenderer` | 评分 |
| `CheckboxRenderer` | 复选框 |

## 🎨 内置编辑器

| 编辑器 | 说明 |
|--------|------|
| `TextEditor` | 文本输入 |
| `NumberEditor` | 数字输入 |
| `DateEditor` | 日期选择 |
| `SelectEditor` | 下拉选择 |

## 📄 License

MIT

