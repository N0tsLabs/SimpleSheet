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
  /** 获取行偏移量的回调函数（用于动态行高） */
  getRowOffset?: (rowIndex: number) => number;
  /** 获取行索引的回调函数（用于动态行高） */
  getRowIndexFromY?: (y: number) => number;
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
  private getRowOffsetFn?: (rowIndex: number) => number;
  private getRowIndexFromYFn?: (y: number) => number;
  
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
  private scrollRafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private handleScrollEnd: (() => void) | null = null;

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
    this.getRowOffsetFn = options.getRowOffset;
    this.getRowIndexFromYFn = options.getRowIndexFromY;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement, viewport: HTMLElement, scrollContainer: HTMLElement): void {
    this.container = container;
    this.viewport = viewport;
    this.scrollContainer = scrollContainer;
    
    // 监听滚动事件
    // 对于虚拟滚动，我们需要在滚动过程中及时更新
    // 关键优化：使用更积极的更新策略，确保滚动时内容不消失
    let lastScrollTop = scrollContainer.scrollTop;
    
    this.scrollHandler = () => {
      const currentScrollTop = scrollContainer.scrollTop;
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);
      
      // 如果滚动距离较大，立即更新（避免大滚动时出现空白）
      if (scrollDelta > 50) {
        if (this.scrollRafId) {
          cancelAnimationFrame(this.scrollRafId);
          this.scrollRafId = null;
        }
        lastScrollTop = currentScrollTop;
        this.handleScroll();
      } else {
        // 小滚动使用 RAF 节流
        if (!this.scrollRafId) {
          this.scrollRafId = requestAnimationFrame(() => {
            lastScrollTop = scrollContainer.scrollTop;
            this.handleScroll();
            this.scrollRafId = null;
          });
        }
      }
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
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }
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
    if (options.getRowOffset !== undefined) this.getRowOffsetFn = options.getRowOffset;
    if (options.getRowIndexFromY !== undefined) this.getRowIndexFromYFn = options.getRowIndexFromY;
    
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
   * 获取行的起始位置（需要外部提供实际行高信息）
   * 如果提供了回调函数，使用回调函数；否则使用固定行高估算
   */
  getRowOffset(rowIndex: number): number {
    if (this.getRowOffsetFn) {
      return this.getRowOffsetFn(rowIndex);
    }
    return rowIndex * this.rowHeight;
  }

  /**
   * 根据 Y 坐标获取行索引（需要外部提供实际行高信息）
   * 如果提供了回调函数，使用回调函数；否则使用固定行高估算
   */
  getRowIndexFromY(y: number): number {
    if (this.getRowIndexFromYFn) {
      return this.getRowIndexFromYFn(y);
    }
    return Math.floor(y / this.rowHeight);
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
    
    const viewportRect = this.viewport.getBoundingClientRect();
    const viewportHeight = viewportRect.height - this.headerHeight;
    const viewportWidth = viewportRect.width;
    
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
   */
  private calculate(): void {
    if (!this.scrollContainer || !this.viewport) return;

    const scrollTop = this.scrollContainer.scrollTop;
    const scrollLeft = this.scrollContainer.scrollLeft;
    const viewportRect = this.viewport.getBoundingClientRect();
    const viewportHeight = viewportRect.height - this.headerHeight;
    const viewportWidth = viewportRect.width;

    // 避免除以零
    const safeRowHeight = this.rowHeight || 36;
    const visibleRows = Math.max(1, Math.ceil(viewportHeight / safeRowHeight));
    const bufferSize = Math.max(1, this.buffer * 2);

    // 计算起始行
    let startRow = Math.max(0, Math.floor(scrollTop / safeRowHeight) - bufferSize);

    // 关键修复：确保 startRow 不超过有效范围
    if (startRow > this.rowCount - 1) {
      startRow = Math.max(0, this.rowCount - visibleRows - bufferSize);
    }

    // 计算结束行
    let endRow = Math.min(this.rowCount - 1, startRow + visibleRows + bufferSize);

    // 确保 endRow 至少为 startRow（至少渲染可见行）
    endRow = Math.max(endRow, startRow);

    // 确保 endRow 不超过范围
    endRow = Math.min(endRow, this.rowCount - 1);

    // 确保 startRow 最小为 0
    startRow = Math.max(0, startRow);
    
    // 如果提供了 getRowIndexFromYFn，并且已经有一些行被渲染过，可以尝试使用动态行高优化
    // 但只用于微调，不用于主要计算
    if (this.getRowIndexFromYFn && this.rowCount > 0) {
      try {
        const topRow = this.getRowIndexFromYFn(Math.max(0, scrollTop));
        const bottomRow = this.getRowIndexFromYFn(Math.min(scrollTop + viewportHeight, this.getTotalHeight()));

        // 只有当计算结果合理且与固定行高估算接近时才使用
        if (
          topRow >= 0 &&
          topRow < this.rowCount &&
          bottomRow >= topRow &&
          bottomRow < this.rowCount
        ) {
          // 取固定行高和动态行高的并集，确保覆盖足够范围
          const dynamicStartRow = Math.max(0, topRow - this.buffer);
          const dynamicEndRow = Math.min(this.rowCount - 1, bottomRow + this.buffer);

          // 取并集
          startRow = Math.min(startRow, dynamicStartRow);
          endRow = Math.max(endRow, dynamicEndRow);

          // 确保 endRow >= startRow
          if (endRow < startRow) {
            endRow = startRow;
          }
        }
      } catch (e) {
        // 如果计算出错，使用固定行高估算
      }
    }

    // 最终保护：确保 startRow 和 endRow 都在有效范围内
    startRow = Math.max(0, Math.min(startRow, this.rowCount - 1));
    endRow = Math.max(startRow, Math.min(endRow, this.rowCount - 1));
    
    // 计算可见列范围
    let colOffset = this.showRowNumber ? this.rowNumberWidth : 0;
    let startCol = 0;
    let endCol = this.columns.length - 1;
    
    for (let i = 0; i < this.columns.length; i++) {
      const colWidth = this.columns[i]?.width ?? 100;
      if (colOffset + colWidth > scrollLeft) {
        startCol = Math.max(0, i - this.buffer);
        break;
      }
      colOffset += colWidth;
    }
    
    colOffset = this.showRowNumber ? this.rowNumberWidth : 0;
    for (let i = 0; i < this.columns.length; i++) {
      colOffset += this.columns[i]?.width ?? 100;
      if (colOffset > scrollLeft + viewportWidth) {
        endCol = Math.min(this.columns.length - 1, i + this.buffer);
        break;
      }
    }
    
    // 计算 offsetY（使用实际行高）
    const offsetY = this.getRowOffsetFn ? this.getRowOffsetFn(startRow) : startRow * this.rowHeight;
    
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

