/**
 * 通用辅助函数
 */

import type { CellPosition, SelectionRange } from '../types';

/**
 * 生成唯一 ID
 */
export function generateId(prefix = 'ss'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 浅比较两个对象
 */
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

/**
 * 列索引转换为字母（0 -> A, 1 -> B, 26 -> AA）
 */
export function columnIndexToLetter(index: number): string {
  let letter = '';
  let num = index;
  
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  
  return letter;
}

/**
 * 字母转换为列索引（A -> 0, B -> 1, AA -> 26）
 */
export function letterToColumnIndex(letter: string): number {
  let index = 0;
  
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  
  return index - 1;
}

/**
 * 获取单元格地址（A1 格式）
 */
export function getCellAddress(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`;
}

/**
 * 解析单元格地址
 */
export function parseCellAddress(address: string): CellPosition | null {
  const match = address.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  
  return {
    col: letterToColumnIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10) - 1,
  };
}

/**
 * 规范化选区范围（确保 start 在 end 之前）
 */
export function normalizeRange(range: SelectionRange): SelectionRange {
  const startRow = Math.min(range.start.row, range.end.row);
  const endRow = Math.max(range.start.row, range.end.row);
  const startCol = Math.min(range.start.col, range.end.col);
  const endCol = Math.max(range.start.col, range.end.col);
  
  return {
    start: { row: startRow, col: startCol },
    end: { row: endRow, col: endCol },
  };
}

/**
 * 检查位置是否在范围内
 */
export function isPositionInRange(pos: CellPosition, range: SelectionRange): boolean {
  const normalized = normalizeRange(range);
  return (
    pos.row >= normalized.start.row &&
    pos.row <= normalized.end.row &&
    pos.col >= normalized.start.col &&
    pos.col <= normalized.end.col
  );
}

/**
 * 获取范围内的所有单元格位置
 */
export function getCellsInRange(range: SelectionRange): CellPosition[] {
  const normalized = normalizeRange(range);
  const cells: CellPosition[] = [];
  
  for (let row = normalized.start.row; row <= normalized.end.row; row++) {
    for (let col = normalized.start.col; col <= normalized.end.col; col++) {
      cells.push({ row, col });
    }
  }
  
  return cells;
}

/**
 * 合并多个范围
 */
export function mergeRanges(ranges: SelectionRange[]): SelectionRange | null {
  if (ranges.length === 0) return null;
  
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  
  for (const range of ranges) {
    const normalized = normalizeRange(range);
    minRow = Math.min(minRow, normalized.start.row);
    maxRow = Math.max(maxRow, normalized.end.row);
    minCol = Math.min(minCol, normalized.start.col);
    maxCol = Math.max(maxCol, normalized.end.col);
  }
  
  return {
    start: { row: minRow, col: minCol },
    end: { row: maxRow, col: maxCol },
  };
}

/**
 * 限制数值在范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 解析 CSV 字符串
 */
export function parseCSV(csv: string, delimiter = '\t'): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);
  
  for (const line of lines) {
    if (line.trim()) {
      rows.push(line.split(delimiter));
    }
  }
  
  return rows;
}

/**
 * 生成 CSV 字符串
 */
export function toCSV(data: any[][], delimiter = '\t'): string {
  return data.map(row => row.map(cell => String(cell ?? '')).join(delimiter)).join('\n');
}

/**
 * 检查值是否为空
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * 格式化数字
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('zh-CN', options).format(value);
}

/**
 * 格式化日期
 */
export function formatDate(value: Date | string | number, format = 'YYYY-MM-DD'): string {
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return String(value);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

