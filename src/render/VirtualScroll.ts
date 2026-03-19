/**
 * 虚拟滚动管理器
 * 只渲染可视区域内的单元格，支持大数据量
 */

import { EventEmitter } from '../core/EventEmitter';
import type { VirtualScrollState, Column } from '../types';
import { rafThrottle } from '../utils/dom';

interface VirtualScrollEvents {
  'scroll': VirtualScrollState;
  'change': VirtualScrollState;
}

interface VirtualScrollOptions {
  /** 行高 */
  rowHeight: number;
  /** 表头高度 */
  headerHeight: number;
  /** 列定义 */
  columns: Column[];
  /** 总行数 */
  rowCount: number;
  /** 缓冲区大小（行数） */
  buffer?: number;
  /** 行号列宽度 */
  rowNumberWidth?: number;
  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 获取实际总高度的回调函数（用于动态行高） */
  getTotalHeight?: () => number;
  /** 列隐藏检查函数 */
  isColumnHidden?: (col: number) => boolean;
  /** 行隐藏检查函数 */
  isRowHidden?: (row: number) => boolean;
  /** 冻结行数 */
  frozenRows?: number;
  /** 冻结列数 */
  frozenCols?: number;
}

export class VirtualScroll extends EventEmitter<VirtualScrollEvents> {
  private container: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;

  private rowHeight: number;
  private headerHeight: number;
  private columns: Column[];
  private rowCount: number;
  private buffer: number;
  private rowNumberWidth: number;
  private showRowNumber: boolean;
  private getTotalHeightFn?: () => number;
  private isColumnHiddenFn?: (col: number) => boolean;
  private isRowHiddenFn?: (row: number) => boolean;
  
  /** 冻结配置 */
  private frozenRows: number = 0;
  private frozenCols: number = 0;

  /** 内部行高缓存（支持动态行高） */
  private rowHeights: Map<number, number> = new Map();

  /** 是否有动态行高（如果有，则使用累加计算） */
  private hasDynamicHeights: boolean = false;
  
  private state: VirtualScrollState = {
    startRow: 0,
    endRow: 0,
    startCol: 0,
    endCol: 0,
    offsetY: 0,
    offsetX: 0,
  };
  
  private scrollHandler: (() => void) | null = null;
  private pendingUpdate: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private handleScrollEnd: (() => void) | null = null;

  /** 缓存的视口尺寸（只在调整大小时更新，避免滚动跳动） */
  private cachedViewportHeight: number = 0;
  private cachedViewportWidth: number = 0;

  constructor(options: VirtualScrollOptions) {
    super();
    this.rowHeight = options.rowHeight;
    this.headerHeight = options.headerHeight;
    this.columns = options.columns;
    this.rowCount = options.rowCount;
    // 对于动态行高，需要更大的缓冲区，确保滚动时不会出现空白
    this.buffer = options.buffer ?? 10;
    this.rowNumberWidth = options.rowNumberWidth ?? 50;
    this.showRowNumber = options.showRowNumber ?? true;
    this.getTotalHeightFn = options.getTotalHeight;
    this.isColumnHiddenFn = options.isColumnHidden;
    this.isRowHiddenFn = options.isRowHidden;
    this.frozenRows = options.frozenRows ?? 0;
    this.frozenCols = options.frozenCols ?? 0;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement, viewport: HTMLElement, scrollContainer: HTMLElement): void {
    this.container = container;
    this.viewport = viewport;
    this.scrollContainer = scrollContainer;

    // 先初始化视口尺寸缓存
    this.updateCachedViewportSize();

    // 监听滚动事件
    // 直接处理，不使用 rafThrottle，避免因节流导致的滚动锚定问题
    this.scrollHandler = () => {
      this.handleScroll();
    };
    scrollContainer.addEventListener('scroll', this.scrollHandler, { passive: true });

    // 添加 scrollend 事件监听（如果浏览器支持）
    // 确保滚动完全停止后也能更新
    if ('onscrollend' in scrollContainer) {
      this.handleScrollEnd = this.createScrollEndHandler();
      scrollContainer.addEventListener('scrollend', this.handleScrollEnd, { passive: true });
    }

    // 监听容器大小变化
    this.resizeObserver = new ResizeObserver(rafThrottle(() => {
      // 先更新缓存的视口尺寸
      this.updateCachedViewportSize();
      this.calculate();
    }));
    this.resizeObserver.observe(viewport);

    // 初始计算并触发 change 事件
    this.calculate();
    this.emit('change', this.state);
  }

