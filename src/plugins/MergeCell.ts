/**
 * 单元格合并插件
 */

import { EventEmitter } from '../core/EventEmitter';
import type { CellPosition, SelectionRange } from '../types';
import { normalizeRange } from '../utils/helpers';

/**
 * 合并单元格信息
 */
export interface MergeInfo {
  /** 起始行 */
  startRow: number;
  /** 起始列 */
  startCol: number;
  /** 行跨度 */
  rowspan: number;
  /** 列跨度 */
  colspan: number;
}

interface MergeCellEvents {
  'merge': MergeInfo;
  'unmerge': MergeInfo;
  'change': MergeInfo[];
}

export class MergeCell extends EventEmitter<MergeCellEvents> {
  /** 存储合并信息，key 为 "row:col" */
  private merges: Map<string, MergeInfo> = new Map();
  
  /** 被合并单元格到主单元格的映射 */
  private mergedCells: Map<string, string> = new Map();

  /**
   * 获取单元格 key
   */
  private getCellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  /**
   * 合并单元格
   */
  merge(range: SelectionRange): MergeInfo | null {
    const normalized = normalizeRange(range);
    const { start, end } = normalized;

    const rowspan = end.row - start.row + 1;
    const colspan = end.col - start.col + 1;

    // 至少要 2x1 或 1x2
    if (rowspan < 2 && colspan < 2) {
      return null;
    }

    // 检查是否与现有合并冲突
    for (let row = start.row; row <= end.row; row++) {
      for (let col = start.col; col <= end.col; col++) {
        if (this.isMerged(row, col)) {
          console.warn('无法合并：选区包含已合并的单元格');
          return null;
        }
      }
    }

    const key = this.getCellKey(start.row, start.col);
    const mergeInfo: MergeInfo = {
      startRow: start.row,
      startCol: start.col,
      rowspan,
      colspan,
    };

    // 存储合并信息
    this.merges.set(key, mergeInfo);

    // 标记被合并的单元格
    for (let row = start.row; row <= end.row; row++) {
      for (let col = start.col; col <= end.col; col++) {
        if (row !== start.row || col !== start.col) {
          this.mergedCells.set(this.getCellKey(row, col), key);
        }
      }
    }

    this.emit('merge', mergeInfo);
    this.emit('change', this.getAllMerges());
    
    return mergeInfo;
  }

  /**
   * 取消合并
   */
  unmerge(row: number, col: number): MergeInfo | null {
    // 如果是被合并的单元格，找到主单元格
    const cellKey = this.getCellKey(row, col);
    const masterKey = this.mergedCells.get(cellKey) || cellKey;

    const mergeInfo = this.merges.get(masterKey);
    if (!mergeInfo) {
      return null;
    }

    // 移除合并信息
    this.merges.delete(masterKey);

    // 移除被合并单元格的标记
    for (let r = mergeInfo.startRow; r < mergeInfo.startRow + mergeInfo.rowspan; r++) {
      for (let c = mergeInfo.startCol; c < mergeInfo.startCol + mergeInfo.colspan; c++) {
        this.mergedCells.delete(this.getCellKey(r, c));
      }
    }

    this.emit('unmerge', mergeInfo);
    this.emit('change', this.getAllMerges());
    
    return mergeInfo;
  }

  /**
   * 取消范围内的所有合并
   */
  unmergeRange(range: SelectionRange): MergeInfo[] {
    const normalized = normalizeRange(range);
    const unmerged: MergeInfo[] = [];

    for (let row = normalized.start.row; row <= normalized.end.row; row++) {
      for (let col = normalized.start.col; col <= normalized.end.col; col++) {
        const info = this.unmerge(row, col);
        if (info) {
          unmerged.push(info);
        }
      }
    }

    return unmerged;
  }

  /**
   * 检查单元格是否被合并（非主单元格）
   */
  isMerged(row: number, col: number): boolean {
    return this.mergedCells.has(this.getCellKey(row, col));
  }

  /**
   * 检查单元格是否是合并的主单元格
   */
  isMergeCell(row: number, col: number): boolean {
    return this.merges.has(this.getCellKey(row, col));
  }

