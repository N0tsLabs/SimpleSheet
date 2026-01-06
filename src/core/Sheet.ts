/**
 * SimpleSheet 主类
 * 表格的入口，协调各模块工作
 */

import { EventEmitter } from './EventEmitter';
import { DataModel } from './DataModel';
import { SelectionManager } from './SelectionManager';
import { HistoryManager } from './HistoryManager';
import { KeyboardManager } from './KeyboardManager';
import { ClipboardManager } from './ClipboardManager';
import { Renderer } from '../render/Renderer';
import { EditorManager } from '../editors/EditorManager';
import { AutoFill } from '../plugins/AutoFill';
import { RowReorder } from '../plugins/RowReorder';
import { FilePasteHandler } from '../plugins/FilePasteHandler';
import type {
  FileUploader,
  SheetOptions,
  SheetEventMap,
  Column,
  RowData,
  CellMeta,
  Theme,
  CellPosition,
  SelectionRange,
} from '../types';
import { addEvent, addEvents, getMousePosition } from '../utils/dom';
import { normalizeRange } from '../utils/helpers';
import { showExpandOverlay, hideExpandOverlay, setExpandOverlayDblClickHandler, getCurrentExpandCell } from '../renderers/TextRenderer';
import { showImagePreview } from '../plugins/ImageViewer';
import { showLinkPopover, closeLinkPopover } from '../plugins/LinkPopover';
import { showTagsPopover, closeTagsPopover } from '../plugins/TagsPopover';

// 导入样式
import '../styles/index.css';

const DEFAULT_OPTIONS: Required<Omit<SheetOptions, 'columns'>> = {
  data: [],
  rowHeight: 32,
  headerHeight: 36,
  readonly: false,
  allowMultiSelect: true,
  showRowNumber: true,
  showCheckbox: false,
  theme: 'auto',
  rowNumberWidth: 50,
  maxHistorySize: 100,
  allowInsertRow: true,
  allowDeleteRow: true,
  allowInsertColumn: true,
  allowDeleteColumn: true,
  virtualScrollBuffer: 5,
};

export class Sheet extends EventEmitter<SheetEventMap> {
  private container: HTMLElement;
  private options: Required<SheetOptions>;
  
  private dataModel: DataModel;
  private selectionManager: SelectionManager;
  private historyManager: HistoryManager;
  private keyboardManager: KeyboardManager;
  private clipboardManager: ClipboardManager;
  private editorManager: EditorManager;
  private renderer: Renderer;
  private autoFill: AutoFill;
  private rowReorder: RowReorder;
  private filePasteHandler: FilePasteHandler;
  
  private cleanupFns: Array<() => void> = [];
  private isDestroyed = false;
  
  // 双击检测
  private lastClickTime = 0;
  private lastClickCell: { row: number; col: number } | null = null;

