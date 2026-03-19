/**
 * 单元格位�?
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
 * 列类�?
 */
export type ColumnType = 
  | 'text'      // 文本
  | 'number'    // 数字
  | 'date'      // 日期
  | 'boolean'   // 布尔
  | 'select'    // 下拉选择
  | 'email'     // 邮箱（支持多值）
  | 'phone'     // 手机号（支持多值）
  | 'link'      // 链接（支持多值）
  | 'file'      // 文件/图片
  | 'custom';   // 自定�?

/**
 * 列类型配�?
 */
export interface ColumnTypeConfig {
  /** 类型标识 */
  type: ColumnType;
  /** 显示名称 */
  label: string;
  /** 图标 */
  icon: string;
  /** 分组 */
  group?: string;
  /** 描述 */
  description?: string;
}

/**
 * 文件上传器接�?
 */
export interface FileUploader {
  /** 上传文件 */
  upload(file: File): Promise<FileUploadResult>;
}

/**
 * 文件上传结果
 */
export interface FileUploadResult {
  /** 文件URL */
  url: string;
  /** 文件�?*/
  name?: string;
  /** 文件大小 */
  size?: number;
  /** 文件类型 */
  type?: string;
}

/**
 * 多行文本显示模式
 */
export type WrapTextMode =
  | false           // 不换行，溢出省略
  | 'ellipsis'      // 显示第一�?省略号，点击可预�?
  | 'wrap'          // 自动换行，行高自适应（需要配�?rowHeights 选项使用�?
  | 'fixed';        // 自动换行，但不自动调整行高，使用固定行高

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * 列定�?
 */
export interface Column {
  /** 列标识键 */
  key: string;
  /** 列标�?*/
  title: string;
  /** 列宽�?*/
  width?: number;
  /** 最小宽�?*/
  minWidth?: number;
  /** 最大宽�?*/
  maxWidth?: number;
  /** 列类�?*/
  type?: ColumnType;
  /** 是否只读 */
  readonly?: boolean;
  /** 是否可调整宽�?*/
  resizable?: boolean;
  /** 是否可排�?*/
  sortable?: boolean;
  /** 自定义渲染器 */
  renderer?: CellRendererClass;
  /** 自定义编辑器 */
  editor?: CellEditorClass;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 格式化函�?*/
  formatter?: (value: any, rowData: RowData, column: Column) => string;
  /** 下拉选项（type �?select 时使用） */
  options?: SelectOption[];
  /** 是否支持多选（type �?select 时使用） */
  multiple?: boolean;
  /** 多行文本显示模式 */
  wrapText?: WrapTextMode;
  /** 最大显示行数（超过此行数显示省略号），仅在 wrapText �?'wrap' 时生�?*/
  maxLines?: number;
  /** 是否可编�?*/
  editable?: boolean;
  
  // ===== 表头样式配置 =====
  /** 表头背景颜色 */
  headerBgColor?: string;
  /** 表头文字颜色 */
  headerTextColor?: string;
  
  // ===== 数字类型配置 =====
  /** 小数位数（type �?number 时使用） */
  decimalPlaces?: number;
  /** 数字前缀（如 ¥�?�?*/
  numberPrefix?: string;
  /** 数字后缀（如 %、元�?*/
  numberSuffix?: string;
  /** 是否使用千分位分隔符 */
  useThousandSeparator?: boolean;
  
  // ===== 日期类型配置 =====
  /** 日期格式（type �?date 时使用） */
  dateFormat?: string;

  // ===== 文件类型配置 =====
  /** 文件上传配置（type �?file 时使用） */
  fileUpload?: FileUploadConfig;

  // ===== 右键菜单配置 =====
  /** 右键菜单配置（可选） */
  contextMenu?: ColumnContextMenuConfig;

  // ===== 自定义悬浮窗配置 =====
  /** 自定义悬浮窗配置（点击单元格时显示） */
  expandPopover?: ExpandPopoverConfig;
}

/**
 * 文件上传配置
 */
export interface FileUploadConfig {
  /**
   * 自定义文件上传函�?
   * 返回 Promise，resolve 时传入文件的 URL
   * 如果提供此函数，将使用自定义上传而非默认上传
   */
  onUpload?: (file: File) => Promise<string>;
  
