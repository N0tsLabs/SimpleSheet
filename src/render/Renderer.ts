/**
 * 表格渲染器
 * 负责整体表格的渲染和更新
 */

import type { Column, RowData, CellMeta, VirtualScrollState, CellRenderer } from '../types';
import { VirtualScroll } from './VirtualScroll';
import {
  TextRenderer,
  NumberRenderer,
  DateRenderer,
  SelectRenderer,
  EmailRenderer,
  PhoneRenderer,
  LinkRenderer,
  CheckboxRenderer,
  FileRenderer,
  precalculateRowHeights,
} from '../renderers';
import { createElement, setStyles, classNames, rafThrottle } from '../utils/dom';
import { columnIndexToLetter } from '../utils/helpers';

interface RendererOptions {
  columns: Column[];
  rowCount: number;
  rowHeight: number;
  headerHeight: number;
  showRowNumber: boolean;
  rowNumberWidth: number;
  virtualScrollBuffer: number;
  verticalPadding?: number;
  /** 预计算的行高（用于 wrapText 模式） */
  rowHeights?: Map<number, number>;
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
  
  /** 每行的实际高度缓存（用于行高自适应） */
  private rowHeights: Map<number, number> = new Map();
  
  /** 渲染器实例缓存 */
  private rendererCache: Map<string, CellRenderer> = new Map();
  
  /** 数据获取函数 */
  private getDataFn: ((row: number, col: number) => any) | null = null;
  private getRowDataFn: ((row: number) => RowData) | null = null;
  private getCellMetaFn: ((row: number, col: number) => CellMeta | undefined) | null = null;
  
  /** 单元格值变化回调（用于复选框等直接点击修改的场景） */
  private onCellChangeFn: ((row: number, col: number, value: any) => void) | null = null;
  
  /** 验证错误存储 */
  private validationErrors: Map<string, string> = new Map();
  
  /** 选区状态 */
  private selectedCells: Set<string> = new Set();
  private activeCell: { row: number; col: number } | null = null;

  /** 上一次的列数量，用于检测列变化 */
  private lastColumnCount: number = 0;

  /** 待处理的批量计算计数（用于防抖） */
  private pendingBatchCount: number = 0;

