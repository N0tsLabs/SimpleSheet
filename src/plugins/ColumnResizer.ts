/**
 * 列宽调整插件
 */

import { EventEmitter } from '../core/EventEmitter';
import { addEvent, setStyles } from '../utils/dom';

interface ColumnResizerEvents {
  'resize:start': { columnIndex: number; width: number };
  'resize:move': { columnIndex: number; width: number };
  'resize:end': { columnIndex: number; oldWidth: number; newWidth: number };
}

interface ColumnResizerOptions {
  /** 最小列宽 */
  minWidth?: number;
  /** 最大列宽 */
  maxWidth?: number;
  /** 获取列宽 */
  getColumnWidth: (index: number) => number;
  /** 设置列宽 */
  setColumnWidth: (index: number, width: number) => void;
  /** 是否启用 */
  enabled?: boolean;
}

export class ColumnResizer extends EventEmitter<ColumnResizerEvents> {
  private container: HTMLElement | null = null;
  private options: Required<ColumnResizerOptions>;
  private isResizing = false;
  private resizingColumnIndex = -1;
  private startX = 0;
  private startWidth = 0;
  private cleanupFns: Array<() => void> = [];
  private indicator: HTMLElement | null = null;

  constructor(options: ColumnResizerOptions) {
    super();
    this.options = {
      minWidth: options.minWidth ?? 80,
      maxWidth: options.maxWidth ?? 500,
      getColumnWidth: options.getColumnWidth,
      setColumnWidth: options.setColumnWidth,
      enabled: options.enabled ?? true,
    };
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement): void {
    this.container = container;
    
    // 创建调整指示线
    this.indicator = document.createElement('div');
    this.indicator.className = 'ss-resize-indicator';
    this.indicator.style.display = 'none';
    container.appendChild(this.indicator);

    // 监听表头上的 resizer 元素
    this.cleanupFns.push(
      addEvent(container, 'mousedown', this.handleMouseDown.bind(this) as EventListener)
    );

    // 全局鼠标事件
    this.cleanupFns.push(
      addEvent(document, 'mousemove', this.handleMouseMove.bind(this) as EventListener),
      addEvent(document, 'mouseup', this.handleMouseUp.bind(this) as EventListener)
    );
  }

  /**
   * 卸载
   */
  unmount(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.indicator?.remove();
    this.indicator = null;
    this.container = null;
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    
    if (!target.classList.contains('ss-column-resizer')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const columnIndex = parseInt(target.dataset.col || '-1', 10);
    if (columnIndex < 0) return;

    this.isResizing = true;
    this.resizingColumnIndex = columnIndex;
    this.startX = e.clientX;
    this.startWidth = this.options.getColumnWidth(columnIndex);

    // 添加调整中的样式
    document.body.classList.add('ss-column-resizing');
    target.classList.add('ss-resizing');

    // 显示指示线
    if (this.indicator && this.container) {
      const containerRect = this.container.getBoundingClientRect();
      setStyles(this.indicator, {
        display: 'block',
        left: `${e.clientX - containerRect.left}px`,
      });
    }

    this.emit('resize:start', {
      columnIndex,
      width: this.startWidth,
    });
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = e.clientX - this.startX;
    let newWidth = this.startWidth + deltaX;

    // 限制范围
    newWidth = Math.max(this.options.minWidth, newWidth);
    newWidth = Math.min(this.options.maxWidth, newWidth);

    // 更新列宽
    this.options.setColumnWidth(this.resizingColumnIndex, newWidth);

    // 更新指示线位置 - 使用限制后的宽度计算位置，而不是直接使用鼠标位置
    if (this.indicator && this.container) {
      const containerRect = this.container.getBoundingClientRect();
      // 计算限制后的指示线位置
      const limitedX = this.startX + (newWidth - this.startWidth);
      setStyles(this.indicator, {
        left: `${limitedX - containerRect.left}px`,
      });
    }

    this.emit('resize:move', {
      columnIndex: this.resizingColumnIndex,
      width: newWidth,
    });
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(): void {
    if (!this.isResizing) return;

    const newWidth = this.options.getColumnWidth(this.resizingColumnIndex);

    // 移除样式
    document.body.classList.remove('ss-column-resizing');
    const resizer = this.container?.querySelector('.ss-resizing');
    resizer?.classList.remove('ss-resizing');

    // 隐藏指示线
    if (this.indicator) {
      this.indicator.style.display = 'none';
    }

    this.emit('resize:end', {
      columnIndex: this.resizingColumnIndex,
      oldWidth: this.startWidth,
      newWidth,
    });

    this.isResizing = false;
    this.resizingColumnIndex = -1;
  }

  /**
   * 是否正在调整
   */
  isActive(): boolean {
    return this.isResizing;
  }
}

