/**
 * 表格渲染器
 * 负责整体表格的渲染和更新
 */

import type { Column, RowData, CellMeta, VirtualScrollState, CellRenderer } from '../types';
import { VirtualScroll } from './VirtualScroll';
import { TextRenderer, NumberRenderer } from '../renderers';
import { createElement, setStyles, classNames } from '../utils/dom';
import { columnIndexToLetter } from '../utils/helpers';

interface RendererOptions {
  columns: Column[];
  rowCount: number;
  rowHeight: number;
  headerHeight: number;
  showRowNumber: boolean;
  rowNumberWidth: number;
  virtualScrollBuffer: number;
}

export class Renderer {
  private container: HTMLElement;
  private root: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  private headerRow: HTMLElement | null = null;
  private body: HTMLElement | null = null;
  private bodyContent: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private selectionLayer: HTMLElement | null = null;
  private editorLayer: HTMLElement | null = null;
  
  private virtualScroll: VirtualScroll;
  private options: RendererOptions;
  
  /** 单元格 DOM 缓存 */
  private cellCache: Map<string, HTMLElement> = new Map();
  
  /** 行 DOM 缓存 */
  private rowCache: Map<number, HTMLElement> = new Map();
  
  /** 渲染器实例缓存 */
  private rendererCache: Map<string, CellRenderer> = new Map();
  
  /** 数据获取函数 */
  private getDataFn: ((row: number, col: number) => any) | null = null;
  private getRowDataFn: ((row: number) => RowData) | null = null;
  private getCellMetaFn: ((row: number, col: number) => CellMeta | undefined) | null = null;
  
  /** 选区状态 */
  private selectedCells: Set<string> = new Set();
  private activeCell: { row: number; col: number } | null = null;

  constructor(container: HTMLElement, options: RendererOptions) {
    this.container = container;
    this.options = options;
    
    this.virtualScroll = new VirtualScroll({
      rowHeight: options.rowHeight,
      headerHeight: options.headerHeight,
      columns: options.columns,
      rowCount: options.rowCount,
      buffer: options.virtualScrollBuffer,
      rowNumberWidth: options.rowNumberWidth,
      showRowNumber: options.showRowNumber,
    });
    
    this.init();
  }

  /**
   * 初始化 DOM 结构
   */
  private init(): void {
    // 清空容器
    this.container.innerHTML = '';
    
    // 创建根元素
    this.root = createElement('div', 'ss-root');
    
    // 创建表头
    this.header = createElement('div', 'ss-header');
    this.headerRow = createElement('div', 'ss-header-row');
    this.header.appendChild(this.headerRow);
    
    // 创建滚动容器
    this.scrollContainer = createElement('div', 'ss-scroll-container');
    
    // 创建表体
    this.body = createElement('div', 'ss-body');
    this.bodyContent = createElement('div', 'ss-body-content');
    this.body.appendChild(this.bodyContent);
    
    // 创建选区层
    this.selectionLayer = createElement('div', 'ss-selection-layer');
    
    // 创建编辑器层
    this.editorLayer = createElement('div', 'ss-editor-layer');
    
    // 组装 DOM
    this.scrollContainer.appendChild(this.header);
    this.scrollContainer.appendChild(this.body);
    this.root.appendChild(this.scrollContainer);
    this.root.appendChild(this.selectionLayer);
    this.root.appendChild(this.editorLayer);
    this.container.appendChild(this.root);
    
    // 设置样式
    this.updateContainerStyles();
    
    // 挂载虚拟滚动
    this.virtualScroll.mount(this.container, this.root, this.scrollContainer);
    
    // 监听虚拟滚动变化
    this.virtualScroll.on('change', this.handleVirtualScrollChange.bind(this));
    this.virtualScroll.on('scroll', this.handleScroll.bind(this));
    
    // 渲染表头
    this.renderHeader();
  }

  /**
   * 设置数据获取函数
   */
  setDataGetter(
    getData: (row: number, col: number) => any,
    getRowData: (row: number) => RowData,
    getCellMeta: (row: number, col: number) => CellMeta | undefined
  ): void {
    this.getDataFn = getData;
    this.getRowDataFn = getRowData;
    this.getCellMetaFn = getCellMeta;
  }

  /**
   * 获取编辑器层
   */
  getEditorLayer(): HTMLElement | null {
    return this.editorLayer;
  }

  /**
   * 获取根元素
   */
  getRoot(): HTMLElement | null {
    return this.root;
  }

  /**
   * 获取滚动容器
   */
  getScrollContainer(): HTMLElement | null {
    return this.scrollContainer;
  }

  /**
   * 获取虚拟滚动实例
   */
  getVirtualScroll(): VirtualScroll {
    return this.virtualScroll;
  }

