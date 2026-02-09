/**
 * SimpleSheet - 轻量级智能表格框架
 * @n0ts123/simple-sheet
 */

// 导出主类
export { Sheet as SimpleSheet } from './core/Sheet';
export { Sheet } from './core/Sheet';

// 导出类型
export type {
  SheetOptions,
  SheetEventMap,
  Column,
  ColumnType,
  ColumnTypeConfig,
  RowData,
  CellMeta,
  CellPosition,
  SelectionRange,
  Theme,
  CellRenderer,
  CellRendererClass,
  CellEditor,
  CellEditorClass,
  SelectOption,
  CellEvent,
  EditEvent,
  DataChangeEvent,
  RowEvent,
  ColumnResizeEvent,
  SelectionEvent,
  ClipboardEvent,
  HistoryEvent,
  WrapTextMode,
  FileUploader,
  FileUploadResult,
  SortEvent,
  SortCustomEvent,
} from './types';

// 导出右键菜单插件
export {
  ContextMenu,
  createDefaultMenuItems,
  createHeaderMenuItems,
  createRowNumberMenuItems,
  type MenuItem,
  type MenuContext,
} from './plugins/ContextMenu';

// 导出渲染器
export { BaseRenderer } from './renderers/BaseRenderer';
export { TextRenderer } from './renderers/TextRenderer';
export { NumberRenderer } from './renderers/NumberRenderer';
export { DateRenderer } from './renderers/DateRenderer';
export { LinkRenderer } from './renderers/LinkRenderer';
export { ImageRenderer } from './renderers/ImageRenderer';
export { TagRenderer } from './renderers/TagRenderer';
export { ProgressRenderer } from './renderers/ProgressRenderer';
export { RatingRenderer } from './renderers/RatingRenderer';
export { CheckboxRenderer } from './renderers/CheckboxRenderer';
export { ButtonRenderer } from './renderers/ButtonRenderer';
export { EmailRenderer } from './renderers/EmailRenderer';
export { PhoneRenderer } from './renderers/PhoneRenderer';
export { MultiLinkRenderer } from './renderers/MultiLinkRenderer';
export { FileRenderer } from './renderers/FileRenderer';

// 导出 wrapText 高度预计算相关函数
export {
  precalculateRowHeights,
  cleanupMeasurementContainer,
  setPrecalculateMode,
  isPrecalculateMode,
} from './renderers/TextRenderer';

// 导出编辑器
export { BaseEditor } from './editors/BaseEditor';
export { TextEditor } from './editors/TextEditor';
export { NumberEditor } from './editors/NumberEditor';
export { DateEditor } from './editors/DateEditor';
export { SelectEditor } from './editors/SelectEditor';

// 导出插件
export { ColumnResizer } from './plugins/ColumnResizer';
export { AutoFill } from './plugins/AutoFill';
export { ColumnReorder } from './plugins/ColumnReorder';
export { RowReorder } from './plugins/RowReorder';
export { ColumnTypePicker, COLUMN_TYPES, createColumnByType } from './plugins/ColumnTypePicker';
export { MultiValueEditor, showMultiValueEditor } from './plugins/MultiValueEditor';
export { FilePasteHandler } from './plugins/FilePasteHandler';
export {
  ColumnConfigDialog,
  showCreateColumnDialog,
  showEditColumnDialog,
  DATE_FORMATS,
  NUMBER_PREFIXES,
  NUMBER_SUFFIXES,
} from './plugins/ColumnConfigDialog';

export { Validator, ValidationRules } from './plugins/Validator';
export type { ValidationRule, ValidationResult, ValidatorType } from './plugins/Validator';

export { Sorter } from './plugins/Sorter';
export type { SortConfig, SortComparator } from './plugins/Sorter';

export { Filter, FilterConditions } from './plugins/Filter';
export type { FilterCondition, FilterOperator, ColumnFilterValues } from './plugins/Filter';

export { Search } from './plugins/Search';
export type { SearchOptions, SearchResult } from './plugins/Search';

export { MergeCell } from './plugins/MergeCell';
export type { MergeInfo } from './plugins/MergeCell';

export { FreezePane } from './plugins/FreezePane';
export type { FreezePaneConfig } from './plugins/FreezePane';

export { ConditionalFormat, ConditionalFormatRules } from './plugins/ConditionalFormat';
export type { ConditionalFormatRule, ConditionalFormatType, FormatStyle } from './plugins/ConditionalFormat';

// 导出工具函数
export {
  columnIndexToLetter,
  letterToColumnIndex,
  getCellAddress,
  parseCellAddress,
} from './utils/helpers';

// 导出提示组件
export { Toast, showToast } from './utils/Toast';
export type { ToastType, ToastOptions } from './utils/Toast';
