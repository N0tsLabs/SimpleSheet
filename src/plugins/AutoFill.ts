/**
 * 自动填充插件
 * 支持拖拽填充柄来填充数据
 */

import { EventEmitter } from '../core/EventEmitter';
import type { CellPosition, SelectionRange } from '../types';
import { createElement, addEvent, setStyles } from '../utils/dom';
import { normalizeRange } from '../utils/helpers';

interface AutoFillEvents {
  'fill:start': { range: SelectionRange };
  'fill:move': { targetRange: SelectionRange };
  'fill:end': { sourceRange: SelectionRange; targetRange: SelectionRange; direction: FillDirection };
}

type FillDirection = 'down' | 'up' | 'right' | 'left';

interface AutoFillOptions {
  /** 获取单元格值 */
  getCellValue: (row: number, col: number) => any;
  /** 设置单元格值 */
  setCellValue: (row: number, col: number, value: any) => void;
  /** 获取单元格位置 */
  getCellRect: (row: number, col: number) => DOMRect | null;
  /** 根据坐标获取单元格 */
  getCellFromPoint: (x: number, y: number) => CellPosition | null;
  /** 获取当前选区 */
  getSelection: () => SelectionRange | null;
  /** 最大行数 */
  maxRow: number;
  /** 最大列数 */
  maxCol: number;
}

