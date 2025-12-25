/**
 * 数据模型
 * 管理表格数据的存储和操作
 */

import { EventEmitter } from './EventEmitter';
import type { Column, RowData, CellMeta, DataChangeEvent } from '../types';
import { deepClone } from '../utils/helpers';

interface DataModelEvents {
  'change': DataChangeEvent;
  'row:insert': { index: number; data: RowData };
  'row:delete': { index: number; data: RowData };
  'column:insert': { index: number; column: Column };
  'column:delete': { index: number; column: Column };
}

export class DataModel extends EventEmitter<DataModelEvents> {
  private data: RowData[] = [];
  private columns: Column[] = [];
  private cellMeta: Map<string, CellMeta> = new Map();
  /** 隐藏的行索引集合 */
  private hiddenRows: Set<number> = new Set();
  /** 隐藏的列索引集合 */
  private hiddenCols: Set<number> = new Set();

  constructor(columns: Column[] = [], data: RowData[] = []) {
    super();
    this.columns = columns;
    this.data = data;
  }

  /**
   * 获取单元格元数据 key
   */
  private getCellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  // ==================== 数据操作 ====================

  /**
   * 加载数据
   */
  loadData(data: RowData[]): void {
    this.data = deepClone(data);
    this.cellMeta.clear();
    this.emit('change', {
      type: 'batch',
      changes: [],
    });
  }

  /**
   * 获取所有数据
   */
  getData(): RowData[] {
    return deepClone(this.data);
  }

  /**
   * 设置所有数据
   */
  setData(data: RowData[]): void {
    this.data = deepClone(data);
    this.cellMeta.clear();
    this.emit('change', {
      type: 'batch',
      changes: [],
    });
  }

  /**
   * 获取数据行数
   */
  getRowCount(): number {
    return this.data.length;
  }

  /**
   * 获取列数
   */
  getColumnCount(): number {
    return this.columns.length;
  }

  /**
   * 清空数据
   */
  clearData(): void {
    const oldData = this.data;
    this.data = [];
    this.cellMeta.clear();
    this.emit('change', {
      type: 'batch',
      changes: oldData.flatMap((row, rowIndex) =>
        this.columns.map((col, colIndex) => ({
          row: rowIndex,
          col: colIndex,
          oldValue: row[col.key],
          newValue: undefined,
        }))
      ),
    });
  }

  // ==================== 单元格操作 ====================

  /**
   * 获取单元格值
   */
  getCellValue(row: number, col: number): any {
    const rowData = this.data[row];
    if (!rowData) return undefined;
    
    const column = this.columns[col];
    if (!column) return undefined;
    
    return rowData[column.key];
  }

  /**
   * 设置单元格值
   */
  setCellValue(row: number, col: number, value: any, silent = false): boolean {
    // 确保行存在
    while (this.data.length <= row) {
      this.data.push({});
    }
    
    const column = this.columns[col];
    if (!column) return false;
    
    const oldValue = this.data[row][column.key];
    if (oldValue === value) return false;
    
    this.data[row][column.key] = value;
    
    if (!silent) {
      this.emit('change', {
        type: 'set',
        changes: [{ row, col, oldValue, newValue: value }],
      });
    }
    
    return true;
  }

  /**
   * 批量设置单元格值
   */
  setRangeValues(
    startRow: number,
    startCol: number,
    values: any[][],
    silent = false
  ): void {
    const changes: DataChangeEvent['changes'] = [];
    
    for (let i = 0; i < values.length; i++) {
      const row = startRow + i;
      for (let j = 0; j < values[i].length; j++) {
        const col = startCol + j;
        const oldValue = this.getCellValue(row, col);
        const newValue = values[i][j];
        
        if (oldValue !== newValue) {
          this.setCellValue(row, col, newValue, true);
          changes.push({ row, col, oldValue, newValue });
        }
      }
    }
    
    if (!silent && changes.length > 0) {
      this.emit('change', {
        type: 'batch',
        changes,
      });
    }
  }

  /**
   * 获取范围内的值
   */
  getRangeValues(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): any[][] {
    const values: any[][] = [];
    
    for (let row = startRow; row <= endRow; row++) {
      const rowValues: any[] = [];
      for (let col = startCol; col <= endCol; col++) {
        rowValues.push(this.getCellValue(row, col));
      }
      values.push(rowValues);
    }
    
    return values;
  }

  // ==================== 行操作 ====================

  /**
   * 获取行数据
   */
  getRowData(index: number): RowData | undefined {
    return this.data[index] ? deepClone(this.data[index]) : undefined;
  }

  /**
   * 设置行数据
   */
  setRowData(index: number, data: RowData): void {
    if (index < 0 || index >= this.data.length) return;
    
    const changes: DataChangeEvent['changes'] = [];
    const oldRow = this.data[index];
    
    for (let col = 0; col < this.columns.length; col++) {
      const key = this.columns[col].key;
      const oldValue = oldRow[key];
      const newValue = data[key];
      
      if (oldValue !== newValue) {
        changes.push({ row: index, col, oldValue, newValue });
      }
    }
    
    this.data[index] = deepClone(data);
    
    if (changes.length > 0) {
      this.emit('change', {
        type: 'batch',
        changes,
      });
    }
  }