  /** 允许的文件类型（MIME 类型或扩展名，如 ['image/*', '.pdf']�?*/
  accept?: string[];
  
  /** 最大文件大小（字节），默认 10MB */
  maxSize?: number;
  
  /** 是否允许多�?*/
  multiple?: boolean;
  
  /** 上传按钮文本 */
  uploadText?: string;
  
  /** 拖拽区域提示文本 */
  dragText?: string;
}

/**
 * 列级右键菜单配置
 */
export interface ColumnContextMenuConfig {
  /** 禁用该列的复制功能（默认 false�?*/
  disableCopy?: boolean;
  /** 禁用该列的剪切功能（默认 false�?*/
  disableCut?: boolean;
  /** 禁用该列的粘贴功能（默认 false�?*/
  disablePaste?: boolean;
  /** 禁用该列的清空功能（默认 false�?*/
  disableClear?: boolean;
  /** 禁用该列的排序功能（默认 false�?*/
  disableSort?: boolean;
}

/**
 * 表格级右键菜单配�?
 */
export interface ContextMenuOptions {
  /** ===== 基础操作 ===== */
  /** 显示复制菜单项（默认 true�?*/
  showCopy?: boolean;
  /** 显示剪切菜单项（默认 true�?*/
  showCut?: boolean;
  /** 显示粘贴菜单项（默认 true�?*/
  showPaste?: boolean;
  /** 显示全选菜单项（默�?true�?*/
  showSelectAll?: boolean;

  /** ===== 行操�?===== */
  /** 显示向上插入行（默认 true�?*/
  showInsertRowAbove?: boolean;
  /** 显示向下插入行（默认 true�?*/
  showInsertRowBelow?: boolean;
  /** 显示删除行（默认 true�?*/
  showDeleteRow?: boolean;
  /** 显示清空行（默认 true�?*/
  showClearRow?: boolean;

  /** ===== 列操�?===== */
  /** 显示向左插入列（默认 true�?*/
  showInsertColumnLeft?: boolean;
  /** 显示向右插入列（默认 true�?*/
  showInsertColumnRight?: boolean;
  /** 显示删除列（默认 true�?*/
  showDeleteColumn?: boolean;
  /** 显示清空列（默认 true�?*/
  showClearColumn?: boolean;

  /** ===== 排序和筛�?===== */
  /** 显示升序排序（默�?true�?*/
  showSortAsc?: boolean;
  /** 显示降序排序（默�?true�?*/
  showSortDesc?: boolean;
  /** 显示取消排序（默�?true�?*/
  showSortCancel?: boolean;
  /** 显示筛选菜单（默认 true�?*/
  showFilter?: boolean;

  /** ===== 单元格操�?===== */
  /** 显示合并单元格（默认 true�?*/
  showMergeCell?: boolean;
  /** 显示取消合并（默�?true�?*/
  showUnmergeCell?: boolean;

  /** ===== 冻结功能 ===== */
  /** 显示冻结菜单（默认 true） */
  showFreeze?: boolean;

  /** ===== 自定义菜单项 ===== */
  /** 自定义菜单项 */
  customItems?: MenuItem[];

  /** ===== 回调函数 ===== */
  /** 编辑列配置回�?*/
  onEditColumn?: (context: MenuContext) => void;
  /** 插入列左侧回�?*/
  onInsertColumnLeft?: (context: MenuContext) => void;
  /** 插入列右侧回�?*/
  onInsertColumnRight?: (context: MenuContext) => void;
  /** 删除列回�?*/
  onDeleteColumn?: (context: MenuContext) => void;
  /** 隐藏列回�?*/
  onHideColumn?: (context: MenuContext) => void;
  /** 显示所有列回调 */
  onShowAllColumns?: (context: MenuContext) => void;
}

/**
 * 右键菜单�?
 */
export interface MenuItem {
  /** 菜单项标�?*/
  key?: string;
  /** 显示文本 */
  label: string;
  /** 图标（可选） */
  icon?: string;
  /** 快捷键提示（可选） */
  shortcut?: string;
  /** 是否禁用（可选） */
  disabled?: boolean;
  /** 是否隐藏（可选） */
  hidden?: boolean;
  /** 分隔�?*/
  type?: 'divider';
  /** 子菜单（可选） */
  children?: MenuItem[];
  /** 点击事件 */
  action?: (context: MenuContext) => void;
}