  constructor(container: string | HTMLElement, options: SheetOptions) {
    super();
    
    // 获取容器元素
    if (typeof container === 'string') {
      const el = document.querySelector(container);
      if (!el) {
        throw new Error(`Container element not found: ${container}`);
      }
      this.container = el as HTMLElement;
    } else {
      this.container = container;
    }
    
    // 合并配置
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<SheetOptions>;
    
    // 初始化各模块
    this.dataModel = new DataModel(this.options.columns, this.options.data);
    
    this.selectionManager = new SelectionManager(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    
    this.historyManager = new HistoryManager(this.options.maxHistorySize);
    this.keyboardManager = new KeyboardManager();
    this.clipboardManager = new ClipboardManager();
    this.editorManager = new EditorManager();
    
    this.renderer = new Renderer(this.container, {
      columns: this.options.columns,
      rowCount: this.dataModel.getRowCount() || 1,
      rowHeight: this.options.rowHeight,
      headerHeight: this.options.headerHeight,
      showRowNumber: this.options.showRowNumber,
      rowNumberWidth: this.options.rowNumberWidth,
      virtualScrollBuffer: this.options.virtualScrollBuffer,
    });
    
    // 初始化自动填充插件
    this.autoFill = new AutoFill({
      getCellValue: (row, col) => this.dataModel.getCellValue(row, col),
      setCellValue: (row, col, value) => this.dataModel.setCellValue(row, col, value),
      getCellRect: (row, col) => this.renderer.getCellRect(row, col),
      getCellFromPoint: (x, y) => this.renderer.getCellFromPoint(x, y),
      getSelection: () => this.selectionManager.getPrimaryRange(),
      maxRow: this.dataModel.getRowCount() || 1,
      maxCol: this.dataModel.getColumnCount(),
    });
    
    // 初始化行拖拽排序插件
    this.rowReorder = new RowReorder({
      getData: () => this.dataModel.getData(),
      moveRow: (from, to) => this.moveRow(from, to),
      getRowHeight: () => this.options.rowHeight,
      getHeaderHeight: () => this.options.headerHeight,
      rowNumberWidth: this.options.rowNumberWidth,
      getScrollTop: () => this.renderer.getVirtualScroll().getScrollTop(),
    });
    
    // 初始化文件粘贴处理器
    this.filePasteHandler = new FilePasteHandler({
      getActiveCell: () => this.selectionManager.getActiveCell(),
      getColumnType: (col) => this.options.columns[col]?.type,
      setCellValue: (row, col, value) => {
        this.dataModel.setCellValue(row, col, value);
        this.renderer.refreshCell(row, col);
      },
      getCellValue: (row, col) => this.dataModel.getCellValue(row, col),
    });
    
    // 设置
    this.setup();
  }

  /**
   * 初始化设置
   */
  private setup(): void {
    // 设置主题
    this.setTheme(this.options.theme);
    
    // 设置数据获取器
    this.renderer.setDataGetter(
      (row, col) => {
        // 检查行列是否隐藏
        if (this.dataModel.isRowHidden(row) || this.dataModel.isColumnHidden(col)) {
          return undefined;
        }
        return this.dataModel.getCellValue(row, col);
      },
      (row) => {
        // 检查行是否隐藏
        if (this.dataModel.isRowHidden(row)) {
          return {};
        }
        return this.dataModel.getRowData(row) || {};
      },
      (row, col) => {
        // 检查行列是否隐藏
        if (this.dataModel.isRowHidden(row) || this.dataModel.isColumnHidden(col)) {
          return undefined;
        }
        return this.dataModel.getCellMeta(row, col);
      }
    );
    
    // 设置单元格值变化回调（用于复选框等直接点击修改的场景）
    this.renderer.setOnCellChange((row, col, value) => {
      if (this.options.readonly) return;
      
      const column = this.options.columns[col];
      if (column?.readonly) return;
      
      const oldValue = this.dataModel.getCellValue(row, col);
      this.dataModel.setCellValue(row, col, value);
      
      // 记录历史
      this.historyManager.record([{ row, col, oldValue, newValue: value }]);
      
      // 发出事件
      this.emit('data:change' as any, {
        row,
        col,
        oldValue,
        newValue: value,
        rowData: this.dataModel.getRowData(row) || {},
        column,
      });
      
      // 重新渲染
      this.renderer.render();
    });
    
    // 设置编辑器层
    const editorLayer = this.renderer.getEditorLayer();
    if (editorLayer) {
      this.editorManager.setEditorLayer(editorLayer);
    }
    
    // 绑定键盘事件
    const root = this.renderer.getRoot();
    if (root) {
      root.tabIndex = 0;
      this.keyboardManager.attach(root);
    }
    
    // 挂载自动填充插件
    const selectionLayer = this.renderer.getSelectionLayer();
    if (root && selectionLayer) {
      this.autoFill.mount(root, selectionLayer);
    }
    
    // 挂载行拖拽排序插件
    if (root) {
      this.rowReorder.mount(root);
    }
    
    // 挂载文件粘贴处理器
    if (root) {
      this.filePasteHandler.mount(root);
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 初始化时清理可能存在的预览浮层（防止切换表格时预览浮层残留）
    const currentExpandCell = getCurrentExpandCell();
    if (currentExpandCell) {
      const root = this.renderer.getRoot();
      // 如果当前展开的单元格不在当前表格中，清理预览
      if (!root || !root.contains(currentExpandCell)) {
        hideExpandOverlay();
      }
    }
    
    // 设置展开浮层双击回调
    setExpandOverlayDblClickHandler((cell) => {
      const rowStr = cell.closest('[data-row]')?.getAttribute('data-row');
      const colStr = cell.getAttribute('data-col');
      if (rowStr && colStr) {
        this.startEdit(parseInt(rowStr, 10), parseInt(colStr, 10));
      }
    });
    
    // 初始渲染
    this.renderer.render();
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    const root = this.renderer.getRoot();
    if (!root) return;
    
    // 鼠标事件
    this.cleanupFns.push(
      addEvent(root, 'mousedown', this.handleMouseDown.bind(this) as EventListener),
      addEvent(root, 'contextmenu', this.handleContextMenu.bind(this) as EventListener)
    );
    
    // 全局鼠标移动和释放
    this.cleanupFns.push(
      addEvent(document, 'mousemove', this.handleMouseMove.bind(this)),
      addEvent(document, 'mouseup', this.handleMouseUp.bind(this))
    );
    
    // 键盘事件
    this.keyboardManager.on('keydown', () => {
      // 任何键盘操作都关闭悬浮窗
      closeLinkPopover();
      closeTagsPopover();
    });
    this.keyboardManager.on('navigation', this.handleNavigation.bind(this));
    this.keyboardManager.on('enter', this.handleEnter.bind(this));
    this.keyboardManager.on('tab', this.handleTab.bind(this));
    this.keyboardManager.on('escape', this.handleEscape.bind(this));
    this.keyboardManager.on('delete', this.handleDelete.bind(this));
    this.keyboardManager.on('backspace', this.handleDelete.bind(this));
    this.keyboardManager.on('copy', this.handleCopy.bind(this));
    this.keyboardManager.on('cut', this.handleCut.bind(this));
    this.keyboardManager.on('paste', this.handlePaste.bind(this));
    this.keyboardManager.on('undo', this.handleUndo.bind(this));
    this.keyboardManager.on('redo', this.handleRedo.bind(this));
    this.keyboardManager.on('selectAll', this.handleSelectAll.bind(this));
    this.keyboardManager.on('home', this.handleHome.bind(this));
    this.keyboardManager.on('end', this.handleEnd.bind(this));
    
    // 数据变更事件
    this.dataModel.on('change', (event) => {
      this.historyManager.record(event.changes);
      this.renderer.render();
      this.emit('data:change', event);
    });
    
    // 选区变更事件
    this.selectionManager.on('change', (event) => {
      this.renderer.updateSelection(event.cells, this.selectionManager.getActiveCell());
      this.emit('selection:change', event);
      
      // 更新填充手柄位置
      const primaryRange = this.selectionManager.getPrimaryRange();
      if (!this.options.readonly && primaryRange) {
        this.autoFill.updateHandlePosition(primaryRange);
      } else {
        this.autoFill.hideHandle();
      }
      
      // 处理多行文本展开显示
      this.handleCellExpand(event.cells);
    });
    
    // 自动填充事件
    this.autoFill.on('fill:start', () => {
      // 开始填充时，记录历史批次
      this.historyManager.startBatch();
    });
    
    this.autoFill.on('fill:end', ({ sourceRange, targetRange, direction, mode }) => {
      // 填充完成，结束历史批次
      this.historyManager.endBatch();
      
      // 更新选区到包含源和目标的完整范围
      const normalized = normalizeRange(sourceRange);
      const targetNormalized = normalizeRange(targetRange);
      
      let newStartRow = Math.min(normalized.start.row, targetNormalized.start.row);
      let newEndRow = Math.max(normalized.end.row, targetNormalized.end.row);
      let newStartCol = Math.min(normalized.start.col, targetNormalized.start.col);
      let newEndCol = Math.max(normalized.end.col, targetNormalized.end.col);
      
      this.selectionManager.selectRange(newStartRow, newStartCol, newEndRow, newEndCol);
      
      // 重新渲染
      this.renderer.render();
      
      // 触发填充事件
      this.emit('fill', {
        sourceRange: normalized,
        targetRange: targetNormalized,
        direction,
      });
    });
    
    // 编辑器事件
    this.editorManager.on('end', (event) => {
      this.emit('edit:end', event);
    });
    
    // 滚动时更新填充手柄位置
    this.renderer.getVirtualScroll().on('scroll', () => {
      const primaryRange = this.selectionManager.getPrimaryRange();
      if (!this.options.readonly && primaryRange) {
        this.autoFill.updateHandlePosition(primaryRange);
      }
    });
    
    // 行拖拽排序事件
    this.rowReorder.on('reorder:end', ({ fromIndex, toIndex }) => {
      this.emit('row:reorder' as any, { fromIndex, toIndex });
      this.renderer.render();
    });
    
    // 文件粘贴事件
    this.filePasteHandler.on('paste:complete', ({ file, result, row, col }) => {
      this.emit('file:paste' as any, { file, result, row, col });
    });
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // 只处理左键
    
    const root = this.renderer.getRoot();
    if (!root) return;
    
    // 如果正在编辑，检查是否点击在编辑器内部
    if (this.editorManager.isEditing()) {
      const target = e.target as HTMLElement;
      // 如果点击的是编辑器元素或其子元素，不结束编辑
      if (target.closest('.ss-editor')) {
        return;
      }
      this.commitEdit();
    }
    
    // 检查是否点击了预览浮层
    const target = e.target as HTMLElement;
    if (target.closest('.ss-cell-expand-overlay')) {
      // 点击了预览浮层，不处理（让预览浮层自己处理）
      return;
    }
    
    // 检查是否点击了图片预览
    const previewImg = target.closest('.ss-cell-file-img') as HTMLElement;
    if (previewImg) {
      const previewUrl = previewImg.getAttribute('data-preview-url');
      if (previewUrl) {
        e.stopPropagation();
        showImagePreview(previewUrl, previewImg.getAttribute('alt') || undefined);
        return;
      }
    }
    
    // 检查是否点击了复选框 - 复选框自己处理点击，不触发双击编辑
    const checkbox = target.closest('.ss-checkbox') as HTMLElement;
    if (checkbox) {
      // 重置双击检测，避免影响其他单元格
      this.lastClickTime = 0;
      this.lastClickCell = null;
      return; // 让复选框自己处理
    }
    
    // 关闭已有的悬浮窗
    closeLinkPopover();
    closeTagsPopover();
    
    // 如果点击的不是当前展开的单元格，关闭预览
    const currentExpandCell = getCurrentExpandCell();
    if (currentExpandCell) {
      const clickedCell = target.closest('.ss-cell');
      if (clickedCell !== currentExpandCell) {
        // 点击了其他单元格，关闭预览
        hideExpandOverlay();
      }
    }
    
    // 聚焦表格
    root.focus();
    
    // 检查是否点击了行号单元格（选中整行）
    const rowNumberCell = target.closest('.ss-row-number');
    if (rowNumberCell) {
      const row = rowNumberCell.closest('.ss-row');
      if (row) {
        const rowIndex = parseInt(row.getAttribute('data-row') || '-1', 10);
        if (rowIndex >= 0) {
          const maxCol = this.dataModel.getColumnCount() - 1;
          if (e.shiftKey && this.options.allowMultiSelect) {
            const activeCell = this.selectionManager.getActiveCell();
            if (activeCell) {
              this.selectionManager.selectRange(activeCell.row, 0, rowIndex, maxCol);
            }
          } else if (e.ctrlKey && this.options.allowMultiSelect) {
            this.selectionManager.selectRange(rowIndex, 0, rowIndex, maxCol, true);
          } else {
            this.selectionManager.selectRange(rowIndex, 0, rowIndex, maxCol);
          }
          this.renderer.render();
          this.emit('row:select', { row: rowIndex, originalEvent: e });
          return;
        }
      }
    }
    
    // 检查是否点击了列标单元格（选中整列）
    const headerCell = target.closest('.ss-header-cell:not(.ss-corner-cell)');
    if (headerCell) {
      const colIndex = parseInt(headerCell.getAttribute('data-col') || '-1', 10);
      if (colIndex >= 0) {
        const maxRow = this.dataModel.getRowCount() - 1;
        if (e.shiftKey && this.options.allowMultiSelect) {
          const activeCell = this.selectionManager.getActiveCell();
          if (activeCell) {
            this.selectionManager.selectRange(0, activeCell.col, maxRow, colIndex);
          }
        } else if (e.ctrlKey && this.options.allowMultiSelect) {
          this.selectionManager.selectRange(0, colIndex, maxRow, colIndex, true);
        } else {
          this.selectionManager.selectRange(0, colIndex, maxRow, colIndex);
        }
        this.renderer.render();
        this.emit('column:select', { col: colIndex, originalEvent: e });
        return;
      }
    }
    
    const pos = getMousePosition(e, root);
    const cell = this.renderer.getCellFromPoint(pos.x, pos.y);
    
    if (!cell) return;
    
    // 双击检测：同一单元格，300ms 内两次点击
    const now = Date.now();
    const isDoubleClick = 
      this.lastClickCell &&
      this.lastClickCell.row === cell.row &&
      this.lastClickCell.col === cell.col &&
      now - this.lastClickTime < 300;
    
    // 更新点击记录
    this.lastClickTime = now;
    this.lastClickCell = { row: cell.row, col: cell.col };
    
    if (isDoubleClick && !this.options.readonly) {
      // 双击 - 进入编辑模式
      closeLinkPopover();
      closeTagsPopover();
      this.startEdit(cell.row, cell.col);
      
      this.emit('cell:dblclick', {
        row: cell.row,
        col: cell.col,
        value: this.dataModel.getCellValue(cell.row, cell.col),
        rowData: this.dataModel.getRowData(cell.row) || {},
        column: this.options.columns[cell.col],
        originalEvent: e,
      });
      return; // 双击时不执行单击逻辑
    }
    
    // 单击逻辑
    if (e.shiftKey && this.options.allowMultiSelect) {
      // Shift+点击扩展选区
      this.selectionManager.extendSelection(cell.row, cell.col);
    } else if (e.ctrlKey && this.options.allowMultiSelect) {
      // Ctrl+点击添加到选区
      this.selectionManager.selectCell(cell.row, cell.col, true);
    } else {
      // 普通点击，开始拖拽选择
      this.selectionManager.startDragSelection(cell.row, cell.col);
    }
    
    // 滚动到单元格
    this.renderer.scrollToCell(cell.row, cell.col);
    
    // 根据列类型显示对应的悬浮窗
    const column = this.options.columns[cell.col];
    const cellValue = this.dataModel.getCellValue(cell.row, cell.col);
    
    if (column && cellValue) {
      // 获取单元格 DOM 元素用于定位悬浮窗
      const cellEl = this.renderer.getCellElement(cell.row, cell.col);
      
      if (cellEl) {
        if (column.type === 'link' || column.type === 'email' || column.type === 'phone') {
          // 链接/邮箱/电话类型 - 显示 LinkPopover
          showLinkPopover({
            type: column.type,
            value: String(cellValue),
            cell: cellEl,
          });
        } else if (column.type === 'select' && Array.isArray(cellValue) && cellValue.length > 0) {
          // 多选/标签类型（select + 数组值）- 显示 TagsPopover
          showTagsPopover({
            values: cellValue,
            options: column.options || [],
            cell: cellEl,
          });
        }
      }
    }
    
    this.emit('cell:click', {
      row: cell.row,
      col: cell.col,
      value: cellValue,
      rowData: this.dataModel.getRowData(cell.row) || {},
      column: column,
      originalEvent: e,
    });
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.selectionManager.isDragging()) return;
    
    const root = this.renderer.getRoot();
    if (!root) return;
    
    const pos = getMousePosition(e, root);
    const cell = this.renderer.getCellFromPoint(pos.x, pos.y);
    
    if (cell) {
      this.selectionManager.updateDragSelection(cell.row, cell.col);
    }
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(): void {
    this.selectionManager.endDragSelection();
  }

  /**
   * 处理右键菜单
   */
  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    
    const root = this.renderer.getRoot();
    if (!root) return;
    
    const target = e.target as HTMLElement;
    
    // 检查是否点击了表头
    const headerCell = target.closest('.ss-header-cell:not(.ss-corner-cell):not(.ss-row-number-header)') as HTMLElement;
    if (headerCell) {
      const colIndex = parseInt(headerCell.getAttribute('data-col') || '-1', 10);
      if (colIndex >= 0) {
        // 选中整列
        const maxRow = this.dataModel.getRowCount() - 1;
        this.selectionManager.selectRange(0, colIndex, maxRow, colIndex);
        this.renderer.render();
        
        this.emit('header:contextmenu' as any, {
          col: colIndex,
          column: this.options.columns[colIndex],
          originalEvent: e,
        });
        return;
      }
    }
    
    // 检查是否点击了行号
    const rowNumberCell = target.closest('.ss-row-number') as HTMLElement;
    if (rowNumberCell) {
      const row = rowNumberCell.closest('.ss-row');
      const rowIndex = row ? parseInt(row.getAttribute('data-row') || '-1', 10) : -1;
      if (rowIndex >= 0) {
        // 选中整行
        const maxCol = this.dataModel.getColumnCount() - 1;
        this.selectionManager.selectRange(rowIndex, 0, rowIndex, maxCol);
        this.renderer.render();
        
        this.emit('rowNumber:contextmenu' as any, {
          row: rowIndex,
          rowData: this.dataModel.getRowData(rowIndex) || {},
          originalEvent: e,
        });
        return;
      }
    }
    
    // 普通单元格
    const pos = getMousePosition(e, root);
    const cell = this.renderer.getCellFromPoint(pos.x, pos.y);
    
    if (cell) {
      // 右键点击时，先选中该单元格（参考 Excel 行为）
      // 这样菜单操作会基于新选中的单元格
      this.selectionManager.selectCell(cell.row, cell.col, false);
      
      // 滚动到单元格
      this.renderer.scrollToCell(cell.row, cell.col);
      
      // 更新渲染以显示新的选中状态
      this.renderer.render();
      
      this.emit('cell:contextmenu', {
        row: cell.row,
        col: cell.col,
        value: this.dataModel.getCellValue(cell.row, cell.col),
        rowData: this.dataModel.getRowData(cell.row) || {},
        column: this.options.columns[cell.col],
        originalEvent: e,
      });
    }
  }

  /**
   * 处理单元格展开（多行文本选中时展示完整内容）
   */
  private handleCellExpand(selectedCells: CellPosition[]): void {
    // 如果正在编辑，不显示展开
    if (this.editorManager.isEditing()) {
      hideExpandOverlay();
      return;
    }
    
    // 检查当前展开的单元格是否还在当前表格中
    const currentExpandCell = getCurrentExpandCell();
    if (currentExpandCell) {
      const root = this.renderer.getRoot();
      // 如果展开的单元格不在当前表格中，隐藏预览
      if (!root || !root.contains(currentExpandCell)) {
        hideExpandOverlay();
      }
    }
    
    // 只有选中单个单元格时才展开
    if (selectedCells.length !== 1) {
      hideExpandOverlay();
      return;
    }
    
    const { row, col } = selectedCells[0];
    const cellEl = this.renderer.getCellElement(row, col);
    
    if (!cellEl) {
      hideExpandOverlay();
      return;
    }
    
    // 检查单元格是否有多行文本
    const fullText = cellEl.getAttribute('data-full-text');
    if (fullText) {
      showExpandOverlay(cellEl, fullText);
    } else {
      hideExpandOverlay();
    }
  }

  /**
   * 处理方向键导航
   */
  private handleNavigation(data: { direction: string; shift: boolean }): void {
    if (this.editorManager.isEditing()) return;
    
    const delta = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    }[data.direction as 'up' | 'down' | 'left' | 'right'];
    
    if (delta) {
      this.selectionManager.moveActiveCell(delta.row, delta.col, data.shift);
      
      const activeCell = this.selectionManager.getActiveCell();
      if (activeCell) {
        this.renderer.scrollToCell(activeCell.row, activeCell.col);
      }
    }
  }