  /**
   * 更新容器样式
   */
  private updateContainerStyles(): void {
    const totalWidth = this.virtualScroll.getTotalWidth();
    const totalHeight = this.virtualScroll.getTotalHeight();
    
    if (this.bodyContent) {
      setStyles(this.bodyContent, {
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
      });
    }
    
    // 设置表头宽度，确保与内容宽度一致
    if (this.header) {
      setStyles(this.header, {
        width: `${totalWidth}px`,
      });
    }
    
    if (this.headerRow) {
      setStyles(this.headerRow, {
        width: `${totalWidth}px`,
        height: `${this.options.headerHeight}px`,
      });
    }
  }

  /**
   * 渲染表头
   */
  private renderHeader(): void {
    if (!this.headerRow) return;
    
    this.headerRow.innerHTML = '';
    
    // 行号占位
    if (this.options.showRowNumber) {
      const corner = createElement('div', 'ss-header-cell ss-corner-cell');
      setStyles(corner, {
        width: `${this.options.rowNumberWidth}px`,
        height: `${this.options.headerHeight}px`,
      });
      this.headerRow.appendChild(corner);
    }
    
    // 列标题
    this.options.columns.forEach((col, index) => {
      // 检查列是否隐藏（通过检查 getDataFn 返回 undefined）
      if (this.getDataFn) {
        const testValue = this.getDataFn(0, index);
        if (testValue === undefined && this.getRowDataFn && Object.keys(this.getRowDataFn(0)).length === 0) {
          // 列被隐藏，不渲染
          return;
        }
      }
      
      const cell = createElement('div', 'ss-header-cell');
      cell.dataset.col = String(index);
      cell.textContent = col.title || columnIndexToLetter(index);
      cell.title = col.title || columnIndexToLetter(index);
      
      setStyles(cell, {
        width: `${col.width ?? 100}px`,
        height: `${this.options.headerHeight}px`,
        textAlign: col.align || 'center',
      });
      
      // 列宽调整手柄
      if (col.resizable !== false) {
        const resizer = createElement('div', 'ss-column-resizer');
        resizer.dataset.col = String(index);
        cell.appendChild(resizer);
      }
      
      this.headerRow!.appendChild(cell);
    });
  }

  /**
   * 渲染可见区域的单元格
   */
  render(): void {
    const state = this.virtualScroll.getState();
    this.renderRows(state);
  }

  /**
   * 渲染行
   */
  private renderRows(state: VirtualScrollState): void {
    if (!this.bodyContent || !this.getDataFn || !this.getRowDataFn) return;
    
    // 标记所有现有行为未使用
    const usedRows = new Set<number>();
    
    // 渲染可见行
    for (let rowIndex = state.startRow; rowIndex <= state.endRow; rowIndex++) {
      usedRows.add(rowIndex);
      let row = this.rowCache.get(rowIndex);
      
      if (!row) {
        row = this.createRow(rowIndex);
        this.rowCache.set(rowIndex, row);
        this.bodyContent.appendChild(row);
      }
      
      // 更新行位置
      const top = this.virtualScroll.getRowOffset(rowIndex);
      setStyles(row, {
        transform: `translateY(${top}px)`,
      });
      
      // 渲染行内的单元格
      this.renderRowCells(row, rowIndex, state);
    }
    
    // 移除不可见的行
    for (const [rowIndex, row] of this.rowCache) {
      if (!usedRows.has(rowIndex)) {
        row.remove();
        this.rowCache.delete(rowIndex);
        
        // 同时清理该行的单元格缓存
        for (let col = 0; col < this.options.columns.length; col++) {
          this.cellCache.delete(`${rowIndex}:${col}`);
        }
      }
    }
  }

  /**
   * 创建行元素
   */
  private createRow(rowIndex: number): HTMLElement {
    const row = createElement('div', 'ss-row');
    row.dataset.row = String(rowIndex);
    
    setStyles(row, {
      height: `${this.options.rowHeight}px`,
    });
    
    return row;
  }

