# SimpleSheet 使用教程

轻量级、零依赖的 Excel 风格表格框架。

## 目录

1. [快速开始](#快速开始)
2. [核心配置](#核心配置)
3. [列定义详解](#列定义详解)
4. [数据操作](#数据操作)
5. [选区操作](#选区操作)
6. [事件系统](#事件系统)
7. [主题定制](#主题定制)
8. [内置渲染器](#内置渲染器)
9. [内置编辑器](#内置编辑器)
10. [插件系统](#插件系统)
11. [快捷键参考](#快捷键参考)
12. [常见问题](#常见问题)

---

## 快速开始

### 安装

```bash
# npm
npm install @n0ts123/simple-sheet

# yarn
yarn add @n0ts123/simple-sheet

# pnpm
pnpm add @n0ts123/simple-sheet
```

### 基本用法

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

---

## 核心配置

### SheetOptions 完整配置

```typescript
interface SheetOptions {
  /** 列定义（必填） */
  columns: Column[];

  /** 初始数据 */
  data?: RowData[];

  /** 行高（默认 32） */
  rowHeight?: number;

  /** 表头高度（默认 36） */
  headerHeight?: number;

  /** 全局只读（默认 false） */
  readonly?: boolean;

  /** 允许多选（默认 true） */
  allowMultiSelect?: boolean;

  /** 显示行号（默认 true） */
  showRowNumber?: boolean;

  /** 显示复选框列（默认 false） */
  showCheckbox?: boolean;

  /** 主题：'light' | 'dark' | 'auto'（默认 'auto'） */
  theme?: Theme;

  /** 行号列宽度（默认 50） */
  rowNumberWidth?: number;

  /** 最大撤销步数（默认 100） */
  maxHistorySize?: number;

  /** ===== 操作权限配置 ===== */

  /** 允许插入行（默认 true） */
  allowInsertRow?: boolean;

  /** 允许删除行（默认 true） */
  allowDeleteRow?: boolean;

  /** 允许插入列（默认 true） */
  allowInsertColumn?: boolean;

  /** 允许删除列（默认 true） */
  allowDeleteColumn?: boolean;

  /** ===== 虚拟滚动配置 ===== */

  /** 虚拟滚动缓冲区大小（默认 5） */
  virtualScrollBuffer?: number;

  /** 表格上下边距（像素），用于压缩空间展示更多数据 */
  verticalPadding?: number;

  /** 预计算的行高（用于 wrapText 模式） */
  rowHeights?: Map<number, number>;

  /** ===== 右键菜单配置 ===== */

  /** 启用右键菜单（默认 true） */
  enableContextMenu?: boolean;

  /** 右键菜单功能配置 */
  contextMenuOptions?: ContextMenuOptions;

  /** ===== 提示消息配置 ===== */

  /** 提示文本配置 */
  toastMessages?: {
    /** 只读单元格双击提示（未配置则不提示） */
    readonlyCellEdit?: string;
    /** 复制成功提示（默认 '已复制到剪贴板'） */
    copySuccess?: string;
    /** 粘贴成功提示（默认 '粘贴成功'） */
    pasteSuccess?: string;
    /** 粘贴失败提示（默认 '粘贴失败，请检查剪贴板内容'） */
    pasteFailed?: string;
  };
}
```

### 右键菜单配置 (ContextMenuOptions)

```typescript
interface ContextMenuOptions {
  /** ===== 基础操作 ===== */

  /** 显示复制菜单项（默认 true） */
  showCopy?: boolean;

  /** 显示剪切菜单项（默认 true） */
  showCut?: boolean;

  /** 显示粘贴菜单项（默认 true） */
  showPaste?: boolean;

  /** 显示全选菜单项（默认 true） */
  showSelectAll?: boolean;

  /** ===== 行操作 ===== */

  /** 显示向上插入行（默认 true） */
  showInsertRowAbove?: boolean;

  /** 显示向下插入行（默认 true） */
  showInsertRowBelow?: boolean;

  /** 显示删除行（默认 true） */
  showDeleteRow?: boolean;

  /** 显示清空行（默认 true） */
  showClearRow?: boolean;

  /** ===== 列操作 ===== */

  /** 显示向左插入列（默认 true） */
  showInsertColumnLeft?: boolean;

  /** 显示向右插入列（默认 true） */
  showInsertColumnRight?: boolean;

  /** 显示删除列（默认 true） */
  showDeleteColumn?: boolean;

  /** 显示清空列（默认 true） */
  showClearColumn?: boolean;

  /** ===== 排序和筛选 ===== */

  /** 显示升序排序（默认 true） */
  showSortAsc?: boolean;

  /** 显示降序排序（默认 true） */
  showSortDesc?: boolean;

  /** 显示取消排序（默认 true） */
  showSortCancel?: boolean;

  /** 显示筛选菜单（默认 true） */
  showFilter?: boolean;

  /** ===== 单元格操作 ===== */

  /** 显示合并单元格（默认 true） */
  showMergeCell?: boolean;

  /** 显示取消合并（默认 true） */
  showUnmergeCell?: boolean;

  /** ===== 自定义菜单项 ===== */

  /** 自定义菜单项 */
  customItems?: MenuItem[];
}

interface MenuItem {
  /** 菜单项文本 */
  label: string;
  /** 图标（可选） */
  icon?: string;
  /** 快捷键提示（可选） */
  shortcut?: string;
  /** 是否禁用（可选） */
  disabled?: boolean;
  /** 是否隐藏（可选） */
  hidden?: boolean;
  /** 子菜单（可选） */
  children?: MenuItem[];
  /** 点击事件 */
  action: (context: MenuContext) => void;
}

interface MenuContext {
  /** 当前选区 */
  ranges: SelectionRange[];
  /** 单元格位置 */
  cell: CellPosition | null;
  /** 行数据 */
  rowData: RowData | null;
  /** 列配置 */
  column: Column | null;
}
```

### 右键菜单列级配置

在列定义中，可以通过 `contextMenu` 属性单独配置该列的右键菜单行为：

```typescript
interface ColumnContextMenuConfig {
  /** 禁用该列的复制功能（默认 false） */
  disableCopy?: boolean;

  /** 禁用该列的剪切功能（默认 false） */
  disableCut?: boolean;

  /** 禁用该列的粘贴功能（默认 false） */
  disablePaste?: boolean;

  /** 禁用该列的清空功能（默认 false） */
  disableClear?: boolean;

  /** 禁用该列的排序功能（默认 false） */
  disableSort?: boolean;
}

interface Column {
  // ... 其他配置

  /** 右键菜单配置（可选） */
  contextMenu?: ColumnContextMenuConfig;
}
```

### 使用示例：完整配置

```typescript
const sheet = new SimpleSheet('#container', {
  columns: [
    {
      key: 'id',
      title: 'ID',
      width: 60,
      type: 'number',
      readonly: true,
      sortable: true,
      // 该列禁用排序和复制
      contextMenu: {
        disableSort: true,
        disableCopy: true,
      },
    },
    {
      key: 'name',
      title: '姓名',
      width: 120,
      type: 'text',
      sortable: true,
    },
    {
      key: 'amount',
      title: '金额',
      width: 100,
      type: 'number',
      sortable: true,
    },
  ],
  data: [
    { id: 1, name: '张三', amount: 1000 },
    { id: 2, name: '李四', amount: 2000 },
  ],

  // 操作权限配置
  allowInsertRow: true,
  allowDeleteRow: true,
  allowInsertColumn: false,  // 禁止插入列
  allowDeleteColumn: false,   // 禁止删除列

  // 右键菜单配置
  enableContextMenu: true,
  contextMenuOptions: {
    showCopy: true,
    showCut: true,
    showPaste: true,
    showInsertRowAbove: true,
    showInsertRowBelow: true,
    showDeleteRow: true,
    showInsertColumnLeft: false,  // 禁止向左插入列
    showInsertColumnRight: false,  // 禁止向右插入列
    showDeleteColumn: false,       // 禁止删除列
    showSortAsc: true,
    showSortDesc: true,
    showSortCancel: true,
    showFilter: true,
    // 添加自定义菜单项
    customItems: [
      {
        label: '导出该行数据',
        icon: '📤',
        action: (context) => {
          if (context.rowData) {
            console.log('导出:', context.rowData);
          }
        },
      },
    ],
  },

  // 提示消息配置
  toastMessages: {
    readonlyCellEdit: '🚫 该单元格禁止编辑',
    copySuccess: '✅ 已复制到剪贴板',
    pasteSuccess: '✅ 粘贴成功',
    pasteFailed: '❌ 粘贴失败，请检查剪贴板内容',
  },
});
```

---

## 列定义详解

### 基础属性

```typescript
interface Column {
  /** 列标识键（对应数据中的字段名，必填） */
  key: string;

  /** 列标题（必填） */
  title: string;

  /** 列宽度（默认 100） */
  width?: number;

  /** 最小宽度 */
  minWidth?: number;

  /** 最大宽度 */
  maxWidth?: number;
}
```

### 类型和验证

```typescript
interface Column {
  /** 列类型 */
  type?: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'email' | 'phone' | 'link' | 'file' | 'custom';

  /** 是否只读（默认 false） */
  readonly?: boolean;

  /** 是否可编辑（默认 true，与 readonly 相反） */
  editable?: boolean;

  /** 是否可排序（默认 true） */
  sortable?: boolean;

  /** 是否可调整宽度（默认 true） */
  resizable?: boolean;
}
```

### 样式配置

```typescript
interface Column {
  /** 对齐方式：'left' | 'center' | 'right' */
  align?: 'left' | 'center' | 'right';

  /** 表头背景颜色 */
  headerBgColor?: string;

  /** 表头文字颜色 */
  headerTextColor?: string;
}
```

### 格式化配置

```typescript
interface Column {
  /** 格式化函数 */
  formatter?: (value: any, rowData: RowData, column: Column) => string;

  /** ===== 数字类型配置 ===== */

  /** 小数位数（type 为 number 时使用） */
  decimalPlaces?: number;

  /** 数字前缀（如 ¥、$） */
  numberPrefix?: string;

  /** 数字后缀（如 %、元） */
  numberSuffix?: string;

  /** 是否使用千分位分隔符（默认 true） */
  useThousandSeparator?: boolean;

  /** ===== 日期类型配置 ===== */

  /** 日期格式（type 为 date 时使用） */
  dateFormat?: string;
}
```

### 文本换行配置

```typescript
interface Column {
  /** 多行文本显示模式 */
  wrapText?: WrapTextMode;
}

/**
 * 多行文本显示模式
 * - false: 不换行，溢出省略
 * - 'ellipsis': 显示第一行+省略号，点击可预览
 * - 'wrap': 自动换行，行高自适应
 * - 'fixed': 自动换行，但不自动调整行高
 */
type WrapTextMode = false | 'ellipsis' | 'wrap' | 'fixed';

/** 最大显示行数（仅在 wrapText 为 'wrap' 时生效） */
maxLines?: number;
```

### 下拉选项配置

```typescript
interface Column {
  /** 下拉选项（type 为 select 时使用） */
  options?: SelectOption[];

  /** 是否支持多选（type 为 select 时使用，默认 false） */
  multiple?: boolean;
}

interface SelectOption {
  /** 选项显示文本 */
  label: string;
  /** 选项值 */
  value: any;
  /** 标签背景颜色（可选） */
  color?: string;
  /** 文字颜色（可选，默认根据背景色自动计算） */
  textColor?: string;
}
```

### 下拉多选示例

```typescript
const columns: Column[] = [
  // 单选下拉列
  {
    key: 'status',
    title: '状态',
    width: 120,
    type: 'select',
    multiple: false,  // 单选模式
    options: [
      { label: '启用', value: 'active', color: '#dcfce7', textColor: '#15803d' },
      { label: '禁用', value: 'disabled', color: '#fee2e2', textColor: '#b91c1c' },
      { label: '待定', value: 'pending', color: '#fef3c7', textColor: '#b45309' },
    ],
  },

  // 多选下拉列
  {
    key: 'tags',
    title: '标签',
    width: 180,
    type: 'select',
    multiple: true,  // 开启多选模式
    options: [
      { label: '重要', value: 'important', color: '#fee2e2', textColor: '#b91c1c' },
      { label: '紧急', value: 'urgent', color: '#fef3c7', textColor: '#b45309' },
      { label: '完成', value: 'done', color: '#dcfce7', textColor: '#15803d' },
      { label: '进行中', value: 'in_progress', color: '#dbeafe', textColor: '#1565c0' },
    ],
  },
];
```

### 自定义悬浮窗配置 (expandPopover)

通过 `expandPopover` 配置，可以自定义点击单元格时显示的悬浮窗内容。支持多种内容类型：纯文本、HTML、链接、邮箱、电话、标签列表等。

```typescript
interface Column {
  /** 自定义悬浮窗配置（点击单元格时显示） */
  expandPopover?: ExpandPopoverConfig;
}

/** 悬浮窗内容类型 */
type PopoverContentType =
  | 'text'        // 纯文本
  | 'html'         // HTML 内容
  | 'link'         // 链接（显示地址 + 复制/打开按钮）
  | 'email'        // 邮箱（显示地址 + 复制/发送邮件按钮）
  | 'phone'        // 电话（显示号码 + 复制/拨打按钮）
  | 'tags'         // 标签列表
  | 'custom';      // 自定义内容

/** 悬浮窗配置 */
interface ExpandPopoverConfig {
  /** 悬浮窗类型（必填） */
  type: PopoverContentType;

  /** ===== 通用配置 ===== */
  /** 悬浮窗宽度 */
  width?: number;
  /** 最大宽度（默认 300） */
  maxWidth?: number;
  /** 悬浮窗标题 */
  title?: string;
  /** 是否显示关闭按钮（默认 false） */
  showClose?: boolean;

  /** ===== 文本/HTML 内容配置 ===== */
  /** 当 type 为 text/html 时使用，直接显示此内容 */
  content?: string;

  /** ===== 链接/邮箱/电话配置 ===== */
  /** 值字段（从 rowData 中获取，默认为 'value'） */
  valueField?: string;
  /** 显示文本字段（可选，默认使用值字段的值） */
  displayField?: string;

  /** ===== 标签配置 ===== */
  /** 标签值字段（从 rowData 中获取，支持数组或逗号分隔字符串，默认为 'tags'） */
  tagsField?: string;
  /** 标签选项配置（用于 tags 类型显示） */
  tagOptions?: Array<{
    value: any;
    label: string;
    color?: string;
    textColor?: string;
  }>;
  /** 是否支持多选（用于 tags 类型，默认 false） */
  multiple?: boolean;
  /** 值变化回调（用于 tags 类型的可选择模式） */
  onChange?: (value: any) => void;

  /** ===== 自定义内容配置 ===== */
  /** 自定义渲染函数（用于 custom 类型） */
  render?: (value: any, rowData: RowData) => HTMLElement | string;

  /** ===== 操作按钮配置 ===== */
  /** 额外操作按钮 */
  actions?: PopoverAction[];

  /** ===== 行为配置 ===== */
  /** 点击悬浮窗外部是否自动关闭（默认 true） */
  closeOnBlur?: boolean;
  /** 双击悬浮窗是否进入编辑模式（默认 false） */
  dblClickToEdit?: boolean;
}

/** 悬浮窗操作按钮配置 */
interface PopoverAction {
  /** 按钮标签 */
  label: string;
  /** 按钮图标（SVG 或 emoji） */
  icon?: string;
  /** 是否为主要按钮样式 */
  primary?: boolean;
  /** 点击事件（value: 当前值，close: 关闭悬浮窗的函数） */
  action: (value: any, close: () => void) => void;
}
```

### 自定义悬浮窗使用示例

```typescript
const columns: Column[] = [
  // 1. 纯文本悬浮窗（用于长文本预览）
  {
    key: 'description',
    title: '描述',
    width: 200,
    type: 'text',
    wrapText: 'ellipsis',  // 溢出省略，点击弹出完整内容
    expandPopover: {
      type: 'text',
      maxWidth: 400,
    },
  },

  // 2. 链接悬浮窗（支持复制、打开链接）
  {
    key: 'website',
    title: '网站',
    width: 150,
    type: 'link',
    expandPopover: {
      type: 'link',
      valueField: 'website',  // 从 rowData 中获取链接值
      displayField: 'websiteTitle',  // 显示的文本
      actions: [
        {
          label: '新窗口打开',
          primary: true,
          icon: '↗️',
          action: (value) => {
            window.open(value, '_blank');
          },
        },
      ],
    },
  },

  // 3. 邮箱悬浮窗（支持复制、发送邮件）
  {
    key: 'email',
    title: '邮箱',
    width: 180,
    type: 'email',
    expandPopover: {
      type: 'email',
      valueField: 'email',
    },
  },

  // 4. 电话悬浮窗（支持复制、拨打电话）
  {
    key: 'phone',
    title: '电话',
    width: 120,
    type: 'phone',
    expandPopover: {
      type: 'phone',
      valueField: 'phone',
    },
  },

  // 5. 标签悬浮窗（只读显示模式）
  {
    key: 'tags',
    title: '标签',
    width: 180,
    type: 'select',
    multiple: true,
    expandPopover: {
      type: 'tags',
      tagsField: 'tags',
      tagOptions: [
        { value: 'important', label: '重要', color: '#fee2e2', textColor: '#b91c1c' },
        { value: 'urgent', label: '紧急', color: '#fef3c7', textColor: '#b45309' },
        { value: 'done', label: '完成', color: '#dcfce7', textColor: '#15803d' },
      ],
    },
  },

  // 6. 标签悬浮窗（可选择模式，支持修改）
  {
    key: 'status',
    title: '状态',
    width: 120,
    type: 'select',
    expandPopover: {
      type: 'tags',
      tagsField: 'status',
      tagOptions: [
        { value: 'active', label: '启用', color: '#dcfce7', textColor: '#15803d' },
        { value: 'disabled', label: '禁用', color: '#fee2e2', textColor: '#b91c1c' },
        { value: 'pending', label: '待定', color: '#fef3c7', textColor: '#b45309' },
      ],
      multiple: false,  // 单选模式
      onChange: (value) => {
        // 更新数据
        sheet.setCellValue(row, col, value);
        // 刷新单元格
        sheet.refreshCell(row, col);
      },
    },
  },

  // 7. 自定义悬浮窗（渲染函数）
  {
    key: 'user',
    title: '用户',
    width: 120,
    expandPopover: {
      type: 'custom',
      maxWidth: 350,
      render: (value, rowData) => {
        // 自定义渲染内容
        return `
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${rowData.avatar}" style="width: 48px; height: 48px; border-radius: 50%;">
            <div>
              <div style="font-weight: 600; font-size: 14px;">${rowData.name}</div>
              <div style="color: #666; font-size: 12px;">${rowData.email}</div>
              <div style="color: #999; font-size: 11px;">ID: ${rowData.id}</div>
            </div>
          </div>
        `;
      },
      actions: [
        {
          label: '查看详情',
          primary: true,
          icon: '👤',
          action: () => {
            console.log('查看用户详情:', rowData);
          },
        },
      ],
    },
  },
];

// 数据示例
const data = [
  {
    id: 1,
    name: '张三',
    description: '这是一个很长的描述文本，包含大量内容，需要通过悬浮窗来完整展示。',
    website: 'https://example.com',
    websiteTitle: '访问官网',
    email: 'zhangsan@example.com',
    phone: '13800138000',
    tags: ['important', 'urgent'],
    status: 'active',
    avatar: 'https://example.com/avatar1.png',
  },
];
```

### 悬浮窗 API

```typescript
import { showPopover, hidePopover } from '@n0ts123/simple-sheet';

// 手动显示悬浮窗
showPopover(
  cell,  // 触发悬浮窗的单元格元素
  value, // 当前值
  rowData, // 行数据
  {
    type: 'text',
    content: '悬浮窗内容',
    maxWidth: 300,
  }
);

// 手动关闭悬浮窗
hidePopover();

// 设置双击悬浮窗的回调
import { setPopoverDblClickHandler } from '@n0ts123/simple-sheet';

setPopoverDblClickHandler((cell) => {
  // 双击悬浮窗时触发，进入编辑模式
  sheet.startEditing(row, col);
});
```

### 自定义渲染器和编辑器

```typescript
interface Column {
  /** 自定义渲染器 */
  renderer?: CellRendererClass;

  /** 自定义编辑器 */
  editor?: CellEditorClass;
}
```

### 完整列定义示例

```typescript
const columns: Column[] = [
  // 基础列
  { key: 'id', title: '编号', width: 60, type: 'number', readonly: true },

  // 文本列
  { key: 'name', title: '姓名', width: 120, type: 'text', align: 'center' },

  // 数字列（带格式）
  {
    key: 'price',
    title: '价格',
    width: 100,
    type: 'number',
    align: 'right',
    numberPrefix: '¥',
    useThousandSeparator: true,
    decimalPlaces: 2,
  },

  // 日期列
  {
    key: 'date',
    title: '日期',
    width: 120,
    type: 'date',
    dateFormat: 'YYYY-MM-DD',
  },

  // 下拉选择列
  {
    key: 'status',
    title: '状态',
    width: 100,
    type: 'select',
    options: [
      { label: '启用', value: 'active', color: '#dcfce7', textColor: '#15803d' },
      { label: '禁用', value: 'disabled', color: '#fee2e2', textColor: '#b91c1c' },
    ],
  },

  // 自定义表头样式
  {
    key: 'amount',
    title: '金额',
    width: 120,
    type: 'number',
    headerBgColor: '#fef3c7',
    headerTextColor: '#b45309',
  },

  // 文本换行
  {
    key: 'description',
    title: '描述',
    width: 200,
    type: 'text',
    wrapText: 'wrap',
    maxLines: 3,
  },

  // 自定义渲染器
  {
    key: 'progress',
    title: '进度',
    width: 150,
    renderer: ProgressRenderer,
  },
];
```

---

## 数据操作

### 加载和获取数据

```typescript
// 加载数据（替换全部数据）
sheet.loadData(newData);

// 获取所有数据
const allData = sheet.getData();

// 获取行数据
const rowData = sheet.getRowData(index);

// 获取单元格值
const value = sheet.getCellValue(row, col);
```

### 设置数据

```typescript
// 设置单元格值
sheet.setCellValue(row, col, value);

// 批量设置值（二维数组）
sheet.setRangeValues(startRow, startCol, [
  ['A1', 'B1'],
  ['A2', 'B2'],
]);

// 设置行数据
sheet.setRowData(index, data);
```

### 行操作

```typescript
// 插入行
sheet.insertRow(index, data);  // 在指定位置插入
sheet.insertRow(data);         // 在末尾插入

// 删除行
sheet.deleteRow(index);

// 清空行数据
sheet.clearRow(index);
```

### 列操作

```typescript
// 添加列
sheet.addColumn(column);

// 删除列
sheet.deleteColumn(index);
```

---

## 选区操作

### 获取选区

```typescript
// 获取选区
const selection = sheet.getSelection();
// 返回: SelectionRange[]

// 获取主要选区
const primary = sheet.getPrimarySelection();

// 获取选中的数据
const selectedData = sheet.getSelectedData();
```

### 设置选区

```typescript
// 设置选区
sheet.setSelection(startRow, startCol, endRow, endCol);

// 清除选区
sheet.clearSelection();

// 选择整行
sheet.selectRow(row);

// 选择整列
sheet.selectColumn(col);

// 全选
sheet.selectAll();
```

---

## 事件系统

### 事件列表

```typescript
// 单元格事件
sheet.on('cell:click', (e) => {});        // 单击
sheet.on('cell:dblclick', (e) => {});      // 双击
sheet.on('cell:mouseenter', (e) => {});    // 鼠标进入
sheet.on('cell:mouseleave', (e) => {});    // 鼠标离开
sheet.on('cell:contextmenu', (e) => {});   // 右键菜单

// 编辑事件
sheet.on('edit:start', (e) => {});         // 开始编辑
sheet.on('edit:change', (e) => {});        // 编辑中值变化
sheet.on('edit:end', (e) => {});           // 编辑结束
sheet.on('edit:cancel', (e) => {});        // 取消编辑

// 数据事件
sheet.on('data:change', (e) => {
  // type: 'set' | 'insert' | 'delete' | 'batch'
  console.log('变更:', e.changes);
});

// 行事件
sheet.on('row:insert', (e) => {});         // 插入行
sheet.on('row:delete', (e) => {});        // 删除行
sheet.on('row:select', (e) => {});        // 选择行

// 列事件
sheet.on('column:resize', (e) => {});     // 调整列宽
sheet.on('column:insert', (e) => {});     // 插入列
sheet.on('column:delete', (e) => {});      // 删除列
sheet.on('column:select', (e) => {});      // 选择列

// 排序事件
sheet.on('sort:change', (e) => {
  // e.column: 排序列索引
  // e.direction: 'asc' | 'desc' | null
  // e.comparator?: 自定义比较函数
});
sheet.on('sort:custom', (e) => {
  // 自定义排序事件（需要调用 preventDefault() 阻止默认排序）
});

// 选择事件
sheet.on('selection:change', (e) => {
  console.log('选区:', e.ranges);
});

// 填充事件
sheet.on('fill', (e) => {
  // 拖拽填充完成
});

// 剪贴板事件
sheet.on('copy', (e) => {});              // 复制
sheet.on('paste', (e) => {});              // 粘贴

// 历史事件
sheet.on('undo', (e) => {});              // 撤销
sheet.on('redo', (e) => {});              // 重做
```

### 事件对象类型

```typescript
interface CellEvent {
  row: number;           // 行索引
  col: number;           // 列索引
  value: any;            // 单元格值
  rowData: RowData;      // 行数据
  column: Column;        // 列配置
  originalEvent: MouseEvent;  // 原始事件
}

interface EditEvent {
  row: number;
  col: number;
  oldValue: any;
  newValue?: any;
  rowData: RowData;
  column: Column;
}

interface DataChangeEvent {
  type: 'set' | 'insert' | 'delete' | 'batch';
  changes: Array<{
    row: number;
    col: number;
    oldValue: any;
    newValue: any;
  }>;
}

interface SortEvent {
  column: number;              // 排序列索引
  direction: 'asc' | 'desc' | null;
  comparator?: SortComparator; // 自定义比较函数
}

interface SortCustomEvent {
  column: number;              // 排序列索引
  direction: 'asc' | 'desc';   // 排序方向
  preventDefault: () => void;  // 阻止默认排序行为
  getData: () => RowData[];    // 获取当前数据
}
```

### 自定义排序事件示例

```typescript
sheet.on('sort:custom', (e) => {
  // 阻止默认排序
  e.preventDefault();

  // 获取当前数据
  const currentData = e.getData();

  // 发送请求到服务器进行排序
  fetch('/api/data', {
    method: 'POST',
    body: JSON.stringify({
      column: e.column,
      direction: e.direction,
    }),
  })
    .then(res => res.json())
    .then(sortedData => {
      // 更新表格数据
      sheet.loadData(sortedData);
    });
});

// 或者使用 sort:change 事件处理简单排序
sheet.on('sort:change', (e) => {
  console.log(`列 ${e.column} 排序方式: ${e.direction}`);
});
```

---

## 主题定制

### CSS 变量

```css
:root {
  /* ===== 主题色 ===== */
  --ss-primary-color: #3b82f6;
  --ss-primary-color-hover: #2563eb;
  --ss-primary-color-light: rgba(59, 130, 246, 0.1);

  /* ===== 背景色 ===== */
  --ss-bg-color: #ffffff;
  --ss-bg-color-secondary: #f9fafb;
  --ss-header-bg: #f3f4f6;
  --ss-header-bg-hover: #e5e7eb;
  --ss-row-bg: #ffffff;
  --ss-row-bg-hover: #f9fafb;
  --ss-row-bg-alt: #fafafa;

  /* ===== 边框色 ===== */
  --ss-border-color: #e5e7eb;
  --ss-border-color-light: #f3f4f6;
  --ss-border-color-dark: #d1d5db;

  /* ===== 文字色 ===== */
  --ss-text-color: #1f2937;
  --ss-text-color-secondary: #6b7280;
  --ss-text-color-disabled: #9ca3af;
  --ss-header-text-color: #374151;

  /* ===== 选区 ===== */
  --ss-selection-bg: rgba(59, 130, 246, 0.08);
  --ss-selection-border: #3b82f6;

  /* ===== 只读单元格 ===== */
  --ss-readonly-bg: #f3f4f6;
  --ss-readonly-bg-hover: #e5e7eb;

  /* ===== 状态色 ===== */
  --ss-success-color: #10b981;
  --ss-warning-color: #f59e0b;
  --ss-error-color: #ef4444;

  /* ===== 其他 ===== */
  --ss-scrollbar-track: #f1f1f1;
  --ss-scrollbar-thumb: #c1c1c1;
  --ss-scrollbar-thumb-hover: #a1a1a1;
}
```

### 深色主题

```css
[data-theme="dark"] {
  --ss-bg-color: #1f2937;
  --ss-bg-color-secondary: #111827;
  --ss-header-bg: #374151;
  --ss-header-bg-hover: #4b5563;
  --ss-row-bg: #1f2937;
  --ss-row-bg-hover: #374151;
  --ss-row-bg-alt: #263040;

  --ss-border-color: #374151;
  --ss-border-color-light: #4b5563;
  --ss-border-color-dark: #1f2937;

  --ss-text-color: #f3f4f6;
  --ss-text-color-secondary: #9ca3af;
  --ss-text-color-disabled: #6b7280;
  --ss-header-text-color: #e5e7eb;

  --ss-selection-bg: rgba(59, 130, 246, 0.15);
  --ss-selection-border: #60a5fa;

  --ss-readonly-bg: #374151;
  --ss-readonly-bg-hover: #4b5563;

  --ss-scrollbar-track: #374151;
  --ss-scrollbar-thumb: #4b5563;
  --ss-scrollbar-thumb-hover: #6b7280;
}
```

### API 切换主题

```typescript
// 切换主题
sheet.setTheme('light');
sheet.setTheme('dark');
sheet.setTheme('auto');  // 跟随系统

// 获取当前主题
const theme = sheet.getTheme();
```

---

## 内置渲染器

| 渲染器 | 说明 | 数据格式 |
|--------|------|----------|
| `TextRenderer` | 文本（默认） | `string` |
| `NumberRenderer` | 数字 | `number` |
| `DateRenderer` | 日期 | `string` / `Date` |
| `LinkRenderer` | 链接 | `{ url, text }` / `string` |
| `MultiLinkRenderer` | 多链接 | `string`（逗号分隔） |
| `ImageRenderer` | 图片 | `string`（URL） |
| `FileRenderer` | 文件 | `FileUploadResult` |
| `TagRenderer` | 标签 | `Array<{ text, color }>` |
| `ProgressRenderer` | 进度条 | `number` (0-100) |
| `RatingRenderer` | 评分 | `number` (0-5) |
| `CheckboxRenderer` | 复选框 | `boolean` |
| `ButtonRenderer` | 按钮 | `ButtonConfig` |
| `EmailRenderer` | 邮箱 | `string` |
| `PhoneRenderer` | 手机号 | `string` |
| `SelectRenderer` | 下拉选择 | `any` |

### 渲染器使用示例

```typescript
import {
  DateRenderer,
  LinkRenderer,
  ImageRenderer,
  TagRenderer,
  ProgressRenderer,
  RatingRenderer,
  CheckboxRenderer,
} from '@n0ts123/simple-sheet';

const columns: Column[] = [
  // 日期渲染
  { key: 'date', title: '日期', width: 120, renderer: DateRenderer },

  // 链接渲染
  {
    key: 'website',
    title: '网站',
    width: 150,
    renderer: LinkRenderer,
  },

  // 图片渲染
  {
    key: 'avatar',
    title: '头像',
    width: 80,
    renderer: ImageRenderer,
  },

  // 标签渲染
  {
    key: 'tags',
    title: '标签',
    width: 150,
    renderer: TagRenderer,
  },

  // 进度条
  {
    key: 'progress',
    title: '进度',
    width: 120,
    renderer: ProgressRenderer,
  },

  // 评分
  {
    key: 'rating',
    title: '评分',
    width: 100,
    renderer: RatingRenderer,
  },

  // 复选框
  {
    key: 'active',
    title: '启用',
    width: 60,
    renderer: CheckboxRenderer,
  },
];
```

---

## 内置编辑器

| 编辑器 | 说明 | 数据格式 |
|--------|------|----------|
| `TextEditor` | 文本输入 | `string` |
| `NumberEditor` | 数字输入 | `number` |
| `DateEditor` | 日期选择 | `string` / `Date` |
| `SelectEditor` | 下拉选择 | `any` |

### 编辑器使用示例

```typescript
import {
  TextEditor,
  NumberEditor,
  DateEditor,
  SelectEditor,
} from '@n0ts123/simple-sheet';

const columns: Column[] = [
  {
    key: 'name',
    title: '姓名',
    width: 120,
    editor: TextEditor,
  },
  {
    key: 'age',
    title: '年龄',
    width: 100,
    type: 'number',
    editor: NumberEditor,
  },
  {
    key: 'birthday',
    title: '生日',
    width: 120,
    type: 'date',
    editor: DateEditor,
  },
  {
    key: 'status',
    title: '状态',
    width: 100,
    type: 'select',
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ],
    editor: SelectEditor,
  },
];
```

---

## 插件系统

### 数据验证 (Validator)

```typescript
import { Validator, ValidationRules } from '@n0ts123/simple-sheet';

const validator = new Validator();

// 添加验证规则
validator.addValidation('email', [
  ValidationRules.required('邮箱不能为空'),
  ValidationRules.email('请输入有效的邮箱'),
  ValidationRules.maxLength(100, '邮箱最长100个字符'),
]);

validator.addValidation('age', [
  ValidationRules.number('请输入数字'),
  ValidationRules.range(0, 150, '年龄必须在 0-150 之间'),
]);

// 验证单元格
const error = validator.validateCell(row, col, value, rowData, column);
```

### 排序 (Sorter)

```typescript
import { Sorter } from '@n0ts123/simple-sheet';

const sorter = new Sorter({ multiSort: true });
sorter.setColumns(columns);
sorter.setData(data);

// 切换排序
sorter.toggleSort(columnIndex);

// 监听排序变化
sorter.on('sort:change', ({ configs, data }) => {
  sheet.loadData(data);
});
```

### 筛选 (Filter)

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

### 搜索替换 (Search)

```typescript
import { Search } from '@n0ts123/simple-sheet';

const search = new Search();
search.setData(data, columns);

// 搜索
const results = search.search('关键词', {
  caseSensitive: false,  // 区分大小写
  wholeWord: false,     // 全字匹配
  regex: false,         // 正则表达式
});

// 导航结果
search.next();
search.prev();

// 替换
search.replaceCurrent('新值', setCellValue);
search.replaceAll('新值', setCellValue);
```

### 单元格合并 (MergeCell)

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

### 冻结窗格 (FreezePane)

```typescript
import { FreezePane } from '@n0ts123/simple-sheet';

const freezer = new FreezePane(options);

// 冻结首行
freezer.freezeFirstRow();

// 冻结首列
freezer.freezeFirstColumn();

// 冻结首行首列
freezer.freezeFirstRowAndColumn();

// 自定义冻结
freezer.freeze(2, 1);  // 冻结前2行和第1列

// 取消冻结
freezer.unfreeze();
```

### 条件格式 (ConditionalFormat)

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
  '#3b82f6',
  '#ef4444'
));

// 获取单元格样式
const style = cf.getCellStyle(row, col);
```

### 右键菜单 (ContextMenu)

```typescript
import { ContextMenu, createDefaultMenuItems } from '@n0ts123/simple-sheet';

const menu = new ContextMenu({
  items: createDefaultMenuItems({
    onCopy: () => sheet.copy(),
    onPaste: () => sheet.paste(),
    onInsertRowAbove: () => sheet.insertRow(row),
    onInsertRowBelow: () => sheet.insertRow(row + 1),
    onDeleteRow: () => sheet.deleteRow(row),
    onClearRow: () => sheet.clearRow(row),
  }),
  customItems: [
    {
      label: '自定义操作',
      icon: '⚡',
      action: (context) => {
        console.log('选中的数据:', context.rowData);
      },
    },
  ],
});

menu.mount(container);
```

### 列配置对话框 (ColumnConfigDialog)

```typescript
import {
  ColumnConfigDialog,
  showCreateColumnDialog,
  showEditColumnDialog,
  DATE_FORMATS,
  NUMBER_PREFIXES,
  NUMBER_SUFFIXES,
} from '@n0ts123/simple-sheet';

// 显示创建列对话框
const newColumn = await showCreateColumnDialog(container, {
  dateFormats: DATE_FORMATS,
  numberPrefixes: NUMBER_PREFIXES,
  numberSuffixes: NUMBER_SUFFIXES,
});

// 显示编辑列对话框
const editedColumn = await showEditColumnDialog(container, column, {
  showTypePicker: true,
  showFormatter: true,
});
```

### 多值编辑器 (MultiValueEditor)

```typescript
import { showMultiValueEditor } from '@n0ts123/simple-sheet';

showMultiValueEditor({
  container,
  value: 'a@example.com;b@example.com',
  column: {
    key: 'email',
    title: '邮箱',
    type: 'email',
  },
  onSave: (newValue) => {
    sheet.setCellValue(row, col, newValue);
  },
});
```

### 自动填充 (AutoFill)

```typescript
import { AutoFill } from '@n0ts123/simple-sheet';

const autoFill = new AutoFill({
  getCellValue: (row, col) => sheet.getCellValue(row, col),
  setCellValue: (row, col, value) => sheet.setCellValue(row, col, value),
  getCellRect: (row, col) => sheet.renderer.getCellRect(row, col),
  getSelection: () => sheet.getSelection(),
  maxRow: rowCount,
  maxCol: colCount,
});

// 启用/禁用自动填充
autoFill.enable();
autoFill.disable();
```

### 列类型选择器 (ColumnTypePicker)

```typescript
import { ColumnTypePicker, COLUMN_TYPES, createColumnByType } from '@n0ts123/simple-sheet';

const picker = new ColumnTypePicker({
  onSelect: (type, config) => {
    const column = createColumnByType(type, 'newColumn');
    sheet.addColumn(column);
  },
  columnTypes: COLUMN_TYPES,
});

picker.mount(container);
```

---

## 快捷键参考

### 导航

| 快捷键 | 功能 |
|--------|------|
| `↑` | 向上移动一个单元格 |
| `↓` | 向下移动一个单元格 |
| `←` | 向左移动一个单元格 |
| `→` | 向右移动一个单元格 |
| `Home` | 移动到行首 |
| `End` | 移动到行尾 |
| `Ctrl+Home` | 移动到表格开头 |
| `Ctrl+End` | 移动到表格结尾 |
| `PageUp` | 向上翻页 |
| `PageDown` | 向下翻页 |

### 编辑

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 开始编辑 / 确认编辑 |
| `Tab` | 移动到下一个单元格 |
| `Shift+Tab` | 移动到上一个单元格 |
| `Escape` | 取消编辑 |
| `Backspace` | 删除内容并进入编辑 |
| `Delete` | 清除单元格内容 |
| `F2` | 直接进入编辑 |

### 选区

| 快捷键 | 功能 |
|--------|------|
| `Shift+↑↓←→` | 扩展选区 |
| `Shift+Click` | 范围选择 |
| `Ctrl+Click` | 多选 |
| `Ctrl+A` | 全选 |
| `Ctrl+Shift+Home` | 选区扩展到开头 |
| `Ctrl+Shift+End` | 选区扩展到结尾 |

### 剪贴板

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 复制 |
| `Ctrl+X` | 剪切 |
| `Ctrl+V` | 粘贴 |
| `Ctrl+Insert` | 复制 |
| `Shift+Insert` | 粘贴 |

### 历史

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+Shift+Z` | 重做 |

### 查找

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+F` | 打开查找对话框 |
| `F3` | 查找下一个 |
| `Shift+F3` | 查找上一个 |

### 其他

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` | 保存（不自带实现，需自行监听） |
| `Ctrl+L` | 跳转到指定单元格 |
| `Ctrl+D` | 填充向下 |
| `Ctrl+R` | 填充向右 |

---

## 常见问题

### Q1: 如何禁用某一列的编辑？

```typescript
const columns: Column[] = [
  {
    key: 'id',
    title: 'ID',
    readonly: true,  // 设置为只读
  },
];
```

### Q2: 如何自定义只读单元格的提示？

```typescript
const sheet = new SimpleSheet('#container', {
  columns: [...],
  toastMessages: {
    readonlyCellEdit: '该列禁止编辑',
  },
});
```

如果未配置 `readonlyCellEdit`，则只读单元格双击不会有任何提示。

### Q3: 如何禁用右键菜单的某些功能？

```typescript
const sheet = new SimpleSheet('#container', {
  columns: [...],
  enableContextMenu: true,
  contextMenuOptions: {
    showDeleteRow: false,      // 禁用删除行
    showDeleteColumn: false,   // 禁用删除列
    showInsertColumnLeft: false,
    showInsertColumnRight: false,
  },
});
```

### Q4: 如何禁用某列的右键菜单功能？

```typescript
const columns: Column[] = [
  {
    key: 'name',
    title: '姓名',
    contextMenu: {
      disableSort: true,   // 禁用该列的排序
      disableCopy: true,   // 禁用该列的复制
    },
  },
];
```

### Q5: 如何实现点击表头排序后请求服务器？

```typescript
sheet.on('sort:custom', (e) => {
  // 阻止默认排序
  e.preventDefault();

  // 请求服务器排序
  fetch(`/api/data?sortBy=${e.column}&order=${e.direction}`)
    .then(res => res.json())
    .then(data => {
      sheet.loadData(data);
    });
});
```

### Q6: 如何实现自定义渲染器？

```typescript
import { BaseRenderer } from '@n0ts123/simple-sheet';

class ButtonRenderer extends BaseRenderer {
  render(cell, value, rowData, column) {
    const button = document.createElement('button');
    button.textContent = value || '点击';
    button.onclick = () => {
      console.log('点击了行数据:', rowData);
    };
    cell.appendChild(button);
  }
}

const columns: Column[] = [
  {
    key: 'action',
    title: '操作',
    width: 100,
    renderer: ButtonRenderer,
  },
];
```

### Q7: 如何实现自定义编辑器？

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
    if (this.input) {
      this.input.value = value || '#000000';
    }
  }

  getValue() {
    return this.input?.value;
  }

  focus() {
    this.input?.focus();
  }

  validate() {
    return this.input?.value ? true : '请选择颜色';
  }
}

const columns: Column[] = [
  {
    key: 'color',
    title: '颜色',
    width: 100,
    editor: ColorEditor,
  },
];
```

### Q8: 如何处理大量数据？

SimpleSheet 使用虚拟滚动，默认只渲染可视区域的单元格。对于大量数据：

1. 确保配置 `virtualScrollBuffer`（默认 5）
2. 如果使用 `wrapText: 'wrap'`，预计算行高：

```typescript
import { precalculateRowHeights } from '@n0ts123/simple-sheet';

const rowHeights = precalculateRowHeights(data, columns, container);
const sheet = new SimpleSheet('#container', {
  columns,
  data,
  rowHeights,
});
```

### Q9: 如何添加自定义样式？

```css
/* 自定义只读单元格样式 */
.ss-cell-readonly {
  background-color: #f3f4f6 !important;
}

/* 自定义禁用列样式 */
.ss-column-disabled {
  background-color: #fef3c7 !important;
}

/* 自定义行样式 */
.ss-row:hover {
  background-color: #f9fafb !important;
}

/* 自定义选中样式 */
.ss-selection {
  background-color: rgba(59, 130, 246, 0.1) !important;
  border-color: #3b82f6 !important;
}
```

### Q10: 如何监听所有数据变化？

```typescript
sheet.on('data:change', (e) => {
  console.log('数据变化:', e);

  // 自动保存到 localStorage
  localStorage.setItem('sheetData', JSON.stringify(sheet.getData()));
});
```
