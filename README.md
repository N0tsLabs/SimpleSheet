# @n0ts123/simple-sheet

轻量级、零依赖的 Excel 风格表格框架。

## 特性

- **轻量零依赖** - 纯 TypeScript 实现，无任何外部依赖
- **虚拟滚动** - 支持百万级数据量，只渲染可视区域
- **主题支持** - 内置明暗主题，支持跟随系统自动切换
- **键盘操作** - 完整的键盘快捷键支持，Excel 风格体验
- **复制粘贴** - 支持与 Excel 互相复制粘贴
- **撤销重做** - 完整的历史记录管理
- **可扩展** - 支持自定义渲染器和编辑器
- **TypeScript** - 完整的类型定义
- **搜索替换** - 支持正则表达式、全字匹配
- **排序功能** - 表头点击排序，支持本地/远程排序
- **数据验证** - 多种内置规则、自定义验证
- **单元格合并** - 支持合并/拆分单元格
- **冻结窗格** - 冻结行/列
- **条件格式** - 数据条、色阶、自定义规则
- **右键菜单** - 可自定义菜单项、列级控制
- **行/列拖拽** - 支持行顺序调整和列顺序调整
- **多值编辑** - 支持邮箱、手机号、链接等字段的多值编辑
- **文件粘贴** - 支持直接粘贴图片文件
- **自动填充** - 支持拖拽填充数据

## 安装

```bash
# npm
npm install @n0ts123/simple-sheet

# yarn
yarn add @n0ts123/simple-sheet

# pnpm
pnpm add @n0ts123/simple-sheet
```

## 快速开始

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

## 文档

详细使用教程请查看：[docs/GUIDE.md](docs/GUIDE.md)

包含：
- 完整的配置选项说明
- 列定义详解
- 数据和选区操作
- 事件系统
- 主题定制
- 内置渲染器和编辑器
- 插件系统（验证、排序、筛选、搜索、合并、冻结、条件格式等）
- 快捷键参考
- 常见问题

## 核心配置

### SheetOptions

```typescript
interface SheetOptions {
  columns: Column[];           // 列定义（必填）
  data?: RowData[];           // 初始数据
  rowHeight?: number;          // 行高（默认 32）
  headerHeight?: number;       // 表头高度（默认 36）
  readonly?: boolean;          // 全局只读（默认 false）
  allowMultiSelect?: boolean;  // 允许多选（默认 true）
  showRowNumber?: boolean;     // 显示行号（默认 true）
  showCheckbox?: boolean;      // 显示复选框列（默认 false）
  theme?: 'light' | 'dark' | 'auto';  // 主题（默认 'auto'）
  rowNumberWidth?: number;     // 行号列宽度（默认 50）
  maxHistorySize?: number;     // 最大撤销步数（默认 100）

  // ===== 操作权限配置 =====
  allowInsertRow?: boolean;    // 允许插入行（默认 true）
  allowDeleteRow?: boolean;    // 允许删除行（默认 true）
  allowInsertColumn?: boolean;  // 允许插入列（默认 true）
  allowDeleteColumn?: boolean; // 允许删除列（默认 true）

  // ===== 右键菜单配置 =====
  enableContextMenu?: boolean;                    // 启用右键菜单（默认 true）
  contextMenuOptions?: ContextMenuOptions;         // 右键菜单功能配置

  // ===== 提示消息配置 =====
  toastMessages?: {
    readonlyCellEdit?: string;   // 只读单元格双击提示
    copySuccess?: string;         // 复制成功提示
    pasteSuccess?: string;        // 粘贴成功提示
    pasteFailed?: string;         // 粘贴失败提示
  };
}
```

### Column

```typescript
interface Column {
  key: string;              // 列标识键（必填）
  title: string;            // 列标题（必填）
  width?: number;            // 列宽度（默认 100）
  minWidth?: number;         // 最小宽度
  maxWidth?: number;         // 最大宽度
  type?: ColumnType;        // 列类型
  readonly?: boolean;        // 是否只读（默认 false）
  editable?: boolean;        // 是否可编辑（默认 true）
  sortable?: boolean;        // 是否可排序（默认 true）
  resizable?: boolean;       // 是否可调整宽度（默认 true）
  align?: 'left' | 'center' | 'right';  // 对齐方式
  formatter?: (value: any, rowData: RowData, column: Column) => string;  // 格式化函数

  // ===== 样式配置 =====
  headerBgColor?: string;    // 表头背景颜色
  headerTextColor?: string;  // 表头文字颜色

  // ===== 数字格式 =====
  decimalPlaces?: number;           // 小数位数
  numberPrefix?: string;             // 数字前缀（如 ¥）
  numberSuffix?: string;             // 数字后缀（如 %）
  useThousandSeparator?: boolean;    // 千分位分隔符（默认 true）

  // ===== 日期格式 =====
  dateFormat?: string;       // 日期格式

  // ===== 右键菜单配置 =====
  contextMenu?: ColumnContextMenuConfig;  // 列级右键菜单配置
}
```

### ColumnContextMenuConfig

```typescript
interface ColumnContextMenuConfig {
  disableCopy?: boolean;      // 禁用复制（默认 false）
  disableCut?: boolean;       // 禁用剪切（默认 false）
  disablePaste?: boolean;     // 禁用粘贴（默认 false）
  disableClear?: boolean;      // 禁用清空（默认 false）
  disableSort?: boolean;       // 禁用排序（默认 false）
}
```

## API

### 数据操作

```typescript
sheet.loadData(data);              // 加载数据
sheet.getData();                   // 获取所有数据
sheet.getCellValue(row, col);      // 获取单元格值
sheet.setCellValue(row, col, val);// 设置单元格值
sheet.insertRow(index, data);      // 插入行
sheet.deleteRow(index);            // 删除行
```

### 选区操作

```typescript
sheet.getSelection();              // 获取选区
sheet.setSelection(startRow, startCol, endRow, endCol);  // 设置选区
sheet.clearSelection();            // 清除选区
```

### 排序

```typescript
// 获取当前排序状态
const { column, direction } = sheet.getSortState();

// 手动触发排序
sheet.sort(columnIndex, 'asc' | 'desc' | null);
```

### 事件

```typescript
// 排序事件
sheet.on('sort:change', (e) => {
  // e.column: 排序列索引
  // e.direction: 'asc' | 'desc' | null
});

// 自定义排序（用于远程排序）
sheet.on('sort:custom', (e) => {
  e.preventDefault();  // 阻止默认排序
  // 请求服务器排序
  fetch(`/api/data?sortBy=${e.column}&order=${e.direction}`)
    .then(res => res.json())
    .then(data => e.setData(data));  // 设置排序后的数据
});
```

### 历史记录

```typescript
sheet.undo();  // 撤销
sheet.redo();  // 重做
```

### 导入导出

```typescript
sheet.exportCSV();   // 导出 CSV
sheet.importCSV(csv); // 导入 CSV
```

### 其他

```typescript
sheet.refresh();           // 刷新表格
sheet.scrollToCell(row, col);  // 滚动到单元格
sheet.setTheme('dark');    // 设置主题
sheet.destroy();           // 销毁实例
```

## License

MIT © [n0ts](https://github.com/n0tssss)