  /**
   * 处理 Enter 键
   */
  private handleEnter(data: { shift: boolean }): void {
    if (this.editorManager.isEditing()) {
      this.commitEdit();
      // 移动到下一行
      this.selectionManager.moveActiveCell(data.shift ? -1 : 1, 0);
    } else {
      // 开始编辑
      const activeCell = this.selectionManager.getActiveCell();
      if (activeCell && !this.options.readonly) {
        this.startEdit(activeCell.row, activeCell.col);
      }
    }
  }

  /**
   * 处理 Tab 键
   */
  private handleTab(data: { shift: boolean }): void {
    if (this.editorManager.isEditing()) {
      this.commitEdit();
    }
    
    // 移动到下一个单元格
    this.selectionManager.moveActiveCell(0, data.shift ? -1 : 1);
    
    const activeCell = this.selectionManager.getActiveCell();
    if (activeCell) {
      this.renderer.scrollToCell(activeCell.row, activeCell.col);
    }
  }

  /**
   * 处理 Escape 键
   */
  private handleEscape(): void {
    if (this.editorManager.isEditing()) {
      this.editorManager.cancelEdit();
    } else {
      this.selectionManager.clearSelection();
    }
  }

  /**
   * 处理删除键
   */
  private handleDelete(): void {
    if (this.editorManager.isEditing()) return;
    if (this.options.readonly) return;
    
    const cells = this.selectionManager.getSelectedCells();
    if (cells.length === 0) return;
    
    // 清空选中单元格的值
    this.historyManager.startBatch();
    for (const cell of cells) {
      const column = this.options.columns[cell.col];
      if (!column?.readonly) {
        this.dataModel.setCellValue(cell.row, cell.col, null);
      }
    }
    this.historyManager.endBatch();
    
    this.renderer.render();
  }