  /**
   * 卸载
   */
  unmount(): void {
    if (this.scrollContainer && this.scrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
      // 移除 scrollend 事件监听
      if (this.handleScrollEnd && 'onscrollend' in this.scrollContainer) {
        this.scrollContainer.removeEventListener('scrollend', this.handleScrollEnd);
      }
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.container = null;
    this.viewport = null;
    this.scrollContainer = null;
    this.handleScrollEnd = null;
  }
  
  /**
   * 处理滚动结束事件
   */
  private createScrollEndHandler(): () => void {
    return () => {
      // 延迟一点执行，确保所有 RAF 都已完成
      requestAnimationFrame(() => {
        // 重新计算状态（因为行高可能在滚动过程中变化了）
        this.calculate();
        // 强制触发 change 事件，确保渲染
        this.emit('change', this.state);
      });
    };
  }

  /**
   * 更新配置
   */
  update(options: Partial<VirtualScrollOptions>): void {
    if (options.rowHeight !== undefined) this.rowHeight = options.rowHeight;
    if (options.headerHeight !== undefined) this.headerHeight = options.headerHeight;
    if (options.columns !== undefined) this.columns = options.columns;
    if (options.rowCount !== undefined) this.rowCount = options.rowCount;
    if (options.buffer !== undefined) this.buffer = options.buffer;
    if (options.rowNumberWidth !== undefined) this.rowNumberWidth = options.rowNumberWidth;
    if (options.showRowNumber !== undefined) this.showRowNumber = options.showRowNumber;
    if (options.getTotalHeight !== undefined) this.getTotalHeightFn = options.getTotalHeight;
    if (options.frozenRows !== undefined) this.frozenRows = options.frozenRows;
    if (options.frozenCols !== undefined) this.frozenCols = options.frozenCols;

    this.calculate();
  }

  /**
   * 获取当前状态
   */
  getState(): VirtualScrollState {
    return { ...this.state };
  }

  /**
   * 获取总内容高度
   */
  getTotalHeight(): number {
    // 如果有动态行高，使用内部缓存计算
    if (this.hasDynamicHeights && this.rowHeights.size > 0) {
      let totalHeight = 0;
      for (let i = 0; i < this.rowCount; i++) {
        totalHeight += this.rowHeights.get(i) ?? this.rowHeight;
      }
      return totalHeight;
    }
    if (this.getTotalHeightFn) {
      return this.getTotalHeightFn();
    }
    return this.rowCount * this.rowHeight;
  }

  /**
   * 获取总内容宽度
   */
  getTotalWidth(): number {
    let width = this.showRowNumber ? this.rowNumberWidth : 0;
    for (const col of this.columns) {
      width += col.width ?? 100;
    }
    return width;
  }

  /**
   * 获取视口高度（缓存值）
   */
  getViewportHeight(): number {
    return this.cachedViewportHeight;
  }

  /**
   * 获取视口宽度（缓存值）
   */
  getViewportWidth(): number {
    return this.cachedViewportWidth;
  }

  /**
   * 获取冻结行高度
   */
  getFrozenRowsHeight(): number {
    if (this.frozenRows === 0) return 0;
    return this.frozenRows * this.rowHeight + this.headerHeight;
  }

  /**
   * 获取冻结列宽度
   */
  getFrozenColsWidth(): number {
    if (this.frozenCols === 0) return 0;
    let width = this.showRowNumber ? this.rowNumberWidth : 0;
    for (let i = 0; i < this.frozenCols && i < this.columns.length; i++) {
      if (this.isColumnHiddenFn && this.isColumnHiddenFn(i)) {
        continue;
      }
      width += this.columns[i]?.width ?? 100;
    }
    return width;
  }

  /**
   * 获取冻结配置
   */
  getFrozenConfig(): { rows: number; cols: number } {
    return {
      rows: this.frozenRows,
      cols: this.frozenCols,
    };
  }

  /**
   * 更新缓存的视口尺寸（只在调整大小时调用）
   */
  private updateCachedViewportSize(): void {
    if (!this.viewport) return;
    const viewportRect = this.viewport.getBoundingClientRect();
    this.cachedViewportHeight = Math.max(0, viewportRect.height - this.headerHeight);
    this.cachedViewportWidth = Math.max(0, viewportRect.width);
  }

  /**
   * 获取列的起始位置
   */
  getColumnOffset(colIndex: number): number {
    let offset = this.showRowNumber ? this.rowNumberWidth : 0;
    for (let i = 0; i < colIndex; i++) {
      offset += this.columns[i]?.width ?? 100;
    }
    return offset;
  }

  /**
   * 获取列宽
   */
  getColumnWidth(colIndex: number): number {
    return this.columns[colIndex]?.width ?? 100;
  }

  /**
   * 获取单行行高
   */
  getRowHeight(rowIndex: number): number {
    return this.rowHeights.get(rowIndex) ?? this.rowHeight;
  }

  /**
   * 设置行高（由 Renderer 调用）
   */
  setRowHeight(rowIndex: number, height: number): void {
    if (height !== this.rowHeight) {
      this.rowHeights.set(rowIndex, height);
      this.hasDynamicHeights = true;
    } else {
      this.rowHeights.delete(rowIndex);
    }
  }

  /**
   * 批量设置行高
   */
  setRowHeights(heights: Map<number, number>): void {
    this.rowHeights = new Map(heights);
    this.hasDynamicHeights = this.rowHeights.size > 0;
  }

  /**
   * 获取行的起始位置（使用内部 rowHeights 缓存）
   */
  getRowOffset(rowIndex: number): number {
    if (!this.hasDynamicHeights || this.rowHeights.size === 0) {
      return rowIndex * this.rowHeight;
    }
    let offset = 0;
    for (let i = 0; i < rowIndex; i++) {
      offset += this.rowHeights.get(i) ?? this.rowHeight;
    }
    return offset;
  }

  /**
   * 根据 Y 坐标获取行索引（使用内部 rowHeights 缓存）
   */
  getRowIndexFromY(y: number): number {
    if (!this.hasDynamicHeights || this.rowHeights.size === 0) {
      return Math.floor(y / this.rowHeight);
    }
    let currentOffset = 0;
    for (let i = 0; i < this.rowCount; i++) {
      const rowHeight = this.rowHeights.get(i) ?? this.rowHeight;
      if (y < currentOffset + rowHeight) {
        return i;
      }
      currentOffset += rowHeight;
    }
    return this.rowCount - 1;
  }

  /**
   * 根据 X 坐标获取列索引
   */
  getColumnIndexFromX(x: number): number {
    let offset = this.showRowNumber ? this.rowNumberWidth : 0;
    
    // 如果在行号区域
    if (x < offset) {
      return -1;
    }
    
    for (let i = 0; i < this.columns.length; i++) {
      offset += this.columns[i]?.width ?? 100;
      if (x < offset) {
        return i;
      }
    }
    
    return this.columns.length - 1;
  }

  /**
   * 滚动到指定单元格
   */
  scrollToCell(row: number, col: number, behavior: ScrollBehavior = 'smooth'): void {
    if (!this.scrollContainer || !this.viewport) return;

    // 使用缓存的视口尺寸，如果缓存无效则使用实际测量值
    let viewportHeight = this.cachedViewportHeight;
    let viewportWidth = this.cachedViewportWidth;

    if (viewportHeight <= 0 || viewportWidth <= 0) {
      const viewportRect = this.viewport.getBoundingClientRect();
      viewportHeight = Math.max(0, viewportRect.height - this.headerHeight);
      viewportWidth = Math.max(0, viewportRect.width);
    }

    // 注意：这里使用固定行高，但实际应该通过 Renderer 获取实际行高
    // 由于 VirtualScroll 不直接访问 Renderer，这里保持固定行高计算
    // 实际的滚动位置计算会在 Renderer.scrollToCell 中处理
    const cellTop = this.getRowOffset(row);
    const cellLeft = this.getColumnOffset(col);
    const cellWidth = this.getColumnWidth(col);
    const cellBottom = cellTop + this.rowHeight; // 使用固定行高作为估算
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
        behavior,
      });
    }
  }

  /**
   * 滚动到指定行
   */
  scrollToRow(row: number, behavior: ScrollBehavior = 'smooth'): void {
    if (!this.scrollContainer) return;

    const top = this.getRowOffset(row);
    this.scrollContainer.scrollTo({ top, behavior });
  }

  /**
   * 滚动到指定列
   */
  scrollToColumn(col: number, behavior: ScrollBehavior = 'smooth'): void {
    if (!this.scrollContainer) return;

    const left = this.getColumnOffset(col);
    this.scrollContainer.scrollTo({ left, behavior });
  }

  /**
   * 获取当前滚动位置（垂直）
   */
  getScrollTop(): number {
    return this.scrollContainer?.scrollTop ?? 0;
  }

  /**
   * 获取当前滚动位置（水平）
   */
  getScrollLeft(): number {
    return this.scrollContainer?.scrollLeft ?? 0;
  }

  /**
   * 处理滚动事件
   */
  private handleScroll(): void {
    // 先保存旧状态
    const oldState = { ...this.state };

    // 计算新状态
    this.calculate();

    // 触发 scroll 事件（用于其他需要实时滚动位置的场景）
    this.emit('scroll', this.state);

    // 只有当状态真正变化时才触发 change 事件（避免过度渲染）
    // 但需要立即触发，不能延迟，否则会导致滚动时内容空白
    const stateChanged = (
      oldState.startRow !== this.state.startRow ||
      oldState.endRow !== this.state.endRow ||
      oldState.startCol !== this.state.startCol ||
      oldState.endCol !== this.state.endCol
    );

    if (stateChanged) {
      // 立即触发 change 事件，确保渲染及时
      this.emit('change', this.state);
    }
  }

  /**
   * 计算可视区域
   * 支持冻结行列：主内容区从冻结数量后开始渲染
   */
  private calculate(): void {
    if (!this.scrollContainer || !this.viewport) return;

    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;

    // 使用缓存的视口尺寸，避免在滚动事件中调用 getBoundingClientRect()
    // 只有当缓存值有效（非0且合理）时才使用，否则使用 getBoundingClientRect()
    let viewportHeight = this.cachedViewportHeight;
    let viewportWidth = this.cachedViewportWidth;

    // 如果缓存值无效，使用实际测量值
    if (viewportHeight <= 0 || viewportWidth <= 0) {
      const viewportRect = this.viewport.getBoundingClientRect();
      viewportHeight = Math.max(0, viewportRect.height - this.headerHeight);
      viewportWidth = Math.max(0, viewportRect.width);
      // 更新缓存
      this.cachedViewportHeight = viewportHeight;
      this.cachedViewportWidth = viewportWidth;
    }

    // 避免除以零
    const safeRowHeight = this.rowHeight || 36;
    const visibleRows = Math.max(1, Math.ceil(viewportHeight / safeRowHeight));
    const bufferSize = Math.max(1, this.buffer * 2);

    // 计算起始行（考虑冻结行偏移）
    // 主内容区的起始行从冻结行数开始
    const effectiveRowCount = Math.max(0, this.rowCount - this.frozenRows);
    let startRow = this.frozenRows + Math.max(0, Math.floor(scrollTop / safeRowHeight) - bufferSize);

    // 关键修复：确保 startRow 不超过有效范围
    if (startRow > this.rowCount - 1) {
      startRow = Math.max(this.frozenRows, this.rowCount - visibleRows - bufferSize);
    }

    // 计算结束行
    let endRow = Math.min(this.rowCount - 1, startRow + visibleRows + bufferSize);

    // 确保 endRow 至少为 startRow（至少渲染可见行）
    endRow = Math.max(endRow, startRow);

    // 确保 endRow 不超过范围
    endRow = Math.min(endRow, this.rowCount - 1);

    // 确保 startRow 最小为冻结行数
    startRow = Math.max(this.frozenRows, startRow);

    // 【重要】滚动时始终使用固定行高计算可视区域
    // 不使用 hasDynamicHeights，避免滚动时动态行高导致滚动锚定问题
    // 动态行高只用于 offsetY 位置计算
    // 这样可以确保滚动位置稳定，不会因为动态行高计算导致滚动跳动

    // 最终保护：确保 startRow 和 endRow 都在有效范围内
    startRow = Math.max(this.frozenRows, Math.min(startRow, this.rowCount - 1));
    endRow = Math.max(startRow, Math.min(endRow, this.rowCount - 1));
    
    // 计算可见列范围（考虑冻结列偏移）
    // 主内容区的起始列从冻结列数开始
    const frozenColsWidth = this.getFrozenColsWidth();
    let colOffset = this.showRowNumber ? this.rowNumberWidth : 0;
    let startCol = this.frozenCols;
    let endCol = this.columns.length - 1;
    
    for (let i = this.frozenCols; i < this.columns.length; i++) {
      // 跳过隐藏列
      if (this.isColumnHiddenFn && this.isColumnHiddenFn(i)) {
        continue;
      }
      const colWidth = this.columns[i]?.width ?? 100;
      // 考虑冻结列宽度偏移
      if (colOffset + colWidth > scrollLeft + frozenColsWidth) {
        startCol = Math.max(this.frozenCols, i - this.buffer);
        break;
      }
      colOffset += colWidth;
    }
    
    colOffset = this.showRowNumber ? this.rowNumberWidth : 0;
    for (let i = this.frozenCols; i < this.columns.length; i++) {
      // 跳过隐藏列
      if (this.isColumnHiddenFn && this.isColumnHiddenFn(i)) {
        continue;
      }
      colOffset += this.columns[i]?.width ?? 100;
      // 考虑冻结列宽度偏移
      if (colOffset > scrollLeft + frozenColsWidth + viewportWidth) {
        endCol = Math.min(this.columns.length - 1, i + this.buffer);
        break;
      }
    }

    // 计算 offsetY（使用内部行高缓存，从冻结行后开始）
    const offsetY = this.getRowOffset(startRow);
    
    const newState: VirtualScrollState = {
      startRow,
      endRow,
      startCol,
      endCol,
      offsetY,
      offsetX: this.getColumnOffset(startCol),
    };
    
    // 检查状态是否变化
    const stateChanged = (
      this.state.startRow !== newState.startRow ||
      this.state.endRow !== newState.endRow ||
      this.state.startCol !== newState.startCol ||
      this.state.endCol !== newState.endCol
    );
    
    // 更新状态
    this.state = newState;
    
    // 如果状态变化了，触发 change 事件
    if (stateChanged) {
      this.emit('change', this.state);
    }
  }
}

