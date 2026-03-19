/**
 * 表格滚动管理钩子
 * 统一管理 scrollLeft 和 scrollTop，支持冻结区域的同步滚动
 */

import { EventEmitter } from '../core/EventEmitter';

interface TableScrollEvents {
  'scroll': { scrollLeft: number; scrollTop: number };
  'scroll:horizontal': number;
  'scroll:vertical': number;
}

interface TableScrollOptions {
  /** 滚动容器 */
  scrollContainer: HTMLElement;
  /** 冻结行数 */
  frozenRows?: number;
  /** 冻结列数 */
  frozenCols?: number;
  /** 行高 */
  rowHeight: number;
  /** 表头高度 */
  headerHeight: number;
  /** 获取列宽 */
  getColumnWidth: (index: number) => number;
  /** 是否显示行号 */
  showRowNumber: boolean;
  /** 行号列宽度 */
  rowNumberWidth: number;
}

export class UseTableScroll extends EventEmitter<TableScrollEvents> {
  private scrollContainer: HTMLElement;
  private options: TableScrollOptions;
  
  private scrollLeft: number = 0;
  private scrollTop: number = 0;
  
  private rafId: number | null = null;

  constructor(options: TableScrollOptions) {
    super();
    this.scrollContainer = options.scrollContainer;
    this.options = options;
    
    this.init();
  }

  /**
   * 初始化滚动监听
   */
  private init(): void {
    this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  /**
   * 处理滚动事件
   */
  private handleScroll(): void {
    const { scrollLeft, scrollTop } = this.scrollContainer;
    
    this.scrollLeft = scrollLeft;
    this.scrollTop = scrollTop;
    
    // 使用 RAF 节流，避免频繁触发
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      this.emit('scroll', { scrollLeft, scrollTop });
      this.emit('scroll:horizontal', scrollLeft);
      this.emit('scroll:vertical', scrollTop);
    });
  }

  /**
   * 获取当前滚动位置
   */
  getScrollPosition(): { scrollLeft: number; scrollTop: number } {
    return {
      scrollLeft: this.scrollLeft,
      scrollTop: this.scrollTop,
    };
  }

  /**
   * 获取水平滚动位置
   */
  getScrollLeft(): number {
    return this.scrollLeft;
  }

  /**
   * 获取垂直滚动位置
   */
  getScrollTop(): number {
    return this.scrollTop;
  }

  /**
   * 设置滚动位置
   */
  scrollTo(left: number, top: number, behavior: ScrollBehavior = 'auto'): void {
    this.scrollContainer.scrollTo({
      left,
      top,
      behavior,
    });
  }

  /**
   * 水平滚动
   */
  scrollHorizontal(left: number, behavior: ScrollBehavior = 'auto'): void {
    this.scrollContainer.scrollTo({
      left,
      behavior,
    });
  }

  /**
   * 垂直滚动
   */
  scrollVertical(top: number, behavior: ScrollBehavior = 'auto'): void {
    this.scrollContainer.scrollTo({
      top,
      behavior,
    });
  }

  /**
   * 获取冻结行高度
   */
  getFrozenRowsHeight(): number {
    const { frozenRows = 0, rowHeight, headerHeight } = this.options;
    if (frozenRows === 0) return 0;
    return frozenRows * rowHeight + headerHeight;
  }

  /**
   * 获取冻结列宽度
   */
  getFrozenColsWidth(): number {
    const { frozenCols = 0, showRowNumber, rowNumberWidth, getColumnWidth } = this.options;
    if (frozenCols === 0) return 0;
    
    let width = showRowNumber ? rowNumberWidth : 0;
    for (let i = 0; i < frozenCols; i++) {
      width += getColumnWidth(i);
    }
    return width;
  }

  /**
   * 获取用于 transform 的偏移值
   * 行冻结区：只同步横向位移
   * 列冻结区：只同步纵向位移
   */
  getTransformOffset(): { 
    frozenRows: { x: number; y: number };
    frozenCols: { x: number; y: number };
    corner: { x: number; y: number };
  } {
    const { frozenRows = 0, frozenCols = 0 } = this.options;
    
    return {
      // 行冻结区：跟随横向滚动
      frozenRows: {
        x: frozenRows > 0 ? this.scrollLeft : 0,
        y: 0,
      },
      // 列冻结区：跟随纵向滚动
      frozenCols: {
        x: 0,
        y: frozenCols > 0 ? this.scrollTop : 0,
      },
      // 角落区：固定不动
      corner: {
        x: 0,
        y: 0,
      },
    };
  }

  /**
   * 获取 transform CSS 值
   */
  getTransformStyles(): {
    frozenRows: string;
    frozenCols: string;
    corner: string;
  } {
    const offset = this.getTransformOffset();
    
    return {
      frozenRows: `translate3d(${offset.frozenRows.x}px, 0, 0)`,
      frozenCols: `translate3d(0, ${offset.frozenCols.y}px, 0)`,
      corner: 'translate3d(0, 0, 0)',
    };
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    // 移除事件监听
    // 注意：scroll 事件是绑定在 scrollContainer 上的，如果 scrollContainer 被销毁，事件会自动清除
  }
}

/**
 * 创建表格滚动管理器
 */
export function createTableScroll(options: TableScrollOptions): UseTableScroll {
  return new UseTableScroll(options);
}

/**
 * useTableScroll 钩子 - 统一管理表格滚动
 * 这是 createTableScroll 的别名，用于 React/Vue 风格的命名
 */
export function useTableScroll(options: TableScrollOptions): UseTableScroll {
  return createTableScroll(options);
}