  /**
   * 插入行
   */
  insertRow(index: number, data: RowData = {}, count = 1): void {
    const newRows = Array(count).fill(null).map(() => deepClone(data));
    this.data.splice(index, 0, ...newRows);
    
    // 更新单元格元数据的行索引
    this.updateCellMetaAfterRowInsert(index, count);
    
    this.emit('row:insert', { index, data });
  }

  /**
   * 删除行
   */
  deleteRow(index: number, count = 1): RowData[] {
    const deleted = this.data.splice(index, count);
    
    // 更新单元格元数据
    this.updateCellMetaAfterRowDelete(index, count);
    
    deleted.forEach((data, i) => {
      this.emit('row:delete', { index: index + i, data });
    });
    
    return deleted;
  }

  // ==================== 列操作 ====================

  /**
   * 获取列定义
   */
  getColumns(): Column[] {
    return [...this.columns];
  }

  /**
   * 获取单个列定义
   */
  getColumn(index: number): Column | undefined {
    return this.columns[index];
  }

  /**
   * 设置列定义
   */
  setColumns(columns: Column[]): void {
    this.columns = columns;
  }

  /**
   * 更新列定义
   */
  updateColumn(index: number, updates: Partial<Column>): void {
    if (index < 0 || index >= this.columns.length) return;
    this.columns[index] = { ...this.columns[index], ...updates };
  }

  /**
   * 插入列
   */
  insertColumn(index: number, column: Column): void {
    this.columns.splice(index, 0, column);
    this.emit('column:insert', { index, column });
  }

  /**
   * 删除列
   */
  deleteColumn(index: number): Column | undefined {
    const deleted = this.columns.splice(index, 1)[0];
    if (deleted) {
      // 从数据中删除该列的数据
      for (const row of this.data) {
        delete row[deleted.key];
      }
      this.emit('column:delete', { index, column: deleted });
    }
    return deleted;
  }

  // ==================== 单元格元数据 ====================

  /**
   * 获取单元格元数据
   */
  getCellMeta(row: number, col: number): CellMeta | undefined {
    return this.cellMeta.get(this.getCellKey(row, col));
  }

  /**
   * 设置单元格元数据
   */
  setCellMeta(row: number, col: number, meta: Partial<CellMeta>): void {
    const key = this.getCellKey(row, col);
    const existing = this.cellMeta.get(key) || {};
    this.cellMeta.set(key, { ...existing, ...meta });
  }

  /**
   * 删除单元格元数据
   */
  deleteCellMeta(row: number, col: number): void {
    this.cellMeta.delete(this.getCellKey(row, col));
  }

  // ==================== 内部方法 ====================

  /**
   * 行插入后更新元数据索引
   */
  private updateCellMetaAfterRowInsert(index: number, count: number): void {
    const newMeta = new Map<string, CellMeta>();
    
    for (const [key, meta] of this.cellMeta) {
      const [row, col] = key.split(':').map(Number);
      if (row >= index) {
        newMeta.set(this.getCellKey(row + count, col), meta);
      } else {
        newMeta.set(key, meta);
      }
    }
    
    this.cellMeta = newMeta;
  }

  /**
   * 行删除后更新元数据索引
   */
  private updateCellMetaAfterRowDelete(index: number, count: number): void {
    const newMeta = new Map<string, CellMeta>();
    
    for (const [key, meta] of this.cellMeta) {
      const [row, col] = key.split(':').map(Number);
      if (row >= index + count) {
        newMeta.set(this.getCellKey(row - count, col), meta);
      } else if (row < index) {
        newMeta.set(key, meta);
      }
      // 被删除行的元数据直接丢弃
    }
    
    this.cellMeta = newMeta;
  }

  // ==================== 隐藏行列操作 ====================

  /**
   * 隐藏行
   */
  hideRow(index: number): void {
    if (index >= 0 && index < this.data.length) {
      this.hiddenRows.add(index);
    }
  }

  /**
   * 显示行
   */
  showRow(index: number): void {
    this.hiddenRows.delete(index);
  }

  /**
   * 隐藏列
   */
  hideColumn(index: number): void {
    if (index >= 0 && index < this.columns.length) {
      this.hiddenCols.add(index);
    }
  }

  /**
   * 显示列
   */
  showColumn(index: number): void {
    this.hiddenCols.delete(index);
  }

  /**
   * 检查行是否隐藏
   */
  isRowHidden(index: number): boolean {
    return this.hiddenRows.has(index);
  }

  /**
   * 检查列是否隐藏
   */
  isColumnHidden(index: number): boolean {
    return this.hiddenCols.has(index);
  }

  /**
   * 获取所有隐藏的行索引
   */
  getHiddenRows(): number[] {
    return Array.from(this.hiddenRows).sort((a, b) => a - b);
  }

  /**
   * 获取所有隐藏的列索引
   */
  getHiddenColumns(): number[] {
    return Array.from(this.hiddenCols).sort((a, b) => a - b);
  }

  /**
   * 显示所有隐藏的行
   */
  showAllRows(): void {
    this.hiddenRows.clear();
  }

  /**
   * 显示所有隐藏的列
   */
  showAllColumns(): void {
    this.hiddenCols.clear();
  }
}

