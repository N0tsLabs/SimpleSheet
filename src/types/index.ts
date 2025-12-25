/**
 * 单元格位置
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * 选区范围
 */
export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

/**
 * 列类型
 */
export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom';

/**
 * 多行文本显示模式
 */
export type WrapTextMode = 
  | false           // 不换行，溢出省略
  | 'ellipsis'      // 显示第一行+省略号，点击可预览
  | 'wrap';         // 自动换行，行高自适应

/**
 * 列定义
 */
export interface Column {
  /** 列标识键 */
  key: string;
  /** 列标题 */
  title: string;
  /** 列宽度 */
  width?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 列类型 */
  type?: ColumnType;
  /** 是否只读 */
  readonly?: boolean;
  /** 是否可调整宽度 */
  resizable?: boolean;
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义渲染器 */
  renderer?: CellRendererClass;
  /** 自定义编辑器 */
  editor?: CellEditorClass;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 格式化函数 */
  formatter?: (value: any, rowData: RowData, column: Column) => string;
  /** 下拉选项（type 为 select 时使用） */
  options?: SelectOption[];
  /** 多行文本显示模式 */
  wrapText?: WrapTextMode;
  /** 是否可编辑 */
  editable?: boolean;
}

/**
 * 下拉选项
 */
export interface SelectOption {
  label: string;
  value: any;
}

/**
 * 行数据
 */
export type RowData = Record<string, any>;

/**
 * 单元格元数据
 */
export interface CellMeta {
  /** 是否只读 */
  readonly?: boolean;
  /** 自定义样式 */
  style?: Partial<CSSStyleDeclaration>;
  /** 自定义类名 */
  className?: string;
  /** 验证错误信息 */
  errorMessage?: string;
  /** 合并行数 */
  rowspan?: number;
  /** 合并列数 */
  colspan?: number;
}

/**
 * 单元格渲染器接口
 */
export interface CellRenderer {
  /** 渲染单元格内容 */
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void;
  /** 销毁时清理 */
  destroy?(): void;
}

/**
 * 单元格渲染器类
 */
export interface CellRendererClass {
  new (): CellRenderer;
}

/**
 * 单元格编辑器接口
 */
export interface CellEditor {
  /** 创建编辑器 */
  create(container: HTMLElement, value: any, rowData: RowData, column: Column): void;
  /** 获取编辑后的值 */
  getValue(): any;
  /** 聚焦编辑器 */
  focus(): void;
  /** 验证 */
  validate?(): boolean | string;
  /** 销毁编辑器 */
  destroy(): void;
}

/**
 * 单元格编辑器类
 */
export interface CellEditorClass {
  new (): CellEditor;
}

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * 表格配置选项
 */
export interface SheetOptions {
  /** 列定义 */
  columns: Column[];
  /** 初始数据 */
  data?: RowData[];
  /** 行高 */
  rowHeight?: number;
  /** 表头高度 */
  headerHeight?: number;
  /** 是否全局只读 */
  readonly?: boolean;
  /** 是否允许多选 */
  allowMultiSelect?: boolean;
  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 是否显示复选框列 */
  showCheckbox?: boolean;
  /** 主题 */
  theme?: Theme;
  /** 行号列宽度 */
  rowNumberWidth?: number;
  /** 最大撤销步数 */
  maxHistorySize?: number;
  /** 允许插入行 */
  allowInsertRow?: boolean;
  /** 允许删除行 */
  allowDeleteRow?: boolean;
  /** 允许插入列 */
  allowInsertColumn?: boolean;
  /** 允许删除列 */
  allowDeleteColumn?: boolean;
  /** 虚拟滚动缓冲区大小（行数） */
  virtualScrollBuffer?: number;
}

/**
 * 事件类型映射
 */
export interface SheetEventMap {
  // 单元格事件
  'cell:click': CellEvent;
  'cell:dblclick': CellEvent;
  'cell:mouseenter': CellEvent;
  'cell:mouseleave': CellEvent;
  'cell:contextmenu': CellEvent;
  
  // 编辑事件
  'edit:start': EditEvent;
  'edit:change': EditEvent;
  'edit:end': EditEvent;
  'edit:cancel': EditEvent;
  
  // 数据事件
  'data:change': DataChangeEvent;
  'row:insert': RowEvent;
  'row:delete': RowEvent;
  'column:resize': ColumnResizeEvent;
  
  // 选择事件
  'selection:change': SelectionEvent;
  
  // 剪贴板事件
  'copy': ClipboardEvent;
  'paste': ClipboardEvent;
  
  // 历史事件
  'undo': HistoryEvent;
  'redo': HistoryEvent;
}

/**
 * 单元格事件
 */
export interface CellEvent {
  row: number;
  col: number;
  value: any;
  rowData: RowData;
  column: Column;
  originalEvent: MouseEvent;
}

/**
 * 编辑事件
 */
export interface EditEvent {
  row: number;
  col: number;
  oldValue: any;
  newValue?: any;
  rowData: RowData;
  column: Column;
}

/**
 * 数据变更事件
 */
export interface DataChangeEvent {
  type: 'set' | 'insert' | 'delete' | 'batch';
  changes: Array<{
    row: number;
    col: number;
    oldValue: any;
    newValue: any;
  }>;
}

/**
 * 行事件
 */
export interface RowEvent {
  index: number;
  data?: RowData;
}

/**
 * 列调整事件
 */
export interface ColumnResizeEvent {
  index: number;
  oldWidth: number;
  newWidth: number;
  column: Column;
}

/**
 * 选择事件
 */
export interface SelectionEvent {
  ranges: SelectionRange[];
  cells: CellPosition[];
}

/**
 * 剪贴板事件
 */
export interface ClipboardEvent {
  data: any[][];
  range: SelectionRange;
}

/**
 * 历史事件
 */
export interface HistoryEvent {
  action: 'undo' | 'redo';
  changes: DataChangeEvent;
}

/**
 * 历史记录项
 */
export interface HistoryRecord {
  changes: Array<{
    row: number;
    col: number;
    oldValue: any;
    newValue: any;
  }>;
  timestamp: number;
}

/**
 * 虚拟滚动状态
 */
export interface VirtualScrollState {
  /** 起始行索引 */
  startRow: number;
  /** 结束行索引 */
  endRow: number;
  /** 起始列索引 */
  startCol: number;
  /** 结束列索引 */
  endCol: number;
  /** 垂直偏移 */
  offsetY: number;
  /** 水平偏移 */
  offsetX: number;
}

