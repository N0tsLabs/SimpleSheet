/**
 * 行拖拽排序插件
 */

import { EventEmitter } from '../core/EventEmitter';
import { createElement, setStyles, addEvent } from '../utils/dom';
import type { RowData } from '../types';

interface RowReorderEvents {
  'reorder:start': { fromIndex: number };
  'reorder:move': { fromIndex: number; toIndex: number };
  'reorder:end': { fromIndex: number; toIndex: number };
}

interface RowReorderOptions {
  /** 获取数据 */
  getData: () => RowData[];
  /** 移动行 */
  moveRow: (fromIndex: number, toIndex: number) => void;
  /** 获取行高 */
  getRowHeight: () => number;
  /** 获取表头高度 */
  getHeaderHeight: () => number;
  /** 行号列宽度 */
  rowNumberWidth?: number;
  /** 获取滚动位置 */
  getScrollTop: () => number;
}

export class RowReorder extends EventEmitter<RowReorderEvents> {
  private container: HTMLElement | null = null;
  private options: Required<RowReorderOptions>;
  private isDragging = false;
  private dragIndex = -1;
  private dropIndex = -1;
  private startY = 0;
  private dragThreshold = 5;
  private hasMoved = false;
  private dragGhost: HTMLElement | null = null;
  private dropIndicator: HTMLElement | null = null;
  private originalRowCell: HTMLElement | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(options: RowReorderOptions) {
    super();
    this.options = {
      getData: options.getData,
      moveRow: options.moveRow,
      getRowHeight: options.getRowHeight,
      getHeaderHeight: options.getHeaderHeight,
      rowNumberWidth: options.rowNumberWidth ?? 50,
      getScrollTop: options.getScrollTop,
    };
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement): void {
    this.container = container;

    // 创建拖拽幽灵元素
    this.dragGhost = createElement('div', 'ss-row-drag-ghost');
    setStyles(this.dragGhost, {
      display: 'none',
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      opacity: '0.8',
      background: 'var(--ss-row-number-bg, #f9fafb)',
      border: '2px solid var(--ss-primary-color, #3b82f6)',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '500',
      minWidth: '40px',
      textAlign: 'center',
    });
    document.body.appendChild(this.dragGhost);

    // 创建放置指示器
    this.dropIndicator = createElement('div', 'ss-row-drop-indicator');
    setStyles(this.dropIndicator, {
      display: 'none',
      position: 'absolute',
      height: '3px',
      background: 'var(--ss-primary-color, #3b82f6)',
      zIndex: '100',
      pointerEvents: 'none',
      borderRadius: '2px',
      left: '0',
    });
    container.appendChild(this.dropIndicator);

    // 监听行号区域拖拽
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
    this.dragGhost?.remove();
    this.dropIndicator?.remove();
    this.dragGhost = null;
    this.dropIndicator = null;
    this.container = null;
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    
    // 只处理行号单元格（兼容两种类名）
    const rowNumberCell = target.closest('.ss-row-number, .ss-row-number-cell') as HTMLElement;
    if (!rowNumberCell) return;

    // 获取行索引（从父元素 .ss-row 获取）
    const row = rowNumberCell.closest('.ss-row');
    const rowIndex = row ? parseInt(row.getAttribute('data-row') || '-1', 10) : -1;
    if (rowIndex < 0) return;

    // 记录初始位置
    this.startY = e.clientY;
    this.hasMoved = false;
    this.dragIndex = rowIndex;
    this.originalRowCell = rowNumberCell;
    
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.container || this.dragIndex < 0) return;

    // 计算移动距离
    const deltaY = Math.abs(e.clientY - this.startY);

    // 如果还没开始拖拽，检查是否超过阈值
    if (!this.isDragging) {
      if (deltaY > this.dragThreshold) {
        this.isDragging = true;
        this.hasMoved = true;
        this.startDrag();
      } else {
        return;
      }
    }

    if (!this.isDragging) return;

    // 更新拖拽预览位置
    if (this.dragGhost) {
      setStyles(this.dragGhost, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        left: `${e.clientX + 10}px`,
        top: `${e.clientY - 15}px`,
      });
    }

    // 计算放置位置
    const containerRect = this.container.getBoundingClientRect();
    const scrollTop = this.options.getScrollTop();
    const headerHeight = this.options.getHeaderHeight();
    const rowHeight = this.options.getRowHeight();
    
    // 相对于容器的 Y 坐标（考虑表头和滚动）
    const relativeY = e.clientY - containerRect.top - headerHeight + scrollTop;
    
    // 计算目标行索引
    const data = this.options.getData();
    let newDropIndex = Math.floor(relativeY / rowHeight);
    newDropIndex = Math.max(0, Math.min(newDropIndex, data.length));
    
    this.dropIndex = newDropIndex;

    // 更新放置指示器位置
    if (this.dropIndicator) {
      const indicatorY = headerHeight + (newDropIndex * rowHeight) - scrollTop - 1;
      const containerWidth = containerRect.width;
      
      setStyles(this.dropIndicator, {
        display: 'block',
        top: `${Math.max(headerHeight, indicatorY)}px`,
        left: '0',
        width: `${containerWidth}px`,
      });
    }

    // 更新原始行号样式
    if (this.originalRowCell) {
      this.originalRowCell.style.opacity = '0.5';
    }

    this.emit('reorder:move', { 
      fromIndex: this.dragIndex, 
      toIndex: this.dropIndex 
    });
  }

  /**
   * 开始拖拽
   */
  private startDrag(): void {
    if (!this.container || this.dragIndex < 0) return;

    // 设置拖拽预览内容
    if (this.dragGhost) {
      this.dragGhost.textContent = `行 ${this.dragIndex + 1}`;
    }

    document.body.classList.add('ss-row-dragging');
    
    this.emit('reorder:start', { fromIndex: this.dragIndex });
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(): void {
    // 恢复原始行号样式
    if (this.originalRowCell) {
      this.originalRowCell.style.opacity = '';
    }

    // 如果还没开始拖拽（只是点击），直接返回
    if (!this.isDragging) {
      this.dragIndex = -1;
      this.originalRowCell = null;
      return;
    }

    // 隐藏元素
    if (this.dragGhost) {
      this.dragGhost.style.display = 'none';
    }
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none';
    }

    document.body.classList.remove('ss-row-dragging');

    // 执行行重排
    if (this.hasMoved && this.dragIndex !== this.dropIndex && this.dragIndex >= 0 && this.dropIndex >= 0) {
      // 调整目标位置
      let targetIndex = this.dropIndex;
      if (targetIndex > this.dragIndex) {
        targetIndex -= 1;
      }
      
      if (targetIndex !== this.dragIndex) {
        this.options.moveRow(this.dragIndex, targetIndex);

        this.emit('reorder:end', {
          fromIndex: this.dragIndex,
          toIndex: targetIndex,
        });
      }
    }

    // 重置状态
    this.isDragging = false;
    this.hasMoved = false;
    this.dragIndex = -1;
    this.dropIndex = -1;
    this.originalRowCell = null;
  }

  /**
   * 是否正在拖拽
   */
  isActive(): boolean {
    return this.isDragging;
  }
}