/**
 * 右键菜单上下�?
 */
export interface MenuContext {
  /** 点击位置 */
  position: CellPosition | null;
  /** 当前选区 */
  selection: SelectionRange[];
  /** 选中的单元格 */
  selectedCells: CellPosition[];
  /** 原始鼠标事件 */
  originalEvent: MouseEvent;
  /** 点击区域类型 */
  clickArea?: 'cell' | 'header' | 'rowNumber' | 'corner';
  /** 如果点击表头，包含列索引 */
  headerColIndex?: number;
  /** 如果点击行号，包含行索引 */
  rowNumberIndex?: number;
}

/**
 * 下拉选项
 */
export interface SelectOption {
  label: string;
  value: any;
  /** 标签颜色（背景色�?*/
  color?: string;
  /** 文字颜色（可选，默认根据背景色自动计算） */
  textColor?: string;
}

/**
 * 行数�?
 */
export type RowData = Record<string, any>;

/**
 * 单元格元数据
 */
export interface CellMeta {
  /** 是否只读 */
  readonly?: boolean;
  /** 自定义样�?*/
  style?: Partial<CSSStyleDeclaration>;
  /** 自定义类�?*/
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
  /** 渲染单元格内�?*/
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void;
  /** 销毁时清理 */
  destroy?(): void;
}

/**
 * 单元格渲染器�?
 */
export interface CellRendererClass {
  new (): CellRenderer;
}

/**
 * 单元格编辑器接口
 */
export interface CellEditor {
  /** 创建编辑�?*/
  create(container: HTMLElement, value: any, rowData: RowData, column: Column): void;
  /** 获取编辑后的�?*/
  getValue(): any;
  /** 聚焦编辑�?*/
  focus(): void;
  /** 验证 */
  validate?(): boolean | string;
  /** 销毁编辑器 */
  destroy(): void;
}

/**
 * 单元格编辑器�?
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
  /** 列定�?*/
  columns: Column[];
  /** 初始数据 */
  data?: RowData[];
  /** 行高 */
  rowHeight?: number;
  /** 表头高度 */
  headerHeight?: number;
  /** 是否全局只读 */
  readonly?: boolean;
  /** 是否允许多�?*/
  allowMultiSelect?: boolean;
  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 是否显示复选框�?*/
  showCheckbox?: boolean;
  /** 主题 */
  theme?: Theme;
  /** 行号列宽�?*/
  rowNumberWidth?: number;
  /** 最大撤销步数 */
  maxHistorySize?: number;
  /** 允许插入�?*/
  allowInsertRow?: boolean;
  /** 允许删除�?*/
  allowDeleteRow?: boolean;
  /** 允许插入�?*/
  allowInsertColumn?: boolean;
  /** 允许删除�?*/
  allowDeleteColumn?: boolean;
  /** 虚拟滚动缓冲区大小（行数�?*/
  virtualScrollBuffer?: number;
  /** 表格上下边距（像素），用于压缩空间展示更多数�?*/
  verticalPadding?: number;
  /** 预计算的行高（用�?wrapText 模式），Map<rowIndex, height> */
  rowHeights?: Map<number, number>;
  /** 启用右键菜单（默�?true�?*/
  enableContextMenu?: boolean;
  /** 右键菜单配置 */
  contextMenuOptions?: ContextMenuOptions;
  /** 提示文本配置 */
  toastMessages?: {
    /** 只读单元格双击提�?*/
    readonlyCellEdit?: string;
    /** 复制成功提示 */
    copySuccess?: string;
    /** 粘贴成功提示 */
    pasteSuccess?: string;
    /** 粘贴失败提示 */
    pasteFailed?: string;
    /** 其他操作提示 */
    [key: string]: string | undefined;
  };
  /** ===== 功能开关配置（默认全部开启） ===== */
  features?: {
    /** 启用列拖拽排序（默认 true�?*/
    columnReorder?: boolean;
    /** 启用行拖拽排序（默认 true�?*/
    rowReorder?: boolean;
    /** 启用列宽调整（默�?true�?*/
    columnResize?: boolean;
    /** 启用自动填充（默�?true�?*/
    autoFill?: boolean;
    /** 启用排序功能（默�?true�?*/
    sorter?: boolean;
    /** 启用筛选功能（默认 true�?*/
    filter?: boolean;
    /** 启用搜索功能（默�?true�?*/
    search?: boolean;
    /** 启用单元格验证（默认 true�?*/
    validator?: boolean;
    /** 启用文件粘贴处理（默�?true�?*/
    filePaste?: boolean;
  };
  // TODO: 冻结功能开发中
  // freeze?: {
  //   /** 冻结行数（从顶部，包括表头） */
  //   rows?: number;
  //   /** 冻结列数（从左侧，包括行号列�?*/
  //   cols?: number;
  // };
}

