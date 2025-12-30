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
  
  private state: VirtualScrollState = {
    startRow: 0,
    endRow: 0,
    startCol: 0,
    endCol: 0,
    offsetY: 0,
    offsetX: 0,
  };
  
  private scrollHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: VirtualScrollOptions) {
    super();
    this.rowHeight = options.rowHeight;
    this.headerHeight = options.headerHeight;
    this.columns = options.columns;
    this.rowCount = options.rowCount;
    this.buffer = options.buffer ?? 5;
    this.rowNumberWidth = options.rowNumberWidth ?? 50;
    this.showRowNumber = options.showRowNumber ?? true;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement, viewport: HTMLElement, scrollContainer: HTMLElement): void {
    this.container = container;
    this.viewport = viewport;
    this.scrollContainer = scrollContainer;
    
    // 监听滚动事件（使用 RAF 节流）
    this.scrollHandler = rafThrottle(this.handleScroll.bind(this));
    scrollContainer.addEventListener('scroll', this.scrollHandler, { passive: true });
    
    // 监听容器大小变化
    this.resizeObserver = new ResizeObserver(rafThrottle(() => {
      this.calculate();
    }));
    this.resizeObserver.observe(viewport);
    
    // 初始计算
    this.calculate();
  }

  /**
   * 卸载
   */
  unmount(): void {
    if (this.scrollContainer && this.scrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.container = null;
    this.viewport = null;
    this.scrollContainer = null;
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
   * 获取行的起始位置
   */
  getRowOffset(rowIndex: number): number {
    return rowIndex * this.rowHeight;
  }

  /**
   * 根据 Y 坐标获取行索引
   */
  getRowIndexFromY(y: number): number {
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
    
    const cellTop = this.getRowOffset(row);
    const cellLeft = this.getColumnOffset(col);
    const cellWidth = this.getColumnWidth(col);
    const cellBottom = cellTop + this.rowHeight;
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
    this.calculate();
    this.emit('scroll', this.state);
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
    
    // 计算可见行范围
    const startRow = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
    const visibleRows = Math.ceil(viewportHeight / this.rowHeight);
    const endRow = Math.min(this.rowCount - 1, startRow + visibleRows + this.buffer * 2);
    
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
    
    const newState: VirtualScrollState = {
      startRow,
      endRow,
      startCol,
      endCol,
      offsetY: startRow * this.rowHeight,
      offsetX: this.getColumnOffset(startCol),
    };
    
    // 检查状态是否变化
    if (
      this.state.startRow !== newState.startRow ||
      this.state.endRow !== newState.endRow ||
      this.state.startCol !== newState.startCol ||
      this.state.endCol !== newState.endCol
    ) {
      this.state = newState;
      this.emit('change', this.state);
    } else {
      this.state = newState;
    }
  }
}