  constructor(container: HTMLElement, options: RendererOptions) {
    this.container = container;
    this.options = options;
    this.lastColumnCount = options.columns.length;

    // 如果传入了预计算的行高，直接使用
    if (options.rowHeights) {
      this.rowHeights = options.rowHeights;
    }

    this.virtualScroll = new VirtualScroll({
      rowHeight: options.rowHeight,
      headerHeight: options.headerHeight,
      columns: options.columns,
      rowCount: options.rowCount,
      buffer: options.virtualScrollBuffer,
      rowNumberWidth: options.rowNumberWidth,
      showRowNumber: options.showRowNumber,
      getTotalHeight: () => this.getTotalHeight(),
      getRowOffset: (rowIndex: number) => this.getRowOffset(rowIndex),
      getRowIndexFromY: (y: number) => this.getRowIndexFromY(y),
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

    // 阻止滚动条区域的点击事件透传到单元格
    // 当点击滚动条轨道或滑块时，不应该触发单元格的选中
    this.scrollContainer.addEventListener('mousedown', (e) => {
      // 检查点击目标是否是交互元素（单元格、表头、行号）
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('.ss-cell') ||
                           target.closest('.ss-header-cell') ||
                           target.closest('.ss-row-number') ||
                           target.closest('.ss-column-resizer');

      // 如果点击的不是交互元素（是滚动条区域），阻止事件
      if (!isInteractive) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true); // 使用捕获阶段，确保在其他事件处理之前执行
    
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
   * 分批预计算行高的配置
   */
  private readonly BATCH_SIZE = 50; // 每批计算的行数

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

    // 空闲时分批计算剩余行（首屏渲染后会在 handleVirtualScrollChange 中修正）
    this.continuePrecalculateOnIdle();
  }

  /**
   * 调度分批预计算行高
   */
  private schedulePrecalculateRowHeights(): void {
    const hasWrapText = this.options.columns.some(col => col.wrapText === 'wrap' || col.wrapText === 'fixed');
    if (!hasWrapText) return;
    if (this.options.rowHeights && this.options.rowHeights.size > 0) return;
    if (!this.getRowDataFn || this.options.rowCount === 0) return;

    this.pendingBatchCount = 0;

    // 注意：首屏渲染后再计算行高（因为需要实际渲染的单元格）
    // 渲染完成后会调用 calculateRowHeightsBatch 来修正

    // 空闲时分批计算剩余行
    this.continuePrecalculateOnIdle();
  }

  /**
   * 计算/修正一批行的高度
   * 直接复制实际单元格来测量，确保样式 100% 一致
   */
  private calculateRowHeightsBatch(startRow: number, count: number): void {
    if (!this.getDataFn) return;

    const endRow = Math.min(startRow + count, this.options.rowCount);

    // 如果还没有渲染任何行，跳过
    if (this.rowCache.size === 0) return;

    let needsUpdate = false;

    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // 找出所有 wrapText 列
      const wrapTextCols: Column[] = [];
      for (let colIndex = 0; colIndex < this.options.columns.length; colIndex++) {
        const col = this.options.columns[colIndex];
        if (col.wrapText === 'wrap' || col.wrapText === 'fixed') {
          wrapTextCols.push(col);
        }
      }

      if (wrapTextCols.length === 0) {
        // 没有 wrapText 列，确保使用默认高度
        const currentHeight = this.rowHeights.get(rowIndex);
        if (currentHeight !== this.options.rowHeight) {
          this.rowHeights.set(rowIndex, this.options.rowHeight);
          needsUpdate = true;
        }
        continue;
      }

      let maxHeight = this.options.rowHeight;

      // 直接从已渲染的单元格中获取高度
      for (const col of wrapTextCols) {
        const colIndex = this.options.columns.indexOf(col);
        const cellKey = `${rowIndex}:${colIndex}`;
        const cellEl = this.cellCache.get(cellKey);

        if (!cellEl) continue;

        // 获取实际渲染的单元格高度
        const height = cellEl.scrollHeight;

        if (height > maxHeight) {
          maxHeight = height;
        }
      }

      // 如果高度变化了，需要更新
      const currentHeight = this.rowHeights.get(rowIndex);
      if (currentHeight !== maxHeight) {
        this.rowHeights.set(rowIndex, maxHeight);
        needsUpdate = true;
      }
    }

    // 如果有更新，更新容器样式
    if (needsUpdate) {
      this.updateContainerStyles();
    }
  }

  /**
   * 修正所有可见行的行高
   */
  private correctVisibleRowHeights(): void {
    if (this.rowCache.size === 0) return;

    // 获取所有可见行的索引
    const visibleRowIndices = Array.from(this.rowCache.keys());
    if (visibleRowIndices.length === 0) return;

    // 计算所有可见行的最大索引
    const maxIndex = Math.max(...visibleRowIndices);

    // 修正所有可见行的行高
    this.correctRowHeightsBatch(0, maxIndex + 1);
  }

  /**
   * 修正一批行的实际高度
   * 从实际渲染的单元格中获取高度并更新行样式
   */
  private correctRowHeightsBatch(startRow: number, count: number): void {
    const endRow = Math.min(startRow + count, this.options.rowCount);

    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // 找出所有 wrapText 列
      const wrapTextCols = this.options.columns.filter(col =>
        col.wrapText === 'wrap' || col.wrapText === 'fixed'
      );

      if (wrapTextCols.length === 0) continue;

      let maxHeight = this.options.rowHeight;

      // 直接从已渲染的单元格中获取高度
      for (const col of wrapTextCols) {
        const colIndex = this.options.columns.indexOf(col);
        const cellKey = `${rowIndex}:${colIndex}`;
        const cellEl = this.cellCache.get(cellKey);

        if (!cellEl) continue;

        const height = cellEl.scrollHeight;
        if (height > maxHeight) {
          maxHeight = height;
        }
      }

      // 更新行高
      this.rowHeights.set(rowIndex, maxHeight);

      // 更新行元素的高度
      const row = this.rowCache.get(rowIndex);
      if (row) {
        setStyles(row, {
          height: `${maxHeight}px`,
        });

        // 更新行号单元格高度
        const rowNumberCell = row.querySelector('.ss-row-number') as HTMLElement;
        if (rowNumberCell) {
          setStyles(rowNumberCell, {
            height: `${maxHeight}px`,
            minHeight: `${maxHeight}px`,
          });
        }

        // 更新所有单元格高度
        const cells = row.querySelectorAll('.ss-cell:not(.ss-row-number)');
        cells.forEach(cell => {
          setStyles(cell as HTMLElement, {
            height: `${maxHeight}px`,
            minHeight: `${maxHeight}px`,
          });
        });
      }
    }

    // 更新容器样式和虚拟滚动
    this.updateContainerStyles();
    this.virtualScroll.update({});
  }

  /**
   * 在空闲时继续预计算
   */
  private continuePrecalculateOnIdle(): void {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => this.processNextBatch());
    } else {
      setTimeout(() => this.processNextBatch(), 100);
    }
  }

  /**
   * 处理下一批
   */
  private processNextBatch(): void {
    let startRow = 0;
    while (startRow < this.options.rowCount && this.rowHeights.has(startRow)) {
      startRow++;
    }
    if (startRow >= this.options.rowCount) return;

    this.calculateRowHeightsBatch(startRow, this.BATCH_SIZE);

    if (this.pendingBatchCount > 0) {
      this.continuePrecalculateOnIdle();
    }
  }

  /**
   * 预计算所有行的实际高度（用于 wrapText 模式）
   * @deprecated 使用 schedulePrecalculateRowHeights 替代
   */
  private precalculateRowHeights(): void {
    // 如果外部已经传入了 rowHeights，不再重复计算
    if (this.options.rowHeights && this.options.rowHeights.size > 0) {
      return;
    }

    if (!this.getRowDataFn || this.options.rowCount === 0) {
      return;
    }

    // 检查是否有 wrapText 为 wrap 或 fixed 的列（这两种模式都可能需要行高）
    const hasWrapText = this.options.columns.some(col => col.wrapText === 'wrap' || col.wrapText === 'fixed');
    if (!hasWrapText) {
      return;
    }

    // 获取所有行数据
    const dataList: RowData[] = [];
    for (let i = 0; i < this.options.rowCount; i++) {
      dataList.push(this.getRowDataFn(i));
    }

    // 同步预计算所有行的高度
    const calculatedHeights = precalculateRowHeights(
      dataList,
      this.options.columns,
      this.options.rowHeight
    );

    // 应用计算的高度
    for (const [rowIndex, height] of calculatedHeights) {
      this.rowHeights.set(rowIndex, height);
    }
  }
  
  /**
   * 设置单元格值变化回调
   */
  setOnCellChange(callback: (row: number, col: number, value: any) => void): void {
    this.onCellChangeFn = callback;
  }
  
  /**
   * 设置单元格验证错误
   */
  setValidationError(row: number, col: number, message: string): void {
    const key = `${row}:${col}`;
    this.validationErrors.set(key, message);
    
    // 更新单元格显示
    const cell = this.cellCache.get(key);
    if (cell) {
      cell.classList.add('ss-cell-error', 'ss-cell-error-flash');
      
      // 添加错误提示
      this.updateErrorTooltip(cell, message);
      
      // 移除闪烁动画类
      setTimeout(() => {
        cell.classList.remove('ss-cell-error-flash');
      }, 600);
    }
  }
  
  /**
   * 清除单元格验证错误
   */
  clearValidationError(row: number, col: number): void {
    const key = `${row}:${col}`;
    this.validationErrors.delete(key);
    
    // 更新单元格显示
    const cell = this.cellCache.get(key);
    if (cell) {
      cell.classList.remove('ss-cell-error', 'ss-cell-error-flash');
      this.removeErrorTooltip(cell);
    }
  }
  
  /**
   * 清除所有验证错误
   */
  clearAllValidationErrors(): void {
    for (const key of this.validationErrors.keys()) {
      const cell = this.cellCache.get(key);
      if (cell) {
        cell.classList.remove('ss-cell-error', 'ss-cell-error-flash');
        this.removeErrorTooltip(cell);
      }
    }
    this.validationErrors.clear();
  }
  
  /**
   * 更新错误提示
   */
  private updateErrorTooltip(cell: HTMLElement, message: string): void {
    // 添加角标
    let badge = cell.querySelector('.ss-cell-error-badge') as HTMLElement;
    if (!badge) {
      badge = createElement('div', 'ss-cell-error-badge');
      cell.appendChild(badge);
    }
    
    // 添加提示气泡
    let tooltip = cell.querySelector('.ss-cell-error-tooltip') as HTMLElement;
    if (!tooltip) {
      tooltip = createElement('div', 'ss-cell-error-tooltip');
      cell.appendChild(tooltip);
    }
    tooltip.textContent = message;
  }
  
  /**
   * 移除错误提示
   */
  private removeErrorTooltip(cell: HTMLElement): void {
    const badge = cell.querySelector('.ss-cell-error-badge');
    if (badge) {
      badge.remove();
    }
    const tooltip = cell.querySelector('.ss-cell-error-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
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
   * 获取选区层
   */
  getSelectionLayer(): HTMLElement | null {
    return this.selectionLayer;
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
    const verticalPadding = this.options.verticalPadding || 0;
    
    if (this.bodyContent) {
      setStyles(this.bodyContent, {
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
        paddingTop: `${verticalPadding}px`,
        paddingBottom: `${verticalPadding}px`,
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

      // 添加可排序指示器（如果列可排序）
      if (col.sortable !== false) {
        cell.classList.add('ss-sortable');
      }
      
      const cellStyles: Record<string, string> = {
        width: `${col.width ?? 100}px`,
        height: `${this.options.headerHeight}px`,
        textAlign: col.align || 'center',
      };
      
      // 应用表头背景颜色
      if (col.headerBgColor) {
        cellStyles.backgroundColor = col.headerBgColor;
      }
      
      // 应用表头文字颜色
      if (col.headerTextColor) {
        cellStyles.color = col.headerTextColor;
      }
      
      setStyles(cell, cellStyles);
      
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
    // 确保状态有效
    if (state.startRow >= 0 && state.endRow >= state.startRow) {
      this.renderRows(state);
    }
  }

  /** updateRowPositions 的防抖版本 */
  private updateRowPositionsDebounced: (() => void) | null = null;

  /**
   * 更新所有行的位置（用于行高自适应后避免重叠）
   */
  private updateRowPositions(): void {
    // 使用防抖优化性能，避免频繁更新
    if (!this.updateRowPositionsDebounced) {
      this.updateRowPositionsDebounced = rafThrottle(() => {
        let currentTop = 0;
        
        // 遍历所有已渲染的行，按顺序更新位置
        const sortedRows = Array.from(this.rowCache.entries()).sort((a, b) => a[0] - b[0]);
        
        for (const [rowIndex, row] of sortedRows) {
          const rowHeight = this.rowHeights.get(rowIndex) || this.options.rowHeight;
          setStyles(row, {
            transform: `translateY(${currentTop}px)`,
          });
          currentTop += rowHeight;
        }
        
        // 更新虚拟滚动的总高度
        this.updateContainerStyles();
        
        // 重新计算虚拟滚动状态（因为总高度可能变化了）
        this.virtualScroll.update({});
      });
    }
    
    this.updateRowPositionsDebounced();
  }

  /**
   * 渲染行
   * 核心策略：
   * 1. 使用固定行高估算可视区域（避免循环依赖）
   * 2. 渲染这些行并测量实际行高
   * 3. 根据实际行高调整位置
   * 4. 如果发现可视区域需要扩展（因为行高比预期大），再扩展渲染范围
   */
  private renderRows(state: VirtualScrollState): void {
    if (!this.bodyContent || !this.getDataFn || !this.getRowDataFn) return;
    
    // 确保 startRow 和 endRow 有效
    let startRow = Math.max(0, Math.min(state.startRow, this.options.rowCount - 1));
    let endRow = Math.max(startRow, Math.min(state.endRow, this.options.rowCount - 1));
    
    // 如果没有数据，不渲染
    if (this.options.rowCount === 0 || startRow >= this.options.rowCount) {
      return;
    }
    
    // 先计算所有行的累计高度（使用已缓存的行高，未缓存的用默认值）
    let currentTop = 0;
    for (let i = 0; i < startRow; i++) {
      const rowHeight = this.rowHeights.get(i) || this.options.rowHeight;
      currentTop += rowHeight;
    }
    
    // 标记所有现有行为未使用
    const usedRows = new Set<number>();
    
    // 第一遍：先创建/获取所有需要的行，确保它们都存在
    // 关键优化：先创建新行，再移除旧行，避免滚动时空白
    const rowsToRender: Array<{ rowIndex: number; row: HTMLElement }> = [];
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      // 确保行索引有效
      if (rowIndex < 0 || rowIndex >= this.options.rowCount) {
        continue;
      }
      
      usedRows.add(rowIndex);
      let row = this.rowCache.get(rowIndex);
      
      if (!row) {
        row = this.createRow(rowIndex);
        this.rowCache.set(rowIndex, row);
        this.bodyContent.appendChild(row);
        // 初始化默认行高
        this.rowHeights.set(rowIndex, this.options.rowHeight);
      }
      
      // 先设置位置和显示状态（使用缓存的行高），避免滚动时空白
      const cachedHeight = this.rowHeights.get(rowIndex) || this.options.rowHeight;
      // 关键：立即显示行，确保滚动时不会出现空白
      setStyles(row, {
        display: '',
        transform: `translateY(${currentTop}px)`,
        height: `${cachedHeight}px`,
        visibility: 'visible', // 确保可见
        opacity: '1', // 确保不透明
      });
      
      rowsToRender.push({ rowIndex, row });
      
      // 更新累计高度（使用缓存的行高）
      currentTop += cachedHeight;
    }
    
    // 第二遍：渲染所有行的内容并更新位置
    // 这样可以确保所有行都已经存在且可见，然后再渲染内容
    // 重新计算累计高度（基于实际行高）
    let recalculatedTop = 0;
    for (let i = 0; i < startRow; i++) {
      recalculatedTop += this.rowHeights.get(i) || this.options.rowHeight;
    }
    
    for (const { rowIndex, row } of rowsToRender) {
      // 渲染单元格内容（这样才能知道实际行高）
      this.renderRowCells(row, rowIndex, state);
      
      // 使用实际行高更新位置
      const actualRowHeight = this.rowHeights.get(rowIndex) || this.options.rowHeight;
      
      // 关键：使用 will-change 优化性能，避免滚动时闪烁
      setStyles(row, {
        transform: `translateY(${recalculatedTop}px)`,
        height: `${actualRowHeight}px`,
        willChange: 'transform', // 提示浏览器优化
      });
      
      // 更新累计高度
      recalculatedTop += actualRowHeight;
    }
    
    // 更新累计高度（用于后续扩展渲染范围的计算）
    currentTop = recalculatedTop;
    
    // 第二遍：检查是否需要扩展渲染范围
    // 如果某些行的实际高度远大于默认高度，可能需要渲染更多行来填满可视区域
    const scrollTop = this.virtualScroll.getScrollTop();
    // 获取视口高度（通过容器元素）
    const containerRect = this.container?.getBoundingClientRect();
    const viewportHeight = (containerRect?.height || 0) - this.options.headerHeight;
    const bottomY = scrollTop + viewportHeight;
    
    // 计算当前渲染范围的实际底部位置
    let actualBottom = currentTop;
    
    // 如果实际底部位置小于可视区域底部，需要扩展渲染范围
    if (actualBottom < bottomY && endRow < this.options.rowCount - 1) {
      // 扩展渲染范围，直到填满可视区域
      let extendedEndRow = endRow;
      while (actualBottom < bottomY && extendedEndRow < this.options.rowCount - 1) {
        extendedEndRow++;
        const extendedRowIndex = extendedEndRow;
        
        if (extendedRowIndex < 0 || extendedRowIndex >= this.options.rowCount) {
          break;
        }
        
        usedRows.add(extendedRowIndex);
        let extendedRow = this.rowCache.get(extendedRowIndex);
        
        if (!extendedRow) {
          extendedRow = this.createRow(extendedRowIndex);
          this.rowCache.set(extendedRowIndex, extendedRow);
          this.bodyContent.appendChild(extendedRow);
          this.rowHeights.set(extendedRowIndex, this.options.rowHeight);
        }
        
        // 先设置位置和显示状态，避免空白
        const cachedExtendedHeight = this.rowHeights.get(extendedRowIndex) || this.options.rowHeight;
        setStyles(extendedRow, {
          display: '',
          transform: `translateY(${actualBottom}px)`,
          height: `${cachedExtendedHeight}px`,
          visibility: 'visible',
          opacity: '1',
        });
        
        // 渲染单元格内容
        this.renderRowCells(extendedRow, extendedRowIndex, state);
        
        // 计算位置（使用实际行高）
        const extendedRowHeight = this.rowHeights.get(extendedRowIndex) || this.options.rowHeight;
        setStyles(extendedRow, {
          transform: `translateY(${actualBottom}px)`,
          height: `${extendedRowHeight}px`,
        });
        
        actualBottom += extendedRowHeight;
      }
      
      endRow = extendedEndRow;
    }
    
    // 移除不可见的行（在最后执行，确保新行已经渲染完成）
    // 关键优化：不要立即移除行，而是保留更多行的DOM，只隐藏它们
    // 这样可以避免滚动时出现空白，因为行可能很快又会需要
    const rowsToHide: Array<{ rowIndex: number; row: HTMLElement }> = [];
    for (const [rowIndex, row] of this.rowCache) {
      if (!usedRows.has(rowIndex)) {
        // 计算行距离可视区域的距离
        const rowTop = this.getRowOffset(rowIndex);
        const rowBottom = rowTop + (this.rowHeights.get(rowIndex) || this.options.rowHeight);
        const scrollTop = this.virtualScroll.getScrollTop();
        const containerRect = this.container?.getBoundingClientRect();
        const viewportHeight = (containerRect?.height || 0) - this.options.headerHeight;
        const viewportBottom = scrollTop + viewportHeight;
        
        // 如果行距离可视区域太远（超过2个视口高度），才移除
        const distanceThreshold = viewportHeight * 2;
        const isFarAway = (rowBottom < scrollTop - distanceThreshold) || (rowTop > viewportBottom + distanceThreshold);
        
        if (isFarAway) {
          // 距离太远，可以移除
          row.remove();
          this.rowCache.delete(rowIndex);
          
          // 同时清理该行的单元格缓存
          for (let col = 0; col < this.options.columns.length; col++) {
            this.cellCache.delete(`${rowIndex}:${col}`);
          }
        } else {
          // 距离不远，只隐藏，不移除（保留DOM，避免滚动回来时重新创建）
          // 但保持位置，这样滚动回来时可以立即显示
          const rowTop = this.getRowOffset(rowIndex);
          const cachedHeight = this.rowHeights.get(rowIndex) || this.options.rowHeight;
          setStyles(row, {
            display: 'none',
            transform: `translateY(${rowTop}px)`, // 保持位置
            height: `${cachedHeight}px`,
          });
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
          minHeight: `${this.options.rowHeight}px`, // 确保最小高度
        });
        row.insertBefore(rowNumberCell, row.firstChild);
      }
      rowNumberCell.textContent = String(rowIndex + 1);
    }
    
    // 数据单元格
    for (let colIndex = state.startCol; colIndex <= state.endCol; colIndex++) {
      // 确保列索引有效
      if (colIndex < 0 || colIndex >= this.options.columns.length) {
        continue;
      }
      
      // 检查列是否隐藏（只有在明确返回 undefined 且 rowData 为空时才跳过）
      if (this.getDataFn) {
        const testValue = this.getDataFn(rowIndex, colIndex);
        // 注意：即使 testValue 是 undefined，如果 rowData 不为空，也应该渲染
        // 因为某些列可能确实没有值，但不应该被隐藏
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
      } else {
        // 修复：已存在的单元格也需要更新位置和宽度
        // 因为插入/删除列后，colIndex 对应的实际位置会变化
        // 使用 getColumnOffsetDirect 确保与选区框计算一致
        const column = this.options.columns[colIndex];
        if (column) {
          const left = this.getColumnOffsetDirect(colIndex);
          setStyles(cell, {
            width: `${column.width ?? 100}px`,
            left: `${left}px`,
            // 关键修复：不在这里设置边框，完全依赖 CSS 类
          });
          
          // 确保单元格有边框类
          if (!cell.classList.contains('ss-cell')) {
            cell.classList.add('ss-cell');
          }
        }
      }
      
      // 更新单元格内容（无论是否是新创建的）
      this.renderCell(cell, rowIndex, colIndex, rowData);
    }
    
    // 行高自适应：检查该行所有单元格的最大高度
    // 关键修复：在移除不可见单元格之前计算行高，确保所有可见单元格都被考虑
    // 策略：同步计算行高并存储，立即更新位置
    // 这样可以确保虚拟滚动能立即使用正确的行高

    // 优先使用预计算的高度（如果已经存在）
    let maxHeight = this.rowHeights.get(rowIndex) || this.options.rowHeight;

    // 获取当前行中所有已渲染的单元格（包括即将被移除的）
    const allRowCells = row.querySelectorAll('.ss-cell:not(.ss-row-number)');

    // 优先使用 data-needed-height（这是渲染器预先计算的）
    allRowCells.forEach(cellEl => {
      const neededHeight = cellEl.getAttribute('data-needed-height');
      if (neededHeight) {
        const height = parseFloat(neededHeight);
        if (!isNaN(height) && height > maxHeight) {
          maxHeight = height;
        }
      }
    });

    // 如果预计算的高度存在且有效，使用它而不是 scrollHeight
    // 避免 scrollHeight 与预计算高度不一致导致的滚动条问题
    const precalculatedHeight = this.rowHeights.get(rowIndex);
    const hasPrecalculatedHeight = precalculatedHeight !== undefined && precalculatedHeight > this.options.rowHeight;

    // 只在以下情况使用 scrollHeight：
    // 1. 没有预计算高度
    // 2. 预计算高度等于默认高度（说明该行不需要自适应高度）
    if (!hasPrecalculatedHeight && allRowCells.length > 0) {
      // 检查是否有 wrap 或 fixed 模式的列（这些列可能需要更大的高度）
      const hasWrapMode = this.options.columns.some(col => col.wrapText === 'wrap' || col.wrapText === 'fixed');
      if (hasWrapMode) {
        allRowCells.forEach(cellEl => {
          const actualHeight = (cellEl as HTMLElement).scrollHeight;
          if (actualHeight > maxHeight) {
            maxHeight = actualHeight;
          }
        });
      }
    }
    // 如果有预计算高度，直接使用它，不再检查 scrollHeight
    // 这样可以确保 getTotalHeight() 的结果与实际渲染一致

    // 立即存储行的实际高度到缓存（确保虚拟滚动能使用）
    const oldHeight = this.rowHeights.get(rowIndex);
    this.rowHeights.set(rowIndex, maxHeight);
    
    // 更新行高样式
    setStyles(row, {
      height: `${maxHeight}px`,
    });
    
    // 同时更新行号单元格的高度
    const rowNumberCell = row.querySelector('.ss-row-number') as HTMLElement;
    if (rowNumberCell) {
      setStyles(rowNumberCell, {
        height: `${maxHeight}px`,
        minHeight: `${maxHeight}px`, // 确保最小高度
      });
    }
    
    // 关键修复：更新该行所有单元格的高度（包括即将被移除的）
    // 这样可以确保所有单元格都有正确的高度，防止边框缺失
    allRowCells.forEach(cellEl => {
      const cell = cellEl as HTMLElement;
      setStyles(cell, {
        height: `${maxHeight}px`,
        minHeight: `${maxHeight}px`, // 确保最小高度，防止边框缺失
        // 关键修复：不在这里设置边框，完全依赖 CSS 类
      });
      
      // 确保单元格有边框类
      if (!cell.classList.contains('ss-cell')) {
        cell.classList.add('ss-cell');
      }
    });
    
    // 移除不可见的单元格（在更新高度之后）
    // 这样可以确保即使单元格即将被移除，它们也有正确的高度，不会影响边框显示
    const cells = row.querySelectorAll('.ss-cell:not(.ss-row-number)');
    cells.forEach(cell => {
      const colIndex = parseInt((cell as HTMLElement).dataset.col || '-1', 10);
      if (colIndex < state.startCol || colIndex > state.endCol) {
        // 在移除之前，确保单元格有正确的高度（防止边框缺失）
        setStyles(cell as HTMLElement, {
          height: `${maxHeight}px`,
          minHeight: `${maxHeight}px`,
        });
        cell.remove();
        this.cellCache.delete(`${rowIndex}:${colIndex}`);
      }
    });
    
    // 如果行高变化了，需要更新所有行的位置
    // 关键：当前行的位置已经在 renderRows 中更新了
    // 其他行的位置更新延迟到滚动停止后，避免滚动时闪烁
    if (oldHeight !== undefined && Math.abs(maxHeight - oldHeight) > 0.1) {
      // 延迟更新其他行的位置，避免滚动时闪烁
      // 当前行的位置已经在 renderRows 中更新了，不需要立即更新所有行
      if (!this.updateRowPositionsDebounced) {
        this.updateRowPositionsDebounced = rafThrottle(() => {
          this.updateRowPositions();
          // 重新计算虚拟滚动状态（可能会扩展可视区域）
          this.virtualScroll.update({});
        });
      }
      // 只在滚动停止后更新（通过 scrollend 事件触发），避免滚动时闪烁
      // 滚动过程中不更新位置，因为 renderRows 已经处理了当前可见行的位置
    }
  }

  /**
   * 创建单元格元素
   */
  private createCell(rowIndex: number, colIndex: number): HTMLElement {
    const cell = createElement('div', 'ss-cell');
    cell.dataset.row = String(rowIndex);
    cell.dataset.col = String(colIndex);

    const column = this.options.columns[colIndex];
    // 使用 getColumnOffsetDirect 确保与选区框计算一致
    const left = this.getColumnOffsetDirect(colIndex);

    // 判断是否是 wrapText 模式
    const isWrapText = column?.wrapText === 'wrap' || column?.wrapText === 'fixed';

    setStyles(cell, {
      width: `${column?.width ?? 100}px`,
      // wrapText 模式不设置固定高度，让内容自然撑开；其他模式使用默认行高
      height: isWrapText ? '' : `${this.options.rowHeight}px`,
      minHeight: `${this.options.rowHeight}px`, // 确保最小高度，防止边框缺失
      left: `${left}px`,
      textAlign: column?.align || 'left',
    });

    // 如果是 wrapText 模式，添加标记
    if (isWrapText) {
      cell.classList.add('ss-cell-wrap-text');
    }

    // 确保单元格有边框类
    cell.classList.add('ss-cell');

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
    
    // 检查是否有预览状态（避免重新渲染时丢失预览）
    const hasPreview = cell.classList.contains('ss-cell-preview-expanded') || 
                      cell.querySelector('.ss-cell-preview-content');
    
    // 清空单元格（但保留预览状态）
    if (!hasPreview) {
      cell.textContent = '';
    }
    
    // 渲染内容（如果有预览状态，跳过渲染以避免覆盖预览内容）
    if (!hasPreview) {
      renderer.render(cell, value, rowData, column);
    }
    
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
    
    // 应用验证错误样式
    const errorMessage = this.validationErrors.get(cellKey);
    if (errorMessage) {
      cell.classList.add('ss-cell-error');
      this.updateErrorTooltip(cell, errorMessage);
    } else {
      cell.classList.remove('ss-cell-error');
      this.removeErrorTooltip(cell);
    }
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
          case 'date':
            renderer = new DateRenderer();
            break;
          case 'select':
            renderer = new SelectRenderer();
            break;
          case 'email':
            renderer = new EmailRenderer();
            break;
          case 'phone':
            renderer = new PhoneRenderer();
            break;
          case 'link':
            renderer = new LinkRenderer();
            break;
          case 'boolean':
            renderer = new CheckboxRenderer();
            // 设置复选框值变化回调
            (renderer as CheckboxRenderer).setOnChange((row, col, value) => {
              this.onCellChangeFn?.(row, col, value);
            });
            break;
          case 'file':
            renderer = new FileRenderer();
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
    // 计算新旧选区的差异，只更新变化的单元格
    const newSelectedSet = new Set<string>();
    for (const cell of selectedCells) {
      newSelectedSet.add(`${cell.row}:${cell.col}`);
    }
    
    // 移除不再选中的单元格的选中样式
    for (const cellKey of this.selectedCells) {
      if (!newSelectedSet.has(cellKey)) {
        const [row, col] = cellKey.split(':').map(Number);
        const cell = this.cellCache.get(cellKey);
        if (cell) {
          cell.classList.remove('ss-cell-selected', 'ss-cell-active');
        }
      }
    }
    
    // 添加新选中单元格的选中样式
    for (const cellKey of newSelectedSet) {
      if (!this.selectedCells.has(cellKey)) {
        const [row, col] = cellKey.split(':').map(Number);
        const cell = this.cellCache.get(cellKey);
        if (cell) {
          cell.classList.add('ss-cell-selected');
        }
      }
    }
    
    // 更新活动单元格样式
    // 先清除所有活动单元格样式
    for (const cell of this.cellCache.values()) {
      cell.classList.remove('ss-cell-active');
    }
    
    // 设置新的活动单元格样式
    if (activeCell) {
      const activeCellKey = `${activeCell.row}:${activeCell.col}`;
      const activeCellEl = this.cellCache.get(activeCellKey);
      if (activeCellEl) {
        activeCellEl.classList.add('ss-cell-active');
      }
    }
    
    // 更新内部状态
    this.selectedCells = newSelectedSet;
    this.activeCell = activeCell;
    
    // 更新选区边框层（不重新渲染整个表格）
    this.renderSelectionBorder(selectedCells, activeCell);
  }

  /** 选区框元素缓存 */
  private selectionBox: HTMLElement | null = null;

  /**
   * 计算列偏移量（直接使用 this.options.columns，确保与渲染数据一致）
   */
  private getColumnOffsetDirect(colIndex: number): number {
    let offset = this.options.showRowNumber ? this.options.rowNumberWidth : 0;
    for (let i = 0; i < colIndex; i++) {
      offset += this.options.columns[i]?.width ?? 100;
    }
    return offset;
  }

  /**
   * 渲染选区边框
   * 重构：使用表头单元格的位置来确定水平位置（表头使用 flex 布局，位置一定正确）
   */
  private renderSelectionBorder(
    selectedCells: Array<{ row: number; col: number }>,
    activeCell: { row: number; col: number } | null
  ): void {
    if (!this.selectionLayer || !this.scrollContainer || !this.root || !this.headerRow) return;
    
    // 只移除选区框，保留其他元素（如填充手柄）
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    
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
    
    // 使用表头单元格来确定水平位置（表头使用 flex 布局，位置一定正确）
    const headerCells = this.headerRow.querySelectorAll('.ss-header-cell:not(.ss-corner-cell)');
    const minColHeader = headerCells[minCol] as HTMLElement;
    const maxColHeader = headerCells[maxCol] as HTMLElement;
    
    if (!minColHeader || !maxColHeader) {
      // 如果找不到表头单元格，不显示选区框
      return;
    }
    
    const rootRect = this.root.getBoundingClientRect();
    const scrollTop = this.scrollContainer.scrollTop;
    
    // 水平位置从表头获取（最可靠）
    const minColRect = minColHeader.getBoundingClientRect();
    const maxColRect = maxColHeader.getBoundingClientRect();
    
    const left = minColRect.left - rootRect.left;
    const width = maxColRect.right - minColRect.left;
    
    // 垂直位置通过计算获取（使用实际行高）
    const top = this.getRowOffset(minRow) + this.options.headerHeight - scrollTop;
    let height = 0;
    for (let i = minRow; i <= maxRow; i++) {
      height += this.getRowHeight(i);
    }
    
    this.selectionBox = createElement('div', 'ss-selection-box');
    setStyles(this.selectionBox, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    this.selectionLayer.appendChild(this.selectionBox);
  }

  /**
   * 处理虚拟滚动变化
   */
  private handleVirtualScrollChange(state: VirtualScrollState): void {
    // 确保状态有效
    if (state.startRow >= 0 && state.endRow >= state.startRow) {
      // 即使 endRow 超出范围，也要渲染（可能是计算误差）
      this.renderRows(state);

      // 首屏渲染后修正行高（使用 requestAnimationFrame 确保 DOM 已完成渲染）
      if (this.rowCache.size > 0) {
        requestAnimationFrame(() => {
          this.correctVisibleRowHeights();
        });
      }
    }
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
    // 修复：使用记录的上一次列数量来检测变化
    // 因为 options.columns 和 this.options.columns 可能是同一个数组引用
    // 当外部通过 splice 修改数组后，两边的 length 会相等，无法检测到变化
    const newColumnCount = options.columns?.length ?? this.options.columns.length;
    const columnsChanged = newColumnCount !== this.lastColumnCount;
    
    Object.assign(this.options, options);
    
    // 更新列数量记录
    this.lastColumnCount = this.options.columns.length;
    
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
    
    // 如果列变化（数量或配置），清除所有缓存并重新渲染
    // 总是清除渲染器缓存，因为列类型或配置可能已改变
    if (options.columns) {
      this.clearCache();
      // 清除渲染器缓存，确保使用新的渲染器
      this.rendererCache.clear();
    } else if (columnsChanged) {
      this.clearCache();
    }
    
    this.render();
  }

  /**
   * 清除行和单元格缓存
   */
  private clearCache(): void {
    // 移除所有行元素
    for (const row of this.rowCache.values()) {
      row.remove();
    }
    this.rowCache.clear();
    this.cellCache.clear();
    this.rowHeights.clear(); // 清除行高缓存
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
  /**
   * 根据 Y 坐标获取行索引（使用实际行高）
   */
  getRowIndexFromY(y: number): number {
    // 如果 y 小于 0，返回第一行
    if (y < 0) {
      return 0;
    }
    
    let currentOffset = 0;
    for (let i = 0; i < this.options.rowCount; i++) {
      const rowHeight = this.rowHeights.get(i) || this.options.rowHeight;
      const nextOffset = currentOffset + rowHeight;
      
      // 如果 y 在当前行的范围内（包括起始位置，不包括结束位置）
      if (y >= currentOffset && y < nextOffset) {
        return i;
      }
      
      // 如果 y 正好等于下一行的起始位置，返回下一行（如果存在）
      if (y === nextOffset && i < this.options.rowCount - 1) {
        return i + 1;
      }
      
      // 如果 y 已经超过当前行的结束位置，继续查找下一行
      if (y >= nextOffset) {
        currentOffset = nextOffset;
        continue;
      }
    }
    
    // 如果超出范围，返回最后一行
    return Math.max(0, this.options.rowCount - 1);
  }

  getCellFromPoint(x: number, y: number): { row: number; col: number } | null {
    if (!this.scrollContainer) return null;
    
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    
    // 减去表头高度
    const adjustedY = y - this.options.headerHeight + scrollTop;
    const adjustedX = x + scrollLeft;
    
    if (adjustedY < 0) return null;
    
    // 使用实际行高计算行索引
    const row = this.getRowIndexFromY(adjustedY);
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
    
    // 使用实际行高计算位置
    const top = this.getRowOffset(row) + this.options.headerHeight - scrollTop;
    // 使用 getColumnOffsetDirect 确保与单元格和选区框计算一致
    const left = this.getColumnOffsetDirect(col) - scrollLeft;
    const width = this.options.columns[col]?.width ?? 100;
    const height = this.getRowHeight(row);
    
    return new DOMRect(
      rootRect.left + left,
      rootRect.top + top,
      width,
      height
    );
  }

  /**
   * 获取总高度（考虑自适应行高）
   */
  getTotalHeight(): number {
    let totalHeight = 0;
    let maxRowIndex = -1;
    for (let i = 0; i < this.options.rowCount; i++) {
      const rowHeight = this.rowHeights.get(i) || this.options.rowHeight;
      totalHeight += rowHeight;
      if (rowHeight > this.options.rowHeight) {
        maxRowIndex = i;
      }
    }
    // 调试日志（可以删除）
    // console.log(`[getTotalHeight] totalHeight: ${totalHeight}, rowCount: ${this.options.rowCount}, maxRowIndex: ${maxRowIndex}`);
    return totalHeight;
  }

  /**
   * 获取行的实际偏移量（考虑自适应行高）
   */
  getRowOffset(rowIndex: number): number {
    let offset = 0;
    for (let i = 0; i < rowIndex; i++) {
      const rowHeight = this.rowHeights.get(i) || this.options.rowHeight;
      offset += rowHeight;
    }
    return offset;
  }

  /**
   * 获取行的实际高度（考虑自适应行高）
   */
  getRowHeight(rowIndex: number): number {
    return this.rowHeights.get(rowIndex) || this.options.rowHeight;
  }

  /**
   * 滚动到指定单元格（使用实际行高）
   */
  scrollToCell(row: number, col: number): void {
    if (!this.scrollContainer || !this.root) return;
    
    const viewportRect = this.root.getBoundingClientRect();
    const viewportHeight = viewportRect.height - this.options.headerHeight;
    const viewportWidth = viewportRect.width;
    
    const cellTop = this.getRowOffset(row);
    const cellLeft = this.getColumnOffsetDirect(col);
    const cellWidth = this.options.columns[col]?.width ?? 100;
    const cellHeight = this.getRowHeight(row);
    const cellBottom = cellTop + cellHeight;
    const cellRight = cellLeft + cellWidth;
    
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    
    let newScrollTop = scrollTop;
    let newScrollLeft = scrollLeft;
    
    // 垂直方向
    if (cellTop < scrollTop) {
      newScrollTop = cellTop;
    } else if (cellBottom > scrollTop + viewportHeight) {
      newScrollTop = cellBottom - viewportHeight;
    }
    
    // 水平方向
    if (cellLeft < scrollLeft) {
      newScrollLeft = cellLeft;
    } else if (cellRight > scrollLeft + viewportWidth) {
      newScrollLeft = cellRight - viewportWidth;
    }
    
    if (newScrollTop !== scrollTop || newScrollLeft !== scrollLeft) {
      this.scrollContainer.scrollTo({
        top: newScrollTop,
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
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

  // ===== 排序指示器 =====

  /** 当前排序的列索引 */
  private sortColumnIndex: number | null = null;

  /** 当前排序方向 */
  private sortDirection: 'asc' | 'desc' | null = null;

  /**
   * 更新表头排序指示器
   */
  updateSortIndicator(colIndex: number, direction: 'asc' | 'desc' | null): void {
    // 获取旧排序列的引用
    let oldHeaderCell: HTMLElement | null = null;
    if (this.sortColumnIndex !== null) {
      oldHeaderCell = this.headerRow?.querySelector(`[data-col="${this.sortColumnIndex}"]`) as HTMLElement;
      if (oldHeaderCell) {
        // 清除旧的排序样式
        oldHeaderCell.classList.remove('ss-sort-asc', 'ss-sort-desc');
        // 恢复可排序指示器（如果该列仍然可排序）
        oldHeaderCell.classList.add('ss-sortable');
      }
    }

    // 处理当前列
    const headerCell = this.headerRow?.querySelector(`[data-col="${colIndex}"]`) as HTMLElement;
    if (headerCell) {
      // 清除所有排序相关的样式
      headerCell.classList.remove('ss-sort-asc', 'ss-sort-desc', 'ss-sortable');

      if (direction) {
        // 添加新的排序样式（CSS 使用 ::before 显示箭头）
        headerCell.classList.add(`ss-sort-${direction}`);
      } else {
        // 恢复可排序指示器
        headerCell.classList.add('ss-sortable');
      }
    }

    // 更新状态
    this.sortColumnIndex = colIndex;
    this.sortDirection = direction;
  }

  /**
   * 清除所有排序指示器
   */
  clearAllSortIndicators(): void {
    if (this.sortColumnIndex !== null) {
      const headerCell = this.headerRow?.querySelector(`[data-col="${this.sortColumnIndex}"]`) as HTMLElement;
      if (headerCell) {
        headerCell.classList.remove('ss-sort-asc', 'ss-sort-desc');
        // 恢复可排序指示器
        headerCell.classList.add('ss-sortable');
      }
    }
    this.sortColumnIndex = null;
    this.sortDirection = null;
  }
}

