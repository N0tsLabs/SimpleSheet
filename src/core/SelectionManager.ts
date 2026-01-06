/**
 * 选区管理器
 * 处理单元格选择、范围选择、多选等逻辑
 */

import { EventEmitter } from './EventEmitter';
import type { CellPosition, SelectionRange, SelectionEvent } from '../types';
import { normalizeRange, isPositionInRange, getCellsInRange, clamp } from '../utils/helpers';

interface SelectionEvents {
  'change': SelectionEvent;
  'start': CellPosition;
  'end': SelectionEvent;
}

export class SelectionManager extends EventEmitter<SelectionEvents> {
  /** 当前活动单元格（编辑焦点） */
  private activeCell: CellPosition | null = null;
  
  /** 选区范围列表（支持多选） */
  private ranges: SelectionRange[] = [];
  
  /** 是否正在拖拽选择 */
  private isSelecting = false;
  
  /** 拖拽选择的起始位置 */
  private selectionStart: CellPosition | null = null;
  
  /** 最大行数 */
  private maxRow: number;
  
  /** 最大列数 */
  private maxCol: number;

  constructor(maxRow: number, maxCol: number) {
    super();
    this.maxRow = maxRow;
    this.maxCol = maxCol;
  }

  /**
   * 更新边界
   */
  updateBounds(maxRow: number, maxCol: number): void {
    this.maxRow = maxRow;
    this.maxCol = maxCol;
  }

  /**
   * 插入列后调整选区索引
   * 当在 index 位置插入新列时，所有 >= index 的列索引需要 +1
   */
  shiftColumnsAfter(index: number, delta: number): void {
    // 调整 activeCell
    if (this.activeCell && this.activeCell.col >= index) {
      this.activeCell.col += delta;
    }
    
    // 调整所有选区范围
    for (const range of this.ranges) {
      if (range.start.col >= index) {
        range.start.col += delta;
      }
      if (range.end.col >= index) {
        range.end.col += delta;
      }
    }
    
    // 调整拖拽起始位置
    if (this.selectionStart && this.selectionStart.col >= index) {
      this.selectionStart.col += delta;
    }
    
    this.emitChange();
  }

  /**
   * 删除列后调整选区索引
   * 当删除 index 位置的列时，所有 > index 的列索引需要 -1
   */
  shiftColumnsOnDelete(index: number): void {
    // 调整 activeCell
    if (this.activeCell) {
      if (this.activeCell.col === index) {
        // 如果活动单元格在被删除的列上，移动到前一列（如果存在）或后一列
        this.activeCell.col = Math.max(0, Math.min(this.activeCell.col, this.maxCol - 1));
      } else if (this.activeCell.col > index) {
        this.activeCell.col -= 1;
      }
    }
    
    // 调整所有选区范围
    for (const range of this.ranges) {
      if (range.start.col > index) {
        range.start.col -= 1;
      }
      if (range.end.col > index) {
        range.end.col -= 1;
      }
    }
    
    // 调整拖拽起始位置
    if (this.selectionStart && this.selectionStart.col > index) {
      this.selectionStart.col -= 1;
    }
    
    this.emitChange();
  }

  /**
   * 获取当前活动单元格
   */
  getActiveCell(): CellPosition | null {
    return this.activeCell ? { ...this.activeCell } : null;
  }

  /**
   * 获取所有选区范围
   */
  getRanges(): SelectionRange[] {
    return this.ranges.map(range => ({
      start: { ...range.start },
      end: { ...range.end },
    }));
  }

  /**
   * 获取主选区（第一个选区）
   */
  getPrimaryRange(): SelectionRange | null {
    return this.ranges[0] ? {
      start: { ...this.ranges[0].start },
      end: { ...this.ranges[0].end },
    } : null;
  }

