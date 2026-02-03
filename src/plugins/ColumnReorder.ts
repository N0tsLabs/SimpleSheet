/**
 * 列拖拽排序插件
 */

import { EventEmitter } from '../core/EventEmitter';
import { createElement, setStyles, addEvent } from '../utils/dom';
import type { Column } from '../types';

interface ColumnReorderEvents {
  'reorder:start': { fromIndex: number };
  'reorder:move': { fromIndex: number; toIndex: number };
  'reorder:end': { fromIndex: number; toIndex: number; columns: Column[] };
}

interface ColumnReorderOptions {
  /** 获取列定义 */
  getColumns: () => Column[];
  /** 设置列定义 */
  setColumns: (columns: Column[]) => void;
  /** 获取列宽 */
  getColumnWidth: (index: number) => number;
  /** 获取表头高度 */
  getHeaderHeight: () => number;
  /** 是否显示行号列 */
  showRowNumber?: boolean;
  /** 行号列宽度 */
  rowNumberWidth?: number;
}

export class ColumnReorder extends EventEmitter<ColumnReorderEvents> {
  private container: HTMLElement | null = null;
  private options: Required<ColumnReorderOptions>;
  private isDragging = false;
  private dragIndex = -1;
  private dropIndex = -1;
  private startX = 0;
  private startY = 0;
  private dragThreshold = 5; // 拖拽阈值，移动超过这个距离才开始拖拽
  private hasMoved = false; // 是否已经移动超过阈值
  private dragGhost: HTMLElement | null = null;
  private dropIndicator: HTMLElement | null = null;
  private originalHeaderCell: HTMLElement | null = null; // 原始表头单元格
  private cleanupFns: Array<() => void> = [];

  constructor(options: ColumnReorderOptions) {
    super();
    this.options = {
      getColumns: options.getColumns,
      setColumns: options.setColumns,
      getColumnWidth: options.getColumnWidth,
      getHeaderHeight: options.getHeaderHeight,
      showRowNumber: options.showRowNumber ?? true,
      rowNumberWidth: options.rowNumberWidth ?? 50,
    };
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement): void {
    this.container = container;

    // 创建拖拽幽灵元素
    this.dragGhost = createElement('div', 'ss-drag-ghost');
    setStyles(this.dragGhost, {
      display: 'none',
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      opacity: '0.8',
      background: 'var(--ss-header-bg, #f9fafb)',
      border: '1px solid var(--ss-primary-color, #3b82f6)',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '8px 12px',
      fontSize: '13px',
      fontWeight: '500',
    });
    document.body.appendChild(this.dragGhost);

    // 创建放置指示器 - 添加到表头容器中
    const header = container.querySelector('.ss-header') as HTMLElement;
    if (header) {
      this.dropIndicator = createElement('div', 'ss-drop-indicator');
      setStyles(this.dropIndicator, {
        display: 'none',
        position: 'absolute',
        width: '3px',
        background: 'var(--ss-primary-color, #3b82f6)',
        zIndex: '100',
        pointerEvents: 'none',
        borderRadius: '2px',
        top: '0',
      });
      header.style.position = 'relative'; // 确保定位上下文
      header.appendChild(this.dropIndicator);
    }

    // 监听表头拖拽
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
    const headerCell = target.closest('.ss-header-cell') as HTMLElement;
    
    if (!headerCell || headerCell.classList.contains('ss-row-number-header') || headerCell.classList.contains('ss-corner-cell')) {
      return;
    }

    const colIndex = parseInt(headerCell.dataset.col || '-1', 10);
    if (colIndex < 0) return;

    // 检查是否点击了 resizer
    if (target.classList.contains('ss-column-resizer')) {
      return;
    }

    // 记录初始位置
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.hasMoved = false;
    this.dragIndex = colIndex;
    this.originalHeaderCell = headerCell;
    
    // 准备拖拽（但不立即开始，等待移动超过阈值）
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.container || this.dragIndex < 0) return;