export class AutoFill extends EventEmitter<AutoFillEvents> {
  private container: HTMLElement | null = null;
  private options: AutoFillOptions;
  private handle: HTMLElement | null = null;
  private preview: HTMLElement | null = null;
  private isDragging = false;
  private sourceRange: SelectionRange | null = null;
  private targetEnd: CellPosition | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(options: AutoFillOptions) {
    super();
    this.options = options;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement, selectionLayer: HTMLElement): void {
    this.container = container;

    // 创建填充手柄
    this.handle = createElement('div', 'ss-fill-handle');
    this.handle.style.display = 'none';
    selectionLayer.appendChild(this.handle);

    // 创建预览层
    this.preview = createElement('div', 'ss-fill-preview');
    this.preview.style.display = 'none';
    selectionLayer.appendChild(this.preview);

    // 监听手柄拖拽
    this.cleanupFns.push(
      addEvent(this.handle, 'mousedown', this.handleMouseDown.bind(this) as EventListener)
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
    this.handle?.remove();
    this.preview?.remove();
    this.handle = null;
    this.preview = null;
    this.container = null;
  }

  /**
   * 更新手柄位置
   */
  updateHandlePosition(range: SelectionRange | null): void {
    if (!this.handle || !range) {
      if (this.handle) {
        this.handle.style.display = 'none';
      }
      return;
    }

    const normalized = normalizeRange(range);
    const cellRect = this.options.getCellRect(normalized.end.row, normalized.end.col);
    
    if (!cellRect || !this.container) {
      this.handle.style.display = 'none';
      return;
    }

    const containerRect = this.container.getBoundingClientRect();
    
    setStyles(this.handle, {
      display: 'block',
      left: `${cellRect.right - containerRect.left - 4}px`,
      top: `${cellRect.bottom - containerRect.top - 4}px`,
    });
  }

  /**
   * 隐藏手柄
   */
  hideHandle(): void {
    if (this.handle) {
      this.handle.style.display = 'none';
    }
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const selection = this.options.getSelection();
    if (!selection) return;

    this.isDragging = true;
    this.sourceRange = selection;
    this.targetEnd = null;

    document.body.classList.add('ss-filling');

    this.emit('fill:start', { range: selection });
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.sourceRange || !this.container) return;

    const containerRect = this.container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    const cell = this.options.getCellFromPoint(x, y);
    if (!cell) return;

    this.targetEnd = cell;

    // 计算填充方向和范围
    const normalized = normalizeRange(this.sourceRange);
    const targetRange = this.calculateTargetRange(normalized, cell);

    if (targetRange) {
      this.showPreview(targetRange);
      this.emit('fill:move', { targetRange });
    }
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(): void {
    if (!this.isDragging || !this.sourceRange || !this.targetEnd) {
      this.isDragging = false;
      this.hidePreview();
      document.body.classList.remove('ss-filling');
      return;
    }

    const normalized = normalizeRange(this.sourceRange);
    const targetRange = this.calculateTargetRange(normalized, this.targetEnd);

    if (targetRange) {
      const direction = this.getDirection(normalized, this.targetEnd);
      if (direction) {
        this.performFill(normalized, targetRange, direction);
        
        this.emit('fill:end', {
          sourceRange: normalized,
          targetRange,
          direction,
        });
      }
    }

    this.isDragging = false;
    this.sourceRange = null;
    this.targetEnd = null;
    this.hidePreview();
    document.body.classList.remove('ss-filling');
  }

  /**
   * 计算目标范围
   */
  private calculateTargetRange(source: SelectionRange, target: CellPosition): SelectionRange | null {
    const direction = this.getDirection(source, target);
    if (!direction) return null;

    switch (direction) {
      case 'down':
        return {
          start: { row: source.end.row + 1, col: source.start.col },
          end: { row: Math.min(target.row, this.options.maxRow - 1), col: source.end.col },
        };
      case 'up':
        return {
          start: { row: Math.max(target.row, 0), col: source.start.col },
          end: { row: source.start.row - 1, col: source.end.col },
        };
      case 'right':
        return {
          start: { row: source.start.row, col: source.end.col + 1 },
          end: { row: source.end.row, col: Math.min(target.col, this.options.maxCol - 1) },
        };
      case 'left':
        return {
          start: { row: source.start.row, col: Math.max(target.col, 0) },
          end: { row: source.end.row, col: source.start.col - 1 },
        };
    }
  }

  /**
   * 获取填充方向
   */
  private getDirection(source: SelectionRange, target: CellPosition): FillDirection | null {
    // 优先判断垂直方向
    if (target.row > source.end.row && target.col >= source.start.col && target.col <= source.end.col) {
      return 'down';
    }
    if (target.row < source.start.row && target.col >= source.start.col && target.col <= source.end.col) {
      return 'up';
    }
    // 水平方向
    if (target.col > source.end.col && target.row >= source.start.row && target.row <= source.end.row) {
      return 'right';
    }
    if (target.col < source.start.col && target.row >= source.start.row && target.row <= source.end.row) {
      return 'left';
    }
    return null;
  }

  /**
   * 执行填充
   */
  private performFill(source: SelectionRange, target: SelectionRange, direction: FillDirection): void {
    const sourceValues: any[][] = [];
    
    // 获取源数据
    for (let row = source.start.row; row <= source.end.row; row++) {
      const rowValues: any[] = [];
      for (let col = source.start.col; col <= source.end.col; col++) {
        rowValues.push(this.options.getCellValue(row, col));
      }
      sourceValues.push(rowValues);
    }

    const normalizedTarget = normalizeRange(target);
    
    // 根据方向填充
    if (direction === 'down' || direction === 'up') {
      const sourceRows = sourceValues.length;
      for (let row = normalizedTarget.start.row; row <= normalizedTarget.end.row; row++) {
        const sourceRowIndex = (row - normalizedTarget.start.row) % sourceRows;
        for (let col = normalizedTarget.start.col; col <= normalizedTarget.end.col; col++) {
          const sourceColIndex = col - normalizedTarget.start.col;
          const value = this.smartFill(
            sourceValues[sourceRowIndex][sourceColIndex],
            row - source.start.row,
            direction
          );
          this.options.setCellValue(row, col, value);
        }
      }
    } else {
      const sourceCols = sourceValues[0].length;
      for (let col = normalizedTarget.start.col; col <= normalizedTarget.end.col; col++) {
        const sourceColIndex = (col - normalizedTarget.start.col) % sourceCols;
        for (let row = normalizedTarget.start.row; row <= normalizedTarget.end.row; row++) {
          const sourceRowIndex = row - normalizedTarget.start.row;
          const value = this.smartFill(
            sourceValues[sourceRowIndex][sourceColIndex],
            col - source.start.col,
            direction
          );
          this.options.setCellValue(row, col, value);
        }
      }
    }
  }

  /**
   * 智能填充（识别序列）
   */
  private smartFill(value: any, offset: number, direction: FillDirection): any {
    // 数字递增/递减
    if (typeof value === 'number') {
      const delta = direction === 'down' || direction === 'right' ? 1 : -1;
      return value + (offset + 1) * delta;
    }
    
    // 其他类型直接复制
    return value;
  }

  /**
   * 显示预览
   */
  private showPreview(range: SelectionRange): void {
    if (!this.preview || !this.container) return;

    const normalized = normalizeRange(range);
    const startRect = this.options.getCellRect(normalized.start.row, normalized.start.col);
    const endRect = this.options.getCellRect(normalized.end.row, normalized.end.col);
    
    if (!startRect || !endRect) return;

    const containerRect = this.container.getBoundingClientRect();

    setStyles(this.preview, {
      display: 'block',
      left: `${startRect.left - containerRect.left}px`,
      top: `${startRect.top - containerRect.top}px`,
      width: `${endRect.right - startRect.left}px`,
      height: `${endRect.bottom - startRect.top}px`,
    });
  }

  /**
   * 隐藏预览
   */
  private hidePreview(): void {
    if (this.preview) {
      this.preview.style.display = 'none';
    }
  }
}