  /**
   * 渲染行内的单元格
   */
  private renderRowCells(
    row: HTMLElement,
    rowIndex: number,
    state: VirtualScrollState
  ): void {
    const rowData = this.getRowDataFn!(rowIndex);
    
    // 确保行显示（之前可能被隐藏）
    row.style.display = '';
    
    // 行号单元格
    if (this.options.showRowNumber) {
      let rowNumberCell = row.querySelector('.ss-row-number') as HTMLElement;
      if (!rowNumberCell) {
        rowNumberCell = createElement('div', 'ss-cell ss-row-number');
        setStyles(rowNumberCell, {
          width: `${this.options.rowNumberWidth}px`,
          height: `${this.options.rowHeight}px`,
        });
        row.insertBefore(rowNumberCell, row.firstChild);
      }
      rowNumberCell.textContent = String(rowIndex + 1);
    }
    
    // 数据单元格
    for (let colIndex = state.startCol; colIndex <= state.endCol; colIndex++) {
      // 检查列是否隐藏
      if (this.getDataFn) {
        const testValue = this.getDataFn(rowIndex, colIndex);
        if (testValue === undefined && Object.keys(rowData).length === 0) {
          // 列被隐藏，跳过
          continue;
        }
      }
      
      const cellKey = `${rowIndex}:${colIndex}`;
      let cell = this.cellCache.get(cellKey);
      
      if (!cell) {
        cell = this.createCell(rowIndex, colIndex);
        this.cellCache.set(cellKey, cell);
        row.appendChild(cell);
      }
      
      // 更新单元格内容
      this.renderCell(cell, rowIndex, colIndex, rowData);
    }
    
    // 移除不可见的单元格
    const cells = row.querySelectorAll('.ss-cell:not(.ss-row-number)');
    cells.forEach(cell => {
      const colIndex = parseInt((cell as HTMLElement).dataset.col || '-1', 10);
      if (colIndex < state.startCol || colIndex > state.endCol) {
        cell.remove();
        this.cellCache.delete(`${rowIndex}:${colIndex}`);
      }
    });
  }

  /**
   * 创建单元格元素
   */
  private createCell(rowIndex: number, colIndex: number): HTMLElement {
    const cell = createElement('div', 'ss-cell');
    cell.dataset.row = String(rowIndex);
    cell.dataset.col = String(colIndex);
    
    const column = this.options.columns[colIndex];
    const left = this.virtualScroll.getColumnOffset(colIndex);
    
    setStyles(cell, {
      width: `${column?.width ?? 100}px`,
      height: `${this.options.rowHeight}px`,
      left: `${left}px`,
      textAlign: column?.align || 'left',
    });
    
    return cell;
  }

  /**
   * 渲染单元格内容
   */
  private renderCell(
    cell: HTMLElement,
    rowIndex: number,
    colIndex: number,
    rowData: RowData
  ): void {
    const column = this.options.columns[colIndex];
    if (!column) return;
    
    const value = this.getDataFn!(rowIndex, colIndex);
    const meta = this.getCellMetaFn?.(rowIndex, colIndex);
    
    // 获取或创建渲染器
    const renderer = this.getRenderer(column);
    
    // 清空单元格
    cell.textContent = '';
    
    // 渲染内容
    renderer.render(cell, value, rowData, column);
    
    // 应用只读样式（只有当明确设置为 true 时才应用）
    const isReadonly = column.readonly === true || meta?.readonly === true;
    
    // 应用单元格元数据样式
    const baseClasses = ['ss-cell'];
    if (isReadonly) {
      baseClasses.push('ss-cell-readonly');
    }
    if (meta?.className) {
      baseClasses.push(meta.className);
    }
    cell.className = baseClasses.join(' ');
    
    if (meta?.style) {
      setStyles(cell, meta.style);
    }
    
    // 更新选中状态
    const cellKey = `${rowIndex}:${colIndex}`;
    const isSelected = this.selectedCells.has(cellKey);
    const isActive = this.activeCell?.row === rowIndex && this.activeCell?.col === colIndex;
    
    cell.classList.toggle('ss-cell-selected', isSelected);
    cell.classList.toggle('ss-cell-active', isActive);
  }

  /**
   * 获取渲染器
   */
  private getRenderer(column: Column): CellRenderer {
    const type = column.type || 'text';
    const key = column.renderer ? column.key : type;
    
    let renderer = this.rendererCache.get(key);
    if (!renderer) {
      if (column.renderer) {
        renderer = new column.renderer();
      } else {
        switch (type) {
          case 'number':
            renderer = new NumberRenderer();
            break;
          default:
            renderer = new TextRenderer();
        }
      }
      this.rendererCache.set(key, renderer);
    }
    
    return renderer;
  }

  /**
   * 更新选区显示
   */
  updateSelection(
    selectedCells: Array<{ row: number; col: number }>,
    activeCell: { row: number; col: number } | null
  ): void {
    // 清除旧选区
    this.selectedCells.clear();
    
    // 设置新选区
    for (const cell of selectedCells) {
      this.selectedCells.add(`${cell.row}:${cell.col}`);
    }
    
    this.activeCell = activeCell;
    
    // 重新渲染以更新选区样式
    this.render();
    
    // 更新选区边框层
    this.renderSelectionBorder(selectedCells, activeCell);
  }