/**
 * 填充方向
 */
export type FillDirection = 'down' | 'up' | 'right' | 'left';

/**
 * 填充事件
 */
export interface FillEvent {
  sourceRange: SelectionRange;
  targetRange: SelectionRange;
  direction: FillDirection;
}

/**
 * 行选择事件
 */
export interface RowSelectEvent {
  row: number;
  originalEvent: MouseEvent;
}

/**
 * 列选择事件
 */
export interface ColumnSelectEvent {
  col: number;
  originalEvent: MouseEvent;
}

/**
 * 列插入事�?
 */
export interface ColumnInsertEvent {
  index: number;
  column: Column;
}

/**
 * 列删除事�?
 */
export interface ColumnDeleteEvent {
  index: number;
  column: Column;
}

/**
 * 事件类型映射
 */
export interface SheetEventMap {
  // 单元格事�?
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
  'edit:input': EditEvent;
  
  // 数据事件
  'data:change': DataChangeEvent;
  'row:insert': RowEvent;
  'row:delete': RowEvent;
  'row:select': RowSelectEvent;
  'row:hide': RowHideEvent;
  'row:show': RowShowEvent;
  'row:reorder': RowReorderEvent;
  'column:resize': ColumnResizeEvent;
  'column:insert': ColumnInsertEvent;
  'column:delete': ColumnDeleteEvent;
  'column:select': ColumnSelectEvent;
  'column:hide': ColumnHideEvent;
  'column:show': ColumnShowEvent;
  'column:reorder': ColumnReorderEvent;
  
  // 选择事件
  'selection:change': SelectionEvent;
  
  // 填充事件
  'fill': FillEvent;
  
  // 剪贴板事�?
  'copy': ClipboardEvent;
  'paste': ClipboardEvent;
  'cut': ClipboardEvent;
  
  // 历史事件
  'undo': HistoryEvent;
  'redo': HistoryEvent;

  // 排序事件
  'sort:change': SortEvent;
  'sort:custom': SortCustomEvent;

  // 筛选事�?
  'filter:change': FilterChangeEvent;

  // 文件上传事件
  'file:paste:start': FilePasteStartEvent;
  'file:paste': FilePasteEvent;
  'file:paste:error': FilePasteErrorEvent;

  // 验证事件
  'validation:error': ValidationErrorEvent;

  // 配置变更事件
  'config:change': SheetConfigChangeEvent;

  // 冻结事件
  'freeze:change': FreezeChangeEvent;

  // 日志事件
  'log': LogEvent;
}

/**
 * 配置变更类型
 */
export type ConfigChangeType =
  | 'sort'           // 排序变更
  | 'column-resize'  // 列宽调整
  | 'column-reorder' // 列顺序调�?
  | 'column-insert'  // 列插�?
  | 'column-delete'  // 列删�?
  | 'column-hide'    // 列隐�?
  | 'column-show'    // 列显�?
  | 'column-update'  // 列配置更�?
  | 'row-reorder'    // 行顺序调�?
  | 'row-insert'     // 行插�?
  | 'row-delete'     // 行删�?
  | 'row-hide'       // 行隐�?
  | 'row-show'       // 行显�?
  | 'freeze'         // 冻结设置变更
  | 'merge'          // 合并单元�?
  | 'filter'         // 筛选变�?
  | 'load';          // 初始加载

/**
 * 表格配置快照
 */
export interface SheetConfigSnapshot {
  /** 列配置列表（包含 width、key 等） */
  columns: Column[];
  /** 排序状态（column 为索引，direction 为方向） */
  sort?: {
    column: number;
    direction: 'asc' | 'desc' | null;
  };
  /** 冻结设置（row 为冻结行数，col 为冻结列数） */
  freeze?: {
    row?: number;
    col?: number;
  };
  /** 合并单元格信�?*/
  merges?: MergeInfo[];
  /** 筛选条�?*/
  filter?: FilterCondition[];
  /** 行顺序映射（当前索引 -> 原始索引�?*/
  rowOrder?: number[];
}

