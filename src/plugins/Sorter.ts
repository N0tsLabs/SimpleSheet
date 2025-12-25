/**
 * 排序插件
 */

import { EventEmitter } from '../core/EventEmitter';
import type { Column, RowData } from '../types';

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * 排序配置
 */
export interface SortConfig {
  /** 排序列索引 */
  columnIndex: number;
  /** 排序方向 */
  direction: SortDirection;
}

/**
 * 排序比较函数
 */
export type SortComparator = (a: any, b: any, direction: SortDirection) => number;

interface SorterEvents {
  'sort:change': { configs: SortConfig[]; data: RowData[] };
}

interface SorterOptions {
  /** 是否支持多列排序 */
  multiSort?: boolean;
  /** 自定义比较函数 */
  comparators?: Map<number | string, SortComparator>;
}

export class Sorter extends EventEmitter<SorterEvents> {
  private options: Required<SorterOptions>;
  private sortConfigs: SortConfig[] = [];
  private originalData: RowData[] = [];
  private sortedData: RowData[] = [];
  private columns: Column[] = [];

  constructor(options: SorterOptions = {}) {
    super();
    this.options = {
      multiSort: options.multiSort ?? false,
      comparators: options.comparators ?? new Map(),
    };
  }

  /**
   * 设置列定义
   */
  setColumns(columns: Column[]): void {
    this.columns = columns;
  }

  /**
   * 设置原始数据
   */
  setData(data: RowData[]): void {
    this.originalData = [...data];
    this.sortedData = [...data];
    
    // 如果有排序配置，重新排序
    if (this.sortConfigs.length > 0) {
      this.applySort();
    }
  }

  /**
   * 获取排序后的数据
   */
  getData(): RowData[] {
    return this.sortedData;
  }

  /**
   * 获取当前排序配置
   */
  getSortConfigs(): SortConfig[] {
    return [...this.sortConfigs];
  }

  /**
   * 获取指定列的排序方向
   */
  getColumnSortDirection(columnIndex: number): SortDirection {
    const config = this.sortConfigs.find(c => c.columnIndex === columnIndex);
    return config?.direction || null;
  }

  /**
   * 切换列排序
   */
  toggleSort(columnIndex: number, multiSort = false): void {
    const column = this.columns[columnIndex];
    if (!column || column.sortable === false) {
      return;
    }

    const existingIndex = this.sortConfigs.findIndex(c => c.columnIndex === columnIndex);
    const existing = existingIndex >= 0 ? this.sortConfigs[existingIndex] : null;

    let newDirection: SortDirection;
    if (!existing) {
      newDirection = 'asc';
    } else if (existing.direction === 'asc') {
      newDirection = 'desc';
    } else {
      newDirection = null;
    }

    if (multiSort && this.options.multiSort) {
      // 多列排序模式
      if (newDirection === null) {
        this.sortConfigs.splice(existingIndex, 1);
      } else if (existingIndex >= 0) {
        this.sortConfigs[existingIndex].direction = newDirection;
      } else {
        this.sortConfigs.push({ columnIndex, direction: newDirection });
      }
    } else {
      // 单列排序模式
      if (newDirection === null) {
        this.sortConfigs = [];
      } else {
        this.sortConfigs = [{ columnIndex, direction: newDirection }];
      }
    }

    this.applySort();
  }

  /**
   * 设置排序配置
   */
  setSort(configs: SortConfig[]): void {
    this.sortConfigs = configs.filter(c => c.direction !== null);
    this.applySort();
  }

  /**
   * 清除排序
   */
  clearSort(): void {
    this.sortConfigs = [];
    this.sortedData = [...this.originalData];
    this.emit('sort:change', { configs: [], data: this.sortedData });
  }

  /**
   * 清除排序（别名）
   */
  clear(): void {
    this.clearSort();
  }

  /**
   * 按列名排序
   * @param columnKey 列名（key）
   * @param direction 排序方向
   */
  sort(columnKey: string, direction: 'asc' | 'desc'): void {
    const columnIndex = this.columns.findIndex(col => col.key === columnKey);
    if (columnIndex < 0) {
      console.warn(`Column not found: ${columnKey}`);
      return;
    }

    const column = this.columns[columnIndex];
    if (column && column.sortable === false) {
      return;
    }

    // 单列排序模式
    this.sortConfigs = [{ columnIndex, direction }];
    this.applySort();
  }

  /**
   * 应用排序
   */
  private applySort(): void {
    if (this.sortConfigs.length === 0) {
      this.sortedData = [...this.originalData];
    } else {
      this.sortedData = [...this.originalData].sort((a, b) => {
        for (const config of this.sortConfigs) {
          const column = this.columns[config.columnIndex];
          if (!column) continue;

          const valueA = a[column.key];
          const valueB = b[column.key];

          // 使用自定义比较函数或默认比较
          const comparator = this.options.comparators.get(config.columnIndex) 
            || this.options.comparators.get(column.key)
            || this.getDefaultComparator(column.type);

          const result = comparator(valueA, valueB, config.direction);
          if (result !== 0) {
            return result;
          }
        }
        return 0;
      });
    }

    this.emit('sort:change', { configs: this.sortConfigs, data: this.sortedData });
  }

  /**
   * 获取默认比较函数
   */
  private getDefaultComparator(type?: string): SortComparator {
    return (a: any, b: any, direction: SortDirection) => {
      const modifier = direction === 'desc' ? -1 : 1;

      // 处理空值
      if (a === null || a === undefined) return 1 * modifier;
      if (b === null || b === undefined) return -1 * modifier;

      // 数字比较
      if (type === 'number' || (typeof a === 'number' && typeof b === 'number')) {
        return (Number(a) - Number(b)) * modifier;
      }

      // 日期比较
      if (type === 'date') {
        const dateA = new Date(a).getTime();
        const dateB = new Date(b).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return (dateA - dateB) * modifier;
        }
      }

      // 字符串比较
      const strA = String(a).toLowerCase();
      const strB = String(b).toLowerCase();
      return strA.localeCompare(strB, 'zh-CN') * modifier;
    };
  }

  /**
   * 注册自定义比较函数
   */
  registerComparator(column: number | string, comparator: SortComparator): void {
    this.options.comparators.set(column, comparator);
  }
}