  /**
   * 处理复制
   */
  private async handleCopy(): Promise<void> {
    const range = this.selectionManager.getPrimaryRange();
    if (!range) return;
    
    const normalized = normalizeRange(range);
    const values = this.dataModel.getRangeValues(
      normalized.start.row,
      normalized.start.col,
      normalized.end.row,
      normalized.end.col
    );
    
    // 获取范围内的列信息，用于正确格式化特殊类型的值
    const rangeColumns = this.options.columns.slice(
      normalized.start.col,
      normalized.end.col + 1
    ).map(col => ({
      type: col.type,
      options: col.options,
      dateFormat: (col as any).dateFormat,
    }));
    
    await this.clipboardManager.copy(values, rangeColumns);
    
    this.emit('copy', {
      data: values,
      range: normalized,
    });
  }

  /**
   * 处理剪切
   */
  private async handleCut(): Promise<void> {
    if (this.options.readonly) return;
    
    await this.handleCopy();
    this.handleDelete();
    
    const range = this.selectionManager.getPrimaryRange();
    if (range) {
      this.emit('cut' as any, {
        data: [],
        range: normalizeRange(range),
      });
    }
  }

  /**
   * 处理粘贴
   */
  private async handlePaste(): Promise<void> {
    if (this.options.readonly) return;
    
    const activeCell = this.selectionManager.getActiveCell();
    if (!activeCell) return;
    
    // 检查当前列类型 - 如果是文件类型列，让 FilePasteHandler 处理
    const column = this.options.columns[activeCell.col];
    if (column?.type === 'file') {
      // 不处理文本粘贴，让 FilePasteHandler 处理文件粘贴
      return;
    }
    
    const values = await this.clipboardManager.paste();
    if (!values || values.length === 0) return;
    
    // 计算需要的行列数
    const pasteRows = values.length;
    const pasteCols = Math.max(...values.map(row => row.length));
    const endRow = activeCell.row + pasteRows - 1;
    const endCol = activeCell.col + pasteCols - 1;
    
    // 自动扩展表格（添加行）
    const currentRowCount = this.dataModel.getRowCount();
    if (endRow >= currentRowCount && this.options.allowInsertRow) {
      const rowsToAdd = endRow - currentRowCount + 1;
      for (let i = 0; i < rowsToAdd; i++) {
        this.dataModel.insertRow(currentRowCount + i);
      }
    }
    
    // 自动扩展表格（添加列）
    const currentColCount = this.dataModel.getColumnCount();
    if (endCol >= currentColCount && this.options.allowInsertColumn) {
      const colsToAdd = endCol - currentColCount + 1;
      for (let i = 0; i < colsToAdd; i++) {
        const newColIndex = currentColCount + i;
        // 生成列名 E, F, G... 或 AA, AB...
        const colLetter = this.getColumnLetter(newColIndex);
        const newColumn = {
          key: `col_${newColIndex}`,
          title: colLetter,
          width: 80,
        };
        // dataModel.insertColumn 会通过 splice 直接修改共享的 columns 数组
        // 不需要再单独 push，否则会导致列重复添加
        this.dataModel.insertColumn(newColIndex, newColumn);
      }
    }
    
    // 更新渲染器和选区管理器的边界
    this.selectionManager.updateBounds(
      this.dataModel.getRowCount(),
      this.dataModel.getColumnCount()
    );
    this.autoFill.updateBounds(
      this.dataModel.getRowCount(),
      this.dataModel.getColumnCount()
    );
    this.renderer.updateOptions({
      rowCount: this.dataModel.getRowCount(),
      columns: this.options.columns,
    });
    
    // 粘贴数据
    this.historyManager.startBatch();
    this.dataModel.setRangeValues(activeCell.row, activeCell.col, values);
    this.historyManager.endBatch();
    
    // 更新选区
    this.selectionManager.selectRange(
      activeCell.row,
      activeCell.col,
      Math.min(endRow, this.dataModel.getRowCount() - 1),
      Math.min(endCol, this.dataModel.getColumnCount() - 1)
    );
    
    this.renderer.render();
    
    this.emit('paste', {
      data: values,
      range: {
        start: activeCell,
        end: {
          row: Math.min(endRow, this.dataModel.getRowCount() - 1),
          col: Math.min(endCol, this.dataModel.getColumnCount() - 1),
        },
      },
    });
  }