/**
 * 表格配置变更事件
 */
export interface SheetConfigChangeEvent {
  /** 变更类型 */
  type: ConfigChangeType;
  /** 变更详情 */
  detail: {
    column?: number;       // 列索�?
    oldWidth?: number;     // 旧宽�?
    newWidth?: number;     // 新宽�?
    fromIndex?: number;    // 源位�?
    toIndex?: number;      // 目标位置
    columnConfig?: Column;  // 列配�?
    mergeInfo?: MergeInfo;  // 合并信息
    [key: string]: any;
  };
  /** 完整的配置快�?*/
  snapshot: SheetConfigSnapshot;
  /** 变更时间�?*/
  timestamp: number;
}

/**
 * 单元格事�?
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
  // 单个变更的快捷访问（兼容旧代码）
  row?: number;
  col?: number;
  oldValue?: any;
  newValue?: any;
}

/**
 * 行事�?
 */
export interface RowEvent {
  index: number;
  data?: RowData;
}

/**
 * 列调整事�?
 */
export interface ColumnResizeEvent {
  index: number;
  oldWidth: number;
  newWidth: number;
  column: Column;
}

/**
 * 列隐藏事�?
 */
export interface ColumnHideEvent {
  index: number;
  column: Column;
}

/**
 * 列显示事�?
 */
export interface ColumnShowEvent {
  index: number;
  column: Column;
}

/**
 * 行隐藏事�?
 */
export interface RowHideEvent {
  index: number;
  rowData: RowData;
}

/**
 * 行显示事�?
 */
export interface RowShowEvent {
  index: number;
  rowData: RowData;
}

/**
 * 行排序事�?
 */
export interface RowReorderEvent {
  fromIndex: number;
  toIndex: number;
  rowData: RowData;
}

/**
 * 列排序事�?
 */
export interface ColumnReorderEvent {
  fromIndex: number;
  toIndex: number;
  column: Column;
}

/**
 * 筛选变更事�?
 */
export interface FilterChangeEvent {
  filters: FilterCondition[];
}

/**
 * 文件粘贴开始事�?
 */
export interface FilePasteStartEvent {
  files: File[];
  row: number;
  col: number;
}

/**
 * 文件粘贴成功事件
 */
export interface FilePasteEvent {
  result: FileUploadResult;
  row: number;
  col: number;
}

/**
 * 文件粘贴错误事件
 */
export interface FilePasteErrorEvent {
  file: File;
  error: Error;
  row: number;
  col: number;
}

/**
 * 验证错误事件
 */
export interface ValidationErrorEvent {
  row: number;
  col: number;
  message: string;
  value: any;
}

/**
 * 日志事件
 */
export interface LogEvent {
  message: string;
  type?: 'info' | 'warn' | 'error';
  timestamp?: number;
}

/**
 * 选择事件
 */
export interface SelectionEvent {
  ranges: SelectionRange[];
  cells: CellPosition[];
}

/**
 * 剪贴板事�?
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
 * 历史记录�?
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
 * 虚拟滚动状�?
 */
export interface VirtualScrollState {
  /** 起始行索�?*/
  startRow: number;
  /** 结束行索�?*/
  endRow: number;
  /** 起始列索�?*/
  startCol: number;
  /** 结束列索�?*/
  endCol: number;
  /** 垂直偏移 */
  offsetY: number;
  /** 水平偏移 */
  offsetX: number;
}

/**
 * 排序事件
 */
export interface SortEvent {
  /** 排序列索�?*/
  column: number;
  /** 排序方向 */
  direction: 'asc' | 'desc' | null;
  /** 当前数据 */
  data: RowData[];
}

/**
 * 自定义排序事件（用于远程排序�?
 */
export interface SortCustomEvent {
  /** 排序列索�?*/
  column: number;
  /** 排序方向 */
  direction: 'asc' | 'desc';
  /** 阻止默认排序行为 */
  preventDefault: () => void;
  /** 获取当前数据 */
  getData: () => RowData[];
  /** 设置排序后的数据 */
  setData: (data: RowData[]) => void;
}

