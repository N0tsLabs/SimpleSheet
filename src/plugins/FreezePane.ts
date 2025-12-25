/**
 * 冻结窗格插件
 * 支持冻结行、列
 */

import { EventEmitter } from '../core/EventEmitter';
import { createElement, setStyles } from '../utils/dom';

/**
 * 冻结配置
 */
export interface FreezePaneConfig {
  /** 冻结行数（从顶部） */
  rows: number;
  /** 冻结列数（从左侧） */
  cols: number;
}

interface FreezePaneEvents {
  'freeze:change': FreezePaneConfig;
}

interface FreezePaneOptions {
  /** 获取行高 */
  getRowHeight: () => number;
  /** 获取列宽 */
  getColumnWidth: (index: number) => number;
  /** 获取表头高度 */
  getHeaderHeight: () => number;
  /** 获取行号列宽度 */
  getRowNumberWidth: () => number;
  /** 是否显示行号 */
  showRowNumber: boolean;
}

export class FreezePane extends EventEmitter<FreezePaneEvents> {
  private config: FreezePaneConfig = { rows: 0, cols: 0 };
  private options: FreezePaneOptions;
  
  // 冻结面板元素
  private frozenCorner: HTMLElement | null = null;  // 左上角
  private frozenRows: HTMLElement | null = null;    // 冻结行
  private frozenCols: HTMLElement | null = null;    // 冻结列
  
  private container: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;

  constructor(options: FreezePaneOptions) {
    super();
    this.options = options;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement, scrollContainer: HTMLElement): void {
    this.container = container;
    this.scrollContainer = scrollContainer;
    
    // 创建冻结层
    this.createFrozenPanes();
    
    // 监听滚动
    scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
  }

  /**
   * 卸载
   */
  unmount(): void {
    this.frozenCorner?.remove();
    this.frozenRows?.remove();
    this.frozenCols?.remove();
    this.frozenCorner = null;
    this.frozenRows = null;
    this.frozenCols = null;
    this.container = null;
    this.scrollContainer = null;
  }

  /**
   * 创建冻结面板
   */
  private createFrozenPanes(): void {
    if (!this.container) return;

    // 冻结列面板（左侧）
    this.frozenCols = createElement('div', 'ss-frozen-cols');
    setStyles(this.frozenCols, {
      display: 'none',
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '30',
      overflow: 'hidden',
      pointerEvents: 'none',
    });
    this.container.appendChild(this.frozenCols);

    // 冻结行面板（顶部）
    this.frozenRows = createElement('div', 'ss-frozen-rows');
    setStyles(this.frozenRows, {
      display: 'none',
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '31',
      overflow: 'hidden',
      pointerEvents: 'none',
    });
    this.container.appendChild(this.frozenRows);

    // 冻结角落（左上角）
    this.frozenCorner = createElement('div', 'ss-frozen-corner');
    setStyles(this.frozenCorner, {
      display: 'none',
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '32',
      overflow: 'hidden',
      pointerEvents: 'none',
    });
    this.container.appendChild(this.frozenCorner);
  }

  /**
   * 设置冻结
   */
  freeze(rows: number, cols: number): void {
    this.config = { rows: Math.max(0, rows), cols: Math.max(0, cols) };
    this.updateFrozenPanes();
    this.emit('freeze:change', this.config);
  }

  /**
   * 冻结首行
   */
  freezeFirstRow(): void {
    this.freeze(1, this.config.cols);
  }

  /**
   * 冻结首列
   */
  freezeFirstColumn(): void {
    this.freeze(this.config.rows, 1);
  }

  /**
   * 冻结首行和首列
   */
  freezeFirstRowAndColumn(): void {
    this.freeze(1, 1);
  }

  /**
   * 取消冻结
   */
  unfreeze(): void {
    this.freeze(0, 0);
  }

  /**
   * 获取冻结配置
   */
  getConfig(): FreezePaneConfig {
    return { ...this.config };
  }