  /**
   * 获取列字母（A, B, C... Z, AA, AB...）
   */
  private getColumnLetter(index: number): string {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode(65 + (num % 26)) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  }

  /**
   * 处理撤销
   */
  private handleUndo(): void {
    const changes = this.historyManager.undo();
    if (!changes) return;
    
    // 应用反向变更
    for (const change of changes) {
      this.dataModel.setCellValue(change.row, change.col, change.newValue, true);
    }
    
    this.renderer.render();
  }

  /**
   * 处理重做
   */
  private handleRedo(): void {
    const changes = this.historyManager.redo();
    if (!changes) return;
    
    // 应用变更
    for (const change of changes) {
      this.dataModel.setCellValue(change.row, change.col, change.newValue, true);
    }
    
    this.renderer.render();
  }

  /**
   * 处理全选
   */
  private handleSelectAll(): void {
    this.selectionManager.selectAll();
  }

  /**
   * 处理 Home 键
   */
  private handleHome(data: { ctrl: boolean; shift: boolean }): void {
    if (this.editorManager.isEditing()) return;
    
    if (data.ctrl) {
      this.selectionManager.moveToStart(data.shift);
    } else {
      this.selectionManager.moveToRowStart(data.shift);
    }
    
    const activeCell = this.selectionManager.getActiveCell();
    if (activeCell) {
      this.renderer.scrollToCell(activeCell.row, activeCell.col);
    }
  }

