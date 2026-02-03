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
  /** 获取行高（可以传入函数以支持自适应行高） */
  getRowHeight: () => number | ((rowIndex: number) => number);
  /** 获取表头高度 */
  getHeaderHeight: () => number;
  /** 行号列宽度 */
  rowNumberWidth?: number;
  /** 获取滚动位置 */
  getScrollTop: () => number;
  /** 获取行的偏移量（用于自适应行高） */
  getRowOffset?: (rowIndex: number) => number;
}

export class RowReorder extends EventEmitter<RowReorderEvents> {
  private container: HTMLElement | null = null;
  private options: RowReorderOptions & { getRowOffset?: (rowIndex: number) => number };
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
      getRowOffset: options.getRowOffset, // 可选
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
    const rowHeightFn = this.options.getRowHeight();
    const getRowHeight = typeof rowHeightFn === 'function' ? rowHeightFn : () => rowHeightFn as number;
    
    // 关键修复：正确计算鼠标在表格内容区域的相对位置
    // e.clientY 是相对于视口的坐标
    // containerRect.top 是容器相对于视口的顶部位置
    // e.clientY - containerRect.top 是鼠标相对于容器顶部的坐标
    // 减去 headerHeight 得到鼠标在表格内容区域的坐标
    // 加上 scrollTop 得到鼠标在整个表格内容中的绝对位置（从顶部开始）
    const mouseYInContent = e.clientY - containerRect.top - headerHeight + scrollTop;
    
    // 计算目标行索引（使用实际行高）
    const data = this.options.getData();
    let newDropIndex = data.length; // 默认放在最后
    
    if (this.options.getRowOffset) {
      // 使用 getRowOffset 回调（支持动态行高）
      // getRowOffset(i) 返回第 i 行从表格内容顶部开始的累计偏移量
      for (let i = 0; i < data.length; i++) {
        const rowTop = this.options.getRowOffset(i);
        const rowHeight = getRowHeight(i);
        const rowBottom = rowTop + rowHeight;
        
        // 如果鼠标在行的上半部分，插入到该行之前
        if (mouseYInContent >= rowTop && mouseYInContent < rowTop + rowHeight / 2) {
          newDropIndex = i;
          break;
        }
        // 如果鼠标在行的下半部分，插入到该行之后
        if (mouseYInContent >= rowTop + rowHeight / 2 && mouseYInContent < rowBottom) {
          newDropIndex = i + 1;
          break;
        }
        // 如果鼠标在当前行之前，插入到该行之前
        if (mouseYInContent < rowTop) {
          newDropIndex = i;
          break;
        }
      }
    } else {
      // 回退到固定行高计算
      const rowHeight = getRowHeight(0);
      // 计算鼠标在哪一行，并判断是在上半部分还是下半部分
      const rowIndex = Math.floor(mouseYInContent / rowHeight);
      const positionInRow = mouseYInContent % rowHeight;
      newDropIndex = positionInRow < rowHeight / 2 ? rowIndex : rowIndex + 1;
    }
    
    newDropIndex = Math.max(0, Math.min(newDropIndex, data.length));
    
    // 如果拖拽的是同一行，不改变位置
    if (newDropIndex === this.dragIndex) {
      newDropIndex = this.dragIndex + 1;
    } else if (newDropIndex === this.dragIndex + 1) {
      // 如果插入位置就在原位置之后，保持不变
      // 但需要确保不超过数据长度
      newDropIndex = Math.min(newDropIndex, data.length);
    } else if (newDropIndex > this.dragIndex) {
      // 如果向下移动，目标位置需要减1（因为原行会被移除）
      newDropIndex -= 1;
    }
    
    this.dropIndex = newDropIndex;

    // 更新放置指示器位置（使用实际行高）
    // 指示器应该显示在插入位置（newDropIndex），而不是目标位置（this.dropIndex）
    // 但需要考虑：如果 newDropIndex 已经调整过（向下移动时减1），需要恢复原始插入位置
    if (this.dropIndicator) {
      let indicatorY: number;
      // 计算原始插入位置（用于显示指示器）
      let displayInsertionIndex = newDropIndex;
      if (newDropIndex > this.dragIndex && newDropIndex < data.length) {
        // 如果向下移动且已经减1，恢复原始插入位置
        displayInsertionIndex = newDropIndex + 1;
      } else if (newDropIndex === this.dragIndex && this.dragIndex < data.length - 1) {
        // 如果位置不变，显示在原位置之后
        displayInsertionIndex = this.dragIndex + 1;
      }
      
      if (this.options.getRowOffset) {
        // 如果插入到最后，指示器放在最后一行之后
        if (displayInsertionIndex >= data.length) {
          const lastRowIndex = data.length - 1;
          const lastRowTop = this.options.getRowOffset(lastRowIndex);
          const lastRowHeight = getRowHeight(lastRowIndex);
          indicatorY = headerHeight + lastRowTop + lastRowHeight - scrollTop;
        } else {
          // 插入到指定行之前，指示器放在该行的顶部
          const targetRowTop = this.options.getRowOffset(displayInsertionIndex);
          indicatorY = headerHeight + targetRowTop - scrollTop;
        }
      } else {
        // 固定行高模式
        const rowHeight = getRowHeight(0);
        if (displayInsertionIndex >= data.length) {
          indicatorY = headerHeight + (data.length * rowHeight) - scrollTop;
        } else {
          indicatorY = headerHeight + (displayInsertionIndex * rowHeight) - scrollTop;
        }
      }
      
      const containerWidth = containerRect.width;
      
      // 确保指示器在可视区域内
      const minY = headerHeight;
      const maxY = containerRect.height;
      const clampedY = Math.max(minY, Math.min(maxY, indicatorY));
      
      setStyles(this.dropIndicator, {
        display: 'block',
        top: `${clampedY}px`,
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
    // dropIndex 已经在 handleMouseMove 中计算好了最终目标位置
    if (this.hasMoved && this.dragIndex !== this.dropIndex && this.dragIndex >= 0 && this.dropIndex >= 0) {
      const targetIndex = this.dropIndex;
      
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