  /**
   * 渲染选区边框
   */
  private renderSelectionBorder(
    selectedCells: Array<{ row: number; col: number }>,
    activeCell: { row: number; col: number } | null
  ): void {
    if (!this.selectionLayer || !this.scrollContainer) return;
    
    this.selectionLayer.innerHTML = '';
    
    if (selectedCells.length === 0) return;
    
    // 计算选区边界
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;
    
    for (const cell of selectedCells) {
      minRow = Math.min(minRow, cell.row);
      maxRow = Math.max(maxRow, cell.row);
      minCol = Math.min(minCol, cell.col);
      maxCol = Math.max(maxCol, cell.col);
    }
    
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    
    // 选区背景
    const top = this.virtualScroll.getRowOffset(minRow) + this.options.headerHeight - scrollTop;
    const left = this.virtualScroll.getColumnOffset(minCol) - scrollLeft;
    const width = this.virtualScroll.getColumnOffset(maxCol) + 
                  (this.options.columns[maxCol]?.width ?? 100) - 
                  this.virtualScroll.getColumnOffset(minCol);
    const height = (maxRow - minRow + 1) * this.options.rowHeight;
    
    const selectionBox = createElement('div', 'ss-selection-box');
    setStyles(selectionBox, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    this.selectionLayer.appendChild(selectionBox);
  }

  /**
   * 处理虚拟滚动变化
   */
  private handleVirtualScrollChange(state: VirtualScrollState): void {
    this.renderRows(state);
  }

  /**
   * 处理滚动事件
   */
  private handleScroll(): void {
    // 表头在滚动容器内部，会自然跟随水平滚动，不需要手动同步
    
    // 更新选区位置
    if (this.activeCell) {
      this.renderSelectionBorder(
        Array.from(this.selectedCells).map(key => {
          const [row, col] = key.split(':').map(Number);
          return { row, col };
        }),
        this.activeCell
      );
    }
  }

  /**
   * 更新配置
   */
  updateOptions(options: Partial<RendererOptions>): void {
    Object.assign(this.options, options);
    
    this.virtualScroll.update({
      rowHeight: this.options.rowHeight,
      headerHeight: this.options.headerHeight,
      columns: this.options.columns,
      rowCount: this.options.rowCount,
      rowNumberWidth: this.options.rowNumberWidth,
      showRowNumber: this.options.showRowNumber,
    });
    
    this.updateContainerStyles();
    this.renderHeader();
    this.render();
  }

  /**
   * 更新列宽
   */
  updateColumnWidth(colIndex: number, width: number): void {
    if (this.options.columns[colIndex]) {
      this.options.columns[colIndex].width = width;
      this.virtualScroll.update({ columns: this.options.columns });
      this.updateContainerStyles();
      this.renderHeader();
      this.render();
    }
  }

  /**
   * 根据坐标获取单元格位置
   */
  getCellFromPoint(x: number, y: number): { row: number; col: number } | null {
    if (!this.scrollContainer) return null;
    
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    
    // 减去表头高度
    const adjustedY = y - this.options.headerHeight + scrollTop;
    const adjustedX = x + scrollLeft;
    
    if (adjustedY < 0) return null;
    
    const row = this.virtualScroll.getRowIndexFromY(adjustedY);
    const col = this.virtualScroll.getColumnIndexFromX(adjustedX);
    
    if (row < 0 || row >= this.options.rowCount || col < 0) {
      return null;
    }
    
    return { row, col };
  }

  /**
   * 获取单元格 DOM 元素
   */
  getCellElement(row: number, col: number): HTMLElement | null {
    const cacheKey = `${row}:${col}`;
    return this.cellCache.get(cacheKey) || null;
  }

  /**
   * 获取单元格的 DOM 矩形
   */
  getCellRect(row: number, col: number): DOMRect | null {
    if (!this.scrollContainer || !this.root) return null;
    
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    
    const rootRect = this.root.getBoundingClientRect();
    
    const top = this.virtualScroll.getRowOffset(row) + this.options.headerHeight - scrollTop;
    const left = this.virtualScroll.getColumnOffset(col) - scrollLeft;
    const width = this.options.columns[col]?.width ?? 100;
    const height = this.options.rowHeight;
    
    return new DOMRect(
      rootRect.left + left,
      rootRect.top + top,
      width,
      height
    );
  }

  /**
   * 滚动到指定单元格
   */
  scrollToCell(row: number, col: number): void {
    this.virtualScroll.scrollToCell(row, col);
  }

  /**
   * 刷新单个单元格
   */
  refreshCell(row: number, col: number): void {
    const cell = this.cellCache.get(`${row}:${col}`);
    if (cell && this.getRowDataFn) {
      const rowData = this.getRowDataFn(row);
      this.renderCell(cell, row, col, rowData);
    }
  }

  /**
   * 完全刷新
   */
  refresh(): void {
    this.cellCache.clear();
    this.rowCache.forEach(row => row.remove());
    this.rowCache.clear();
    this.render();
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.virtualScroll.unmount();
    this.cellCache.clear();
    this.rowCache.clear();
    this.rendererCache.forEach(renderer => renderer.destroy?.());
    this.rendererCache.clear();
    
    if (this.root) {
      this.root.remove();
    }
  }
}