  /**
   * 处理 End 键
   */
  private handleEnd(data: { ctrl: boolean; shift: boolean }): void {
    if (this.editorManager.isEditing()) return;
    
    if (data.ctrl) {
      this.selectionManager.moveToEnd(data.shift);
    } else {
      this.selectionManager.moveToRowEnd(data.shift);
    }
    
    const activeCell = this.selectionManager.getActiveCell();
    if (activeCell) {
      this.renderer.scrollToCell(activeCell.row, activeCell.col);
    }
  }

  /**
   * 开始编辑单元格
   */
  private startEdit(row: number, col: number): void {
    const column = this.options.columns[col];
    if (column?.readonly) return;
    
    const cellMeta = this.dataModel.getCellMeta(row, col);
    if (cellMeta?.readonly) return;
    
    // 关闭悬浮窗
    closeLinkPopover();
    closeTagsPopover();
    
    // 隐藏展开浮层（立即隐藏，避免动画闪烁）
    hideExpandOverlay(true);
    
    // 隐藏填充手柄
    this.autoFill.hideHandle();
    
    const cellRect = this.renderer.getCellRect(row, col);
    const root = this.renderer.getRoot();
    
    if (!cellRect || !root) return;
    
    const containerRect = root.getBoundingClientRect();
    const value = this.dataModel.getCellValue(row, col);
    const rowData = this.dataModel.getRowData(row) || {};
    
    // 禁用键盘导航
    this.keyboardManager.setEnabled(false);
    
    this.editorManager.startEdit(
      row,
      col,
      value,
      rowData,
      column,
      cellRect,
      containerRect
    );
    
    this.emit('edit:start', {
      row,
      col,
      oldValue: value,
      rowData,
      column,
    });
  }

  /**
   * 提交编辑
   */
  private commitEdit(): void {
    const result = this.editorManager.endEdit();
    
    if (result) {
      this.dataModel.setCellValue(result.row, result.col, result.value);
      this.renderer.refreshCell(result.row, result.col);
    }
    
    // 恢复键盘导航
    this.keyboardManager.setEnabled(true);
  }

  // ==================== 公共 API ====================