    // 计算移动距离
    const deltaX = Math.abs(e.clientX - this.startX);
    const deltaY = Math.abs(e.clientY - this.startY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果还没开始拖拽，检查是否超过阈值
    if (!this.isDragging) {
      if (distance > this.dragThreshold) {
        // 开始拖拽
        this.isDragging = true;
        this.hasMoved = true;
        this.startDrag();
      } else {
        return; // 还没超过阈值，不处理
      }
    }

    if (!this.isDragging) return;

    // 创建/更新拖拽预览（克隆原始表头元素）
    if (this.dragGhost && this.originalHeaderCell) {
      const rect = this.originalHeaderCell.getBoundingClientRect();
      setStyles(this.dragGhost, {
        display: 'block',
        left: `${e.clientX - rect.width / 2}px`,
        top: `${e.clientY - 10}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    }

    // 计算放置位置
    // 关键修复：直接使用表头单元格的实际DOM位置来判断，而不是累加列宽
    // 这样可以准确处理不同列宽的情况
    const header = this.container.querySelector('.ss-header') as HTMLElement;
    if (!header) return;
    
    const columns = this.options.getColumns();
    let newDropIndex = columns.length; // 默认放在最后
    
    // 获取所有表头单元格
    const headerCells = header.querySelectorAll('.ss-header-cell:not(.ss-row-number-header):not(.ss-corner-cell)') as NodeListOf<HTMLElement>;
    
    if (headerCells.length > 0) {
      // 方法1：使用实际DOM位置（最准确）
      for (let i = 0; i < headerCells.length; i++) {
        const cell = headerCells[i];
        const cellRect = cell.getBoundingClientRect();
        const cellCenter = cellRect.left + cellRect.width / 2;
        
        // 如果鼠标在单元格的左半部分，插入到该列之前
        if (e.clientX >= cellRect.left && e.clientX < cellCenter) {
          const colIndex = parseInt(cell.dataset.col || '-1', 10);
          if (colIndex >= 0) {
            newDropIndex = colIndex;
            break;
          }
        }
        // 如果鼠标在单元格的右半部分，插入到该列之后
        if (e.clientX >= cellCenter && e.clientX < cellRect.right) {
          const colIndex = parseInt(cell.dataset.col || '-1', 10);
          if (colIndex >= 0) {
            newDropIndex = colIndex + 1;
            break;
          }
        }
      }
      
      // 如果鼠标在所有单元格之前，插入到第一列之前
      if (headerCells.length > 0) {
        const firstCell = headerCells[0];
        const firstCellRect = firstCell.getBoundingClientRect();
        if (e.clientX < firstCellRect.left) {
          newDropIndex = 0;
        }
      }
      
      // 如果鼠标在所有单元格之后，插入到最后
      if (headerCells.length > 0) {
        const lastCell = headerCells[headerCells.length - 1];
        const lastCellRect = lastCell.getBoundingClientRect();
        if (e.clientX >= lastCellRect.right) {
          newDropIndex = columns.length;
        }
      }
    } else {
      // 回退方法：使用累加列宽（当无法获取DOM时）
      const headerRect = header.getBoundingClientRect();
      const relativeX = e.clientX - headerRect.left;
      
      // 考虑滚动位置
      const scrollContainer = this.container.querySelector('.ss-scroll-container') as HTMLElement;
      const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
      const adjustedX = relativeX + scrollLeft;
      
      // 计算列位置
      let x = this.options.showRowNumber ? this.options.rowNumberWidth : 0;
      
      for (let i = 0; i < columns.length; i++) {
        const colWidth = this.options.getColumnWidth(i);
        const colCenter = x + colWidth / 2;

        if (adjustedX < colCenter) {
          newDropIndex = i;
          break;
        }
        
        x += colWidth;
        newDropIndex = i + 1;
      }
    }

    // 限制范围
    newDropIndex = Math.max(0, Math.min(newDropIndex, columns.length));
    
    // 如果拖拽的是同一列，不更新
    if (newDropIndex === this.dragIndex || newDropIndex === this.dragIndex + 1) {
      newDropIndex = this.dragIndex;
    }
    
    this.dropIndex = newDropIndex;

    // 更新放置指示器位置
    // 关键修复：使用实际DOM位置来计算指示器位置，而不是累加列宽
    if (this.dropIndicator && this.container) {
      const header = this.container.querySelector('.ss-header') as HTMLElement;
      if (header) {
        let indicatorX = 0;
        
        // 方法1：使用实际DOM位置（最准确）
        const headerCells = header.querySelectorAll('.ss-header-cell:not(.ss-row-number-header):not(.ss-corner-cell)') as NodeListOf<HTMLElement>;
        
        if (newDropIndex === 0) {
          // 插入到第一列之前
          if (headerCells.length > 0) {
            const firstCell = headerCells[0];
            const firstCellRect = firstCell.getBoundingClientRect();
            const headerRect = header.getBoundingClientRect();
            indicatorX = firstCellRect.left - headerRect.left;
          } else {
            // 回退：使用累加
            indicatorX = this.options.showRowNumber ? this.options.rowNumberWidth : 0;
          }
        } else if (newDropIndex >= columns.length) {
          // 插入到最后
          if (headerCells.length > 0) {
            const lastCell = headerCells[headerCells.length - 1];
            const lastCellRect = lastCell.getBoundingClientRect();
            const headerRect = header.getBoundingClientRect();
            indicatorX = lastCellRect.right - headerRect.left;
          } else {
            // 回退：使用累加
            let x = this.options.showRowNumber ? this.options.rowNumberWidth : 0;
            for (let i = 0; i < columns.length; i++) {
              x += this.options.getColumnWidth(i);
            }
            indicatorX = x;
          }
        } else {
          // 插入到指定列之前
          // 找到目标列的单元格
          let targetCell: HTMLElement | null = null;
          for (let i = 0; i < headerCells.length; i++) {
            const cell = headerCells[i];
            const colIndex = parseInt(cell.dataset.col || '-1', 10);
            if (colIndex === newDropIndex) {
              targetCell = cell;
              break;
            }
          }
          
          if (targetCell) {
            const targetCellRect = targetCell.getBoundingClientRect();
            const headerRect = header.getBoundingClientRect();
            indicatorX = targetCellRect.left - headerRect.left;
          } else {
            // 回退：使用累加
            let x = this.options.showRowNumber ? this.options.rowNumberWidth : 0;
            for (let i = 0; i < newDropIndex; i++) {
              x += this.options.getColumnWidth(i);
            }
            indicatorX = x;
          }
        }

        setStyles(this.dropIndicator, {
          display: 'block',
          left: `${indicatorX}px`,
          top: '0',
          height: `${this.options.getHeaderHeight()}px`,
        });
      }
    }

    // 更新原始表头样式（半透明）
    if (this.originalHeaderCell) {
      this.originalHeaderCell.style.opacity = '0.5';
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
    if (!this.container || this.dragIndex < 0 || !this.originalHeaderCell) return;

    const columns = this.options.getColumns();
    const column = columns[this.dragIndex];
    if (!column) return;

    // 克隆原始表头元素作为拖拽预览
    if (this.dragGhost) {
      const rect = this.originalHeaderCell.getBoundingClientRect();
      this.dragGhost.innerHTML = this.originalHeaderCell.innerHTML;
      this.dragGhost.textContent = column.title || '';
      
      // 复制样式
      const computedStyle = window.getComputedStyle(this.originalHeaderCell);
      setStyles(this.dragGhost, {
        display: 'block',
        position: 'fixed',
        zIndex: '10000',
        pointerEvents: 'none',
        opacity: '0.8',
        background: computedStyle.backgroundColor || 'var(--ss-header-bg, #f9fafb)',
        border: computedStyle.border || '1px solid var(--ss-primary-color, #3b82f6)',
        borderRadius: computedStyle.borderRadius || '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        padding: computedStyle.padding || '8px 12px',
        fontSize: computedStyle.fontSize || '13px',
        fontWeight: computedStyle.fontWeight || '500',
        color: computedStyle.color || 'var(--ss-text-color)',
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        textAlign: computedStyle.textAlign || 'center',
        lineHeight: computedStyle.lineHeight || `${rect.height}px`,
      });
    }

    document.body.classList.add('ss-column-dragging');
    
    this.emit('reorder:start', { fromIndex: this.dragIndex });
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(): void {
    // 恢复原始表头样式
    if (this.originalHeaderCell) {
      this.originalHeaderCell.style.opacity = '';
    }

    // 如果还没开始拖拽（只是点击），直接返回
    if (!this.isDragging) {
      this.dragIndex = -1;
      this.originalHeaderCell = null;
      return;
    }

    // 隐藏元素
    if (this.dragGhost) {
      this.dragGhost.style.display = 'none';
    }
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none';
    }

    document.body.classList.remove('ss-column-dragging');

    // 执行列重排
    if (this.hasMoved && this.dragIndex !== this.dropIndex && this.dragIndex >= 0 && this.dropIndex >= 0) {
      const columns = [...this.options.getColumns()];
      const [removed] = columns.splice(this.dragIndex, 1);
      
      // 调整插入位置
      const insertIndex = this.dropIndex > this.dragIndex ? this.dropIndex - 1 : this.dropIndex;
      columns.splice(insertIndex, 0, removed);
      
      this.options.setColumns(columns);

      this.emit('reorder:end', {
        fromIndex: this.dragIndex,
        toIndex: this.dropIndex,
        columns,
      });
    }

    // 重置状态
    this.isDragging = false;
    this.hasMoved = false;
    this.dragIndex = -1;
    this.dropIndex = -1;
    this.originalHeaderCell = null;
  }

  /**
   * 是否正在拖拽
   */
  isActive(): boolean {
    return this.isDragging;
  }
}