  /**
   * 是否有冻结
   */
  hasFrozen(): boolean {
    return this.config.rows > 0 || this.config.cols > 0;
  }

  /**
   * 获取冻结行高度
   */
  getFrozenRowsHeight(): number {
    return this.config.rows * this.options.getRowHeight() + this.options.getHeaderHeight();
  }

  /**
   * 获取冻结列宽度
   */
  getFrozenColsWidth(): number {
    let width = this.options.showRowNumber ? this.options.getRowNumberWidth() : 0;
    for (let i = 0; i < this.config.cols; i++) {
      width += this.options.getColumnWidth(i);
    }
    return width;
  }

  /**
   * 更新冻结面板
   */
  private updateFrozenPanes(): void {
    if (!this.frozenCorner || !this.frozenRows || !this.frozenCols) return;

    const { rows, cols } = this.config;

    if (rows === 0 && cols === 0) {
      this.frozenCorner.style.display = 'none';
      this.frozenRows.style.display = 'none';
      this.frozenCols.style.display = 'none';
      return;
    }

    const frozenRowsHeight = this.getFrozenRowsHeight();
    const frozenColsWidth = this.getFrozenColsWidth();

    // 更新冻结列
    if (cols > 0) {
      this.frozenCols.style.display = 'block';
      setStyles(this.frozenCols, {
        width: `${frozenColsWidth}px`,
        height: '100%',
      });
    } else {
      this.frozenCols.style.display = 'none';
    }

    // 更新冻结行
    if (rows > 0) {
      this.frozenRows.style.display = 'block';
      setStyles(this.frozenRows, {
        width: '100%',
        height: `${frozenRowsHeight}px`,
      });
    } else {
      this.frozenRows.style.display = 'none';
    }

    // 更新冻结角落
    if (rows > 0 && cols > 0) {
      this.frozenCorner.style.display = 'block';
      setStyles(this.frozenCorner, {
        width: `${frozenColsWidth}px`,
        height: `${frozenRowsHeight}px`,
      });
    } else {
      this.frozenCorner.style.display = 'none';
    }
  }

  /**
   * 处理滚动
   */
  private handleScroll(): void {
    if (!this.scrollContainer || !this.hasFrozen()) return;

    const { scrollLeft, scrollTop } = this.scrollContainer;

    // 更新冻结列的位置（水平方向跟随滚动）
    if (this.frozenCols && this.config.cols > 0) {
      this.frozenCols.style.transform = `translateX(${scrollLeft}px)`;
    }

    // 更新冻结行的位置（垂直方向跟随滚动）
    if (this.frozenRows && this.config.rows > 0) {
      this.frozenRows.style.transform = `translateY(${scrollTop}px)`;
    }

    // 更新冻结角落的位置（双向跟随滚动）
    if (this.frozenCorner && this.config.rows > 0 && this.config.cols > 0) {
      this.frozenCorner.style.transform = `translate(${scrollLeft}px, ${scrollTop}px)`;
    }
  }

  /**
   * 设置冻结区域内容（需要外部渲染器调用）
   */
  setFrozenContent(
    cornerContent: string,
    rowsContent: string,
    colsContent: string
  ): void {
    if (this.frozenCorner) {
      this.frozenCorner.innerHTML = cornerContent;
    }
    if (this.frozenRows) {
      this.frozenRows.innerHTML = rowsContent;
    }
    if (this.frozenCols) {
      this.frozenCols.innerHTML = colsContent;
    }
  }

  /**
   * 检查单元格是否在冻结区域
   */
  isCellFrozen(row: number, col: number): { frozenRow: boolean; frozenCol: boolean } {
    return {
      frozenRow: row < this.config.rows,
      frozenCol: col < this.config.cols,
    };
  }

  /**
   * 获取冻结区域的可见边界
   */
  getFrozenBounds(): {
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
  } {
    return {
      rowStart: 0,
      rowEnd: this.config.rows - 1,
      colStart: 0,
      colEnd: this.config.cols - 1,
    };
  }
}