  /**
   * 获取单元格的合并信息
   */
  getMergeInfo(row: number, col: number): MergeInfo | null {
    const cellKey = this.getCellKey(row, col);
    
    // 如果是主单元格
    let info = this.merges.get(cellKey);
    if (info) return info;

    // 如果是被合并的单元格，返回主单元格的合并信息
    const masterKey = this.mergedCells.get(cellKey);
    if (masterKey) {
      return this.merges.get(masterKey) || null;
    }

    return null;
  }

  /**
   * 获取主单元格位置
   */
  getMasterCell(row: number, col: number): CellPosition | null {
    const cellKey = this.getCellKey(row, col);
    
    // 如果自己是主单元格
    if (this.merges.has(cellKey)) {
      return { row, col };
    }

    // 如果是被合并的单元格
    const masterKey = this.mergedCells.get(cellKey);
    if (masterKey) {
      const [masterRow, masterCol] = masterKey.split(':').map(Number);
      return { row: masterRow, col: masterCol };
    }

    return null;
  }

  /**
   * 获取所有合并信息
   */
  getAllMerges(): MergeInfo[] {
    return Array.from(this.merges.values());
  }

  /**
   * 设置合并信息（用于加载）
   */
  setMerges(merges: MergeInfo[]): void {
    this.clear();

    for (const info of merges) {
      const key = this.getCellKey(info.startRow, info.startCol);
      this.merges.set(key, info);

      for (let row = info.startRow; row < info.startRow + info.rowspan; row++) {
        for (let col = info.startCol; col < info.startCol + info.colspan; col++) {
          if (row !== info.startRow || col !== info.startCol) {
            this.mergedCells.set(this.getCellKey(row, col), key);
          }
        }
      }
    }

    this.emit('change', this.getAllMerges());
  }

  /**
   * 清除所有合并
   */
  clear(): void {
    this.merges.clear();
    this.mergedCells.clear();
    this.emit('change', []);
  }

  /**
   * 行插入后更新合并信息
   */
  onRowInsert(index: number, count: number): void {
    const newMerges = new Map<string, MergeInfo>();
    const newMergedCells = new Map<string, string>();

    for (const [, info] of this.merges) {
      let { startRow, startCol, rowspan, colspan } = info;

      if (startRow >= index) {
        // 合并区域在插入位置之后，整体下移
        startRow += count;
      } else if (startRow + rowspan > index) {
        // 合并区域跨越插入位置，扩展行数
        rowspan += count;
      }

      const key = this.getCellKey(startRow, startCol);
      const newInfo = { startRow, startCol, rowspan, colspan };
      newMerges.set(key, newInfo);

      // 更新被合并单元格映射
      for (let r = startRow; r < startRow + rowspan; r++) {
        for (let c = startCol; c < startCol + colspan; c++) {
          if (r !== startRow || c !== startCol) {
            newMergedCells.set(this.getCellKey(r, c), key);
          }
        }
      }
    }

    this.merges = newMerges;
    this.mergedCells = newMergedCells;
    this.emit('change', this.getAllMerges());
  }

  /**
   * 行删除后更新合并信息
   */
  onRowDelete(index: number, count: number): void {
    const newMerges = new Map<string, MergeInfo>();
    const newMergedCells = new Map<string, string>();

    for (const [, info] of this.merges) {
      let { startRow, startCol, rowspan, colspan } = info;
      const endRow = startRow + rowspan - 1;

      // 合并区域完全在删除范围之后
      if (startRow >= index + count) {
        startRow -= count;
      }
      // 合并区域完全在删除范围之前
      else if (endRow < index) {
        // 保持不变
      }
      // 合并区域与删除范围有重叠
      else {
        const overlapStart = Math.max(startRow, index);
        const overlapEnd = Math.min(endRow, index + count - 1);
        const overlapCount = overlapEnd - overlapStart + 1;
        
        rowspan -= overlapCount;
        
        if (startRow >= index) {
          startRow = index;
        }
        
        // 如果合并区域被完全删除
        if (rowspan < 1) {
          continue;
        }
      }

      const key = this.getCellKey(startRow, startCol);
      const newInfo = { startRow, startCol, rowspan, colspan };
      newMerges.set(key, newInfo);

      for (let r = startRow; r < startRow + rowspan; r++) {
        for (let c = startCol; c < startCol + colspan; c++) {
          if (r !== startRow || c !== startCol) {
            newMergedCells.set(this.getCellKey(r, c), key);
          }
        }
      }
    }

    this.merges = newMerges;
    this.mergedCells = newMergedCells;
    this.emit('change', this.getAllMerges());
  }
}