  /**
   * 加载数据
   */
  loadData(data: RowData[], mapping?: Record<string, string>): void {
    let processedData = data;
    
    // 如果提供了映射，转换数据
    if (mapping) {
      processedData = data.map(row => {
        const newRow: RowData = {};
        for (const [title, key] of Object.entries(mapping)) {
          newRow[key] = row[title];
        }
        return newRow;
      });
    }
    
    this.dataModel.loadData(processedData);
    this.selectionManager.updateBounds(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    this.autoFill.updateBounds(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    this.renderer.updateOptions({
      rowCount: this.dataModel.getRowCount() || 1,
    });
    this.historyManager.clear();
  }

  /**
   * 获取所有数据
   */
  getData(): RowData[] {
    return this.dataModel.getData();
  }

  /**
   * 设置所有数据
   */
  setData(data: RowData[]): void {
    this.dataModel.setData(data);
    this.selectionManager.updateBounds(
      this.dataModel.getRowCount(),
      this.dataModel.getColumnCount()
    );
    this.autoFill.updateBounds(
      this.dataModel.getRowCount(),
      this.dataModel.getColumnCount()
    );
    this.renderer.updateOptions({
      rowCount: this.dataModel.getRowCount(),
    });
    this.renderer.refresh();
  }

  /**
   * 清空数据
   */
  clearData(): void {
    this.dataModel.clearData();
    this.renderer.refresh();
  }

  /**
   * 获取单元格值
   */
  getCellValue(row: number, col: number): any {
    return this.dataModel.getCellValue(row, col);
  }

  /**
   * 设置单元格值
   */
  setCellValue(row: number, col: number, value: any): void {
    this.dataModel.setCellValue(row, col, value);
    this.renderer.refreshCell(row, col);
  }

  /**
   * 获取范围内的值
   */
  getRangeValues(startRow: number, startCol: number, endRow: number, endCol: number): any[][] {
    return this.dataModel.getRangeValues(startRow, startCol, endRow, endCol);
  }

  /**
   * 设置范围内的值
   */
  setRangeValues(startRow: number, startCol: number, values: any[][]): void {
    this.dataModel.setRangeValues(startRow, startCol, values);
    this.renderer.render();
  }

  /**
   * 获取行数据
   */
  getRowData(index: number): RowData | undefined {
    return this.dataModel.getRowData(index);
  }

  /**
   * 设置行数据
   */
  setRowData(index: number, data: RowData): void {
    this.dataModel.setRowData(index, data);
    this.renderer.render();
  }

  /**
   * 插入行
   */
  insertRow(index: number, data?: RowData, count = 1): void {
    if (!this.options.allowInsertRow) return;
    
    // 确保索引在有效范围内（允许在最后一行之后插入）
    const currentRowCount = this.dataModel.getRowCount();
    const maxIndex = currentRowCount; // 允许在最后一行之后插入
    
    // 如果索引超出范围，调整到最大索引
    const adjustedIndex = Math.min(Math.max(0, index), maxIndex);
    
    this.dataModel.insertRow(adjustedIndex, data, count);
    
    const newRowCount = this.dataModel.getRowCount();
    this.selectionManager.updateBounds(
      newRowCount,
      this.dataModel.getColumnCount()
    );
    this.autoFill.updateBounds(
      newRowCount,
      this.dataModel.getColumnCount()
    );
    this.renderer.updateOptions({
      rowCount: newRowCount,
    });
    
    this.emit('row:insert', { index: adjustedIndex, data });
  }

  /**
   * 删除行
   */
  deleteRow(index: number, count = 1): RowData[] {
    if (!this.options.allowDeleteRow) return [];
    
    const deleted = this.dataModel.deleteRow(index, count);
    this.selectionManager.updateBounds(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    this.autoFill.updateBounds(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    this.renderer.updateOptions({
      rowCount: this.dataModel.getRowCount() || 1,
    });
    
    deleted.forEach((data, i) => {
      this.emit('row:delete', { index: index + i, data });
    });
    
    return deleted;
  }

  /**
   * 移动行（用于拖拽排序）
   */
  moveRow(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    
    this.historyManager.startBatch();
    
    const data = this.dataModel.getData();
    const [removed] = data.splice(fromIndex, 1);
    data.splice(toIndex, 0, removed);
    this.dataModel.setData(data);
    
    this.historyManager.endBatch();
    
    this.renderer.render();
  }

  /**
   * 获取选区
   */
  getSelection(): SelectionRange[] {
    return this.selectionManager.getRanges();
  }

  /**
   * 设置选区
   */
  setSelection(startRow: number, startCol: number, endRow?: number, endCol?: number): void {
    this.selectionManager.selectRange(
      startRow,
      startCol,
      endRow ?? startRow,
      endCol ?? startCol
    );
  }

  /**
   * 清除选区
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * 复制选中数据
   */
  async copy(): Promise<void> {
    await this.handleCopy();
  }

  /**
   * 剪切选中数据
   */
  async cut(): Promise<void> {
    await this.handleCut();
  }

  /**
   * 粘贴数据
   */
  async paste(): Promise<void> {
    await this.handlePaste();
  }

  /**
   * 清除选中单元格的内容
   */
  clearContent(): void {
    this.handleDelete();
  }

  /**
   * 插入列
   */
  insertColumn(index: number, column: Column): void {
    if (!this.options.allowInsertColumn) return;
    
    // dataModel.insertColumn 会通过 splice 直接修改 this.columns 数组
    // 由于 dataModel.columns 和 options.columns 是同一个引用，
    // splice 操作会同时修改两者，不需要重新赋值
    this.dataModel.insertColumn(index, column);
    
    this.selectionManager.updateBounds(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    this.autoFill.updateBounds(
      this.dataModel.getRowCount() || 1,
      this.dataModel.getColumnCount()
    );
    // 传入同一个引用，确保 VirtualScroll 和 Renderer 使用相同的列数组
    this.renderer.updateOptions({
      columns: this.options.columns,
    });
    
    // 更新选区索引必须在 renderer.updateOptions 之后
    // 因为 shiftColumnsAfter 会触发 emitChange -> 渲染选区框
    // 此时需要表头已经更新，才能正确计算选区框位置
    this.selectionManager.shiftColumnsAfter(index, 1);
    
    this.emit('column:insert', { index, column });
  }

  /**
   * 删除列
   */
  deleteColumn(index: number): Column | undefined {
    if (!this.options.allowDeleteColumn) return undefined;
    
    // dataModel.deleteColumn 会通过 splice 直接修改 this.columns 数组
    // 由于 dataModel.columns 和 options.columns 是同一个引用，
    // splice 操作会同时修改两者，不需要重新赋值
    const deleted = this.dataModel.deleteColumn(index);
    if (deleted) {
      this.selectionManager.updateBounds(
        this.dataModel.getRowCount() || 1,
        this.dataModel.getColumnCount()
      );
      this.autoFill.updateBounds(
        this.dataModel.getRowCount() || 1,
        this.dataModel.getColumnCount()
      );
      // 传入同一个引用，确保 VirtualScroll 和 Renderer 使用相同的列数组
      this.renderer.updateOptions({
        columns: this.options.columns,
      });
      
      // 更新选区索引必须在 renderer.updateOptions 之后
      // 因为 shiftColumnsOnDelete 会触发 emitChange -> 渲染选区框
      // 此时需要表头已经更新，才能正确计算选区框位置
      this.selectionManager.shiftColumnsOnDelete(index);
      
      this.emit('column:delete', { index, column: deleted });
    }
    
    return deleted;
  }

  /**
   * 获取选中的数据
   */
  getSelectedData(): any[][] {
    const range = this.selectionManager.getPrimaryRange();
    if (!range) return [];
    
    const normalized = normalizeRange(range);
    return this.dataModel.getRangeValues(
      normalized.start.row,
      normalized.start.col,
      normalized.end.row,
      normalized.end.col
    );
  }

  /**
   * 滚动到单元格
   */
  scrollToCell(row: number, col: number): void {
    this.renderer.scrollToCell(row, col);
  }

  /**
   * 隐藏行
   */
  hideRow(index: number): void {
    this.dataModel.hideRow(index);
    this.renderer.render();
  }

  /**
   * 显示行
   */
  showRow(index: number): void {
    this.dataModel.showRow(index);
    this.renderer.render();
  }

  /**
   * 隐藏列
   */
  hideColumn(index: number): void {
    this.dataModel.hideColumn(index);
    this.renderer.render();
  }

  /**
   * 显示列
   */
  showColumn(index: number): void {
    this.dataModel.showColumn(index);
    this.renderer.render();
  }

  /**
   * 检查行是否隐藏
   */
  isRowHidden(index: number): boolean {
    return this.dataModel.isRowHidden(index);
  }

  /**
   * 检查列是否隐藏
   */
  isColumnHidden(index: number): boolean {
    return this.dataModel.isColumnHidden(index);
  }

  /**
   * 显示所有隐藏的行
   */
  showAllRows(): void {
    this.dataModel.showAllRows();
    this.renderer.render();
  }

  /**
   * 显示所有隐藏的列
   */
  showAllColumns(): void {
    this.dataModel.showAllColumns();
    this.renderer.render();
  }

  /**
   * 滚动到行
   */
  scrollToRow(row: number): void {
    this.renderer.getVirtualScroll().scrollToRow(row);
  }

  /**
   * 撤销
   */
  undo(): void {
    this.handleUndo();
  }

  /**
   * 重做
   */
  redo(): void {
    this.handleRedo();
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.historyManager.clear();
  }

  /**
   * 获取单元格元数据
   */
  getCellMeta(row: number, col: number): CellMeta | undefined {
    return this.dataModel.getCellMeta(row, col);
  }

  /**
   * 设置单元格元数据
   */
  setCellMeta(row: number, col: number, meta: Partial<CellMeta>): void {
    this.dataModel.setCellMeta(row, col, meta);
    this.renderer.refreshCell(row, col);
  }

  /**
   * 设置列宽
   */
  setColumnWidth(index: number, width: number): void {
    this.options.columns[index].width = width;
    this.renderer.updateColumnWidth(index, width);
    
    this.emit('column:resize', {
      index,
      oldWidth: this.options.columns[index].width ?? 100,
      newWidth: width,
      column: this.options.columns[index],
    });
  }

  /**
   * 获取列定义
   */
  getColumns(): Column[] {
    return this.dataModel.getColumns();
  }

  /**
   * 更新列定义
   */
  updateColumn(index: number, updates: Partial<Column>): void {
    this.dataModel.updateColumn(index, updates);
    this.options.columns[index] = { ...this.options.columns[index], ...updates };
    this.renderer.updateOptions({ columns: this.options.columns });
  }

  /**
   * 设置所有列定义（用于列重排等）
   */
  setColumns(columns: Column[]): void {
    this.options.columns = columns;
    this.dataModel.setColumns(columns);
    this.selectionManager.updateBounds(
      this.dataModel.getRowCount() || 1,
      columns.length
    );
    this.autoFill.updateBounds(
      this.dataModel.getRowCount() || 1,
      columns.length
    );
    this.renderer.updateOptions({ columns });
    this.renderer.render();
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    this.options.theme = theme;
    
    const root = this.renderer.getRoot();
    if (!root) return;
    
    if (theme === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    // 同步主题到右键菜单
    const contextMenu = (this as any)._contextMenu;
    if (contextMenu && typeof contextMenu.setTheme === 'function') {
      contextMenu.setTheme(theme);
    }
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this.options.theme;
  }

  /**
   * 设置右键菜单实例（用于主题同步等）
   */
  setContextMenu(contextMenu: any): void {
    // 存储引用以便后续主题同步
    (this as any)._contextMenu = contextMenu;
    
    // 如果有主题，立即同步
    if (contextMenu && typeof contextMenu.setTheme === 'function') {
      contextMenu.setTheme(this.options.theme);
    }
  }

  /**
   * 设置文件上传器
   * @param uploader 自定义上传器，实现 FileUploader 接口
   */
  setFileUploader(uploader: FileUploader): void {
    this.filePasteHandler.setUploader(uploader);
  }

  /**
   * 刷新表格
   */
  refresh(): void {
    this.renderer.refresh();
  }

  /**
   * 设置单元格验证错误（显示红色高亮）
   */
  setValidationError(row: number, col: number, message: string): void {
    this.renderer.setValidationError(row, col, message);
  }

  /**
   * 清除单元格验证错误
   */
  clearValidationError(row: number, col: number): void {
    this.renderer.clearValidationError(row, col);
  }

  /**
   * 清除所有验证错误
   */
  clearAllValidationErrors(): void {
    this.renderer.clearAllValidationErrors();
  }

  /**
   * 导出 CSV
   */
  exportCSV(options?: { separator?: string; includeHeaders?: boolean }): string {
    const separator = options?.separator ?? ',';
    const includeHeaders = options?.includeHeaders ?? true;
    const lines: string[] = [];
    
    // 表头
    if (includeHeaders) {
      lines.push(
        this.options.columns.map(col => `"${col.title}"`).join(separator)
      );
    }
    
    // 数据
    const data = this.getData();
    for (const row of data) {
      const values = this.options.columns.map(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        const str = String(value);
        // 转义双引号并包裹
        return `"${str.replace(/"/g, '""')}"`;
      });
      lines.push(values.join(separator));
    }
    
    return lines.join('\n');
  }

  /**
   * 导入 CSV
   */
  importCSV(csv: string, options?: { separator?: string; hasHeaders?: boolean }): void {
    const separator = options?.separator ?? ',';
    const hasHeaders = options?.hasHeaders ?? true;
    
    const lines = csv.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return;
    
    const startLine = hasHeaders ? 1 : 0;
    const data: RowData[] = [];
    
    for (let i = startLine; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], separator);
      const row: RowData = {};
      
      for (let j = 0; j < this.options.columns.length && j < values.length; j++) {
        row[this.options.columns[j].key] = values[j];
      }
      
      data.push(row);
    }
    
    this.loadData(data);
  }

  /**
   * 解析 CSV 行
   */
  private parseCSVLine(line: string, separator: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === separator) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    
    values.push(current);
    return values;
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // 清理预览浮层
    hideExpandOverlay();
    
    // 清理事件监听
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    
    // 销毁各模块
    this.keyboardManager.detach();
    this.editorManager.destroy();
    this.autoFill.unmount();
    this.rowReorder.unmount();
    this.filePasteHandler.unmount();
    this.renderer.destroy();
    
    // 清理事件
    this.dataModel.removeAllListeners();
    this.selectionManager.removeAllListeners();
    this.historyManager.removeAllListeners();
    this.autoFill.removeAllListeners();
    this.rowReorder.removeAllListeners();
    this.filePasteHandler.removeAllListeners();
    this.removeAllListeners();
    
    // 清空容器
    this.container.innerHTML = '';
  }
}