  /**
   * 获取所有选中的单元格位置
   */
  getSelectedCells(): CellPosition[] {
    const cells: CellPosition[] = [];
    const seen = new Set<string>();
    
    for (const range of this.ranges) {
      for (const cell of getCellsInRange(range)) {
        const key = `${cell.row}:${cell.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          cells.push(cell);
        }
      }
    }
    
    return cells;
  }

  /**
   * 检查位置是否被选中
   */
  isSelected(row: number, col: number): boolean {
    return this.ranges.some(range => isPositionInRange({ row, col }, range));
  }

  /**
   * 检查位置是否是活动单元格
   */
  isActiveCell(row: number, col: number): boolean {
    return this.activeCell?.row === row && this.activeCell?.col === col;
  }

  /**
   * 选中单个单元格
   */
  selectCell(row: number, col: number, addToSelection = false): void {
    row = clamp(row, 0, this.maxRow - 1);
    col = clamp(col, 0, this.maxCol - 1);
    
    this.activeCell = { row, col };
    
    const range: SelectionRange = {
      start: { row, col },
      end: { row, col },
    };
    
    if (addToSelection) {
      this.ranges.push(range);
    } else {
      this.ranges = [range];
    }
    
    this.emitChange();
  }

  /**
   * 选中范围
   */
  selectRange(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    addToSelection = false
  ): void {
    startRow = clamp(startRow, 0, this.maxRow - 1);
    startCol = clamp(startCol, 0, this.maxCol - 1);
    endRow = clamp(endRow, 0, this.maxRow - 1);
    endCol = clamp(endCol, 0, this.maxCol - 1);
    
    const range: SelectionRange = {
      start: { row: startRow, col: startCol },
      end: { row: endRow, col: endCol },
    };
    
    if (!this.activeCell || !addToSelection) {
      // 设置活动单元格为范围起始位置
      this.activeCell = { row: startRow, col: startCol };
    }
    
    if (addToSelection) {
      this.ranges.push(range);
    } else {
      this.ranges = [range];
    }
    
    this.emitChange();
  }

  /**
   * 选中整行
   */
  selectRow(row: number, addToSelection = false): void {
    this.selectRange(row, 0, row, this.maxCol - 1, addToSelection);
  }

  /**
   * 选中整列
   */
  selectColumn(col: number, addToSelection = false): void {
    this.selectRange(0, col, this.maxRow - 1, col, addToSelection);
  }

  /**
   * 全选
   */
  selectAll(): void {
    this.selectRange(0, 0, this.maxRow - 1, this.maxCol - 1);
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    this.activeCell = null;
    this.ranges = [];
    this.emitChange();
  }

  /**
   * 开始拖拽选择
   */
  startDragSelection(row: number, col: number, addToSelection = false): void {
    this.isSelecting = true;
    this.selectionStart = { row, col };
    this.selectCell(row, col, addToSelection);
    this.emit('start', { row, col });
  }

  /**
   * 更新拖拽选择
   */
  updateDragSelection(row: number, col: number): void {
    if (!this.isSelecting || !this.selectionStart) return;
    
    row = clamp(row, 0, this.maxRow - 1);
    col = clamp(col, 0, this.maxCol - 1);
    
    // 更新最后一个选区
    if (this.ranges.length > 0) {
      this.ranges[this.ranges.length - 1] = {
        start: this.selectionStart,
        end: { row, col },
      };
    } else {
      this.ranges = [{
        start: this.selectionStart,
        end: { row, col },
      }];
    }
    
    this.emitChange();
  }

  /**
   * 结束拖拽选择
   */
  endDragSelection(): void {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    this.selectionStart = null;
    
    this.emit('end', {
      ranges: this.getRanges(),
      cells: this.getSelectedCells(),
    });
  }

  /**
   * 是否正在选择中
   */
  isDragging(): boolean {
    return this.isSelecting;
  }

  /**
   * 扩展选区（Shift+点击）
   */
  extendSelection(row: number, col: number): void {
    if (!this.activeCell) {
      this.selectCell(row, col);
      return;
    }
    
    this.selectRange(
      this.activeCell.row,
      this.activeCell.col,
      row,
      col
    );
  }

  /**
   * 移动活动单元格
   */
  moveActiveCell(
    deltaRow: number,
    deltaCol: number,
    extendSelection = false
  ): void {
    if (!this.activeCell) {
      this.selectCell(0, 0);
      return;
    }
    
    const newRow = clamp(this.activeCell.row + deltaRow, 0, this.maxRow - 1);
    const newCol = clamp(this.activeCell.col + deltaCol, 0, this.maxCol - 1);
    
    if (extendSelection) {
      // Shift+方向键扩展选区
      const range = this.getPrimaryRange();
      if (range) {
        const normalized = normalizeRange(range);
        this.selectRange(
          normalized.start.row,
          normalized.start.col,
          newRow,
          newCol
        );
      }
    } else {
      this.selectCell(newRow, newCol);
    }
  }

  /**
   * 移动到行首
   */
  moveToRowStart(extendSelection = false): void {
    if (!this.activeCell) return;
    
    if (extendSelection) {
      this.selectRange(this.activeCell.row, 0, this.activeCell.row, this.activeCell.col);
    } else {
      this.selectCell(this.activeCell.row, 0);
    }
  }

  /**
   * 移动到行尾
   */
  moveToRowEnd(extendSelection = false): void {
    if (!this.activeCell) return;
    
    if (extendSelection) {
      this.selectRange(this.activeCell.row, this.activeCell.col, this.activeCell.row, this.maxCol - 1);
    } else {
      this.selectCell(this.activeCell.row, this.maxCol - 1);
    }
  }

  /**
   * 移动到表格开头
   */
  moveToStart(extendSelection = false): void {
    if (extendSelection && this.activeCell) {
      this.selectRange(0, 0, this.activeCell.row, this.activeCell.col);
    } else {
      this.selectCell(0, 0);
    }
  }

  /**
   * 移动到表格结尾
   */
  moveToEnd(extendSelection = false): void {
    if (extendSelection && this.activeCell) {
      this.selectRange(this.activeCell.row, this.activeCell.col, this.maxRow - 1, this.maxCol - 1);
    } else {
      this.selectCell(this.maxRow - 1, this.maxCol - 1);
    }
  }

  /**
   * 获取选区边界信息（用于渲染选区边框）
   */
  getSelectionBoundary(): {
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null {
    if (this.ranges.length === 0) return null;
    
    let top = Infinity;
    let left = Infinity;
    let bottom = -Infinity;
    let right = -Infinity;
    
    for (const range of this.ranges) {
      const normalized = normalizeRange(range);
      top = Math.min(top, normalized.start.row);
      left = Math.min(left, normalized.start.col);
      bottom = Math.max(bottom, normalized.end.row);
      right = Math.max(right, normalized.end.col);
    }
    
    return { top, left, bottom, right };
  }

  /**
   * 发送变更事件
   */
  private emitChange(): void {
    this.emit('change', {
      ranges: this.getRanges(),
      cells: this.getSelectedCells(),
    });
  }
}