/**
 * 冻结变更事件
 */
export interface FreezeChangeEvent {
  /** 是否冻结表头 */
  freezeHeader: boolean;
  /** 冻结列数 */
  frozenCols: number;
}

/**
 * 悬浮窗内容类�?
 */
export type PopoverContentType =
  | 'text'        // 纯文�?
  | 'html'         // HTML 内容
  | 'link'         // 链接（显示地址 + 复制/打开按钮�?
  | 'email'        // 邮箱（显示地址 + 复制/发送邮件按钮）
  | 'phone'        // 电话（显示号�?+ 复制/拨打按钮�?
  | 'tags'         // 标签列表
  | 'file'         // 文件列表（支持图片预览、删除、添加）
  | 'custom';      // 自定义内�?

/**
 * 悬浮窗操作按钮配�?
 */
export interface PopoverAction {
  /** 按钮标签 */
  label: string;
  /** 按钮图标（SVG �?emoji�?*/
  icon?: string;
  /** 是否为主要按钮样�?*/
  primary?: boolean;
  /** 点击事件 */
  action: (value: any, close: () => void) => void;
}

/**
 * 悬浮窗配�?
 */
export interface ExpandPopoverConfig {
  /** 悬浮窗类�?*/
  type: PopoverContentType;

  /** ===== 通用配置 ===== */
  /** 悬浮窗宽�?*/
  width?: number;
  /** 最大宽度（默认 300�?*/
  maxWidth?: number;
  /** 悬浮窗标�?*/
  title?: string;
  /** 是否显示关闭按钮 */
  showClose?: boolean;

  /** ===== 文本/HTML 内容配置 ===== */
  /** �?type �?text/html 时使�?*/
  content?: string;

  /** ===== 链接/邮箱/电话配置 ===== */
  /** 值字段（�?rowData 中获取） */
  valueField?: string;
  /** 显示文本字段（可选，默认使用值） */
  displayField?: string;

  /** ===== 标签配置 ===== */
  /** 标签值字段（�?rowData 中获取，支持数组或逗号分隔字符串） */
  tagsField?: string;
  /** 标签选项配置 */
  tagOptions?: Array<{
    value: any;
    label: string;
    color?: string;
    textColor?: string;
  }>;
  /** 是否支持多选（默认 false�?*/
  multiple?: boolean;
  /** 值变化回调（用于 select/tags 类型�?*/
  onChange?: (value: any) => void;

  /** ===== 自定义内容配�?===== */
  /** 自定义渲染函�?*/
  render?: (value: any, rowData: RowData) => HTMLElement | string;

  /** ===== 文件列表配置（type �?file 时使用） ===== */
  /** 文件列表 */
  files?: Array<{ url: string; name?: string; type?: string }>;
  /** 是否只读（不显示删除/添加按钮�?*/
  readonly?: boolean;
  /** 删除文件回调 */
  onDeleteFile?: (file: { url: string; name?: string; type?: string }, index: number) => void;
  /** 添加文件回调 */
  onAddFile?: () => void;
  /** 文件上传配置 */
  fileUpload?: {
    accept?: string[];
    maxSize?: number;
    onUpload?: (file: File) => Promise<{ url: string; name?: string; type?: string }>;
  };

  /** ===== 操作按钮配置 ===== */
  /** 额外操作按钮 */
  actions?: PopoverAction[];

  /** ===== 行为配置 ===== */
  /** 点击悬浮窗外部是否自动关闭（默认 true�?*/
  closeOnBlur?: boolean;
  /** 双击悬浮窗是否进入编辑模式（默认 false�?*/
  dblClickToEdit?: boolean;
}

// ============================================
// 从插件中重新导出的类�?
// ============================================

/**
 * 筛选条件（�?Filter 插件重新导出�?
 */
export interface FilterCondition {
  /** 列索引或 key */
  column: number | string;
  /** 操作�?*/
  operator: string;
  /** 筛选�?*/
  value?: any;
  /** 第二个值（用于 between�?*/
  value2?: any;
}

/**
 * 合并单元格信息（�?MergeCell 插件重新导出�?
 */
export interface MergeInfo {
  /** 起始�?*/
  startRow: number;
  /** 起始�?*/
  startCol: number;
  /** 行跨�?*/
  rowspan: number;
  /** 列跨�?*/
  colspan: number;
}

