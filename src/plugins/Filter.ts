/**
 * 筛选插件
 */

import { EventEmitter } from '../core/EventEmitter';
import type { Column, RowData } from '../types';

/**
 * 筛选条件类型
 */
export type FilterOperator = 
  | 'equals'        // 等于
  | 'notEquals'     // 不等于
  | 'contains'      // 包含
  | 'notContains'   // 不包含
  | 'startsWith'    // 开头是
  | 'endsWith'      // 结尾是
  | 'greaterThan'   // 大于
  | 'lessThan'      // 小于
  | 'greaterOrEqual'// 大于等于
  | 'lessOrEqual'   // 小于等于
  | 'between'       // 区间
  | 'isEmpty'       // 为空
  | 'notEmpty'      // 不为空
  | 'inList'        // 在列表中
  | 'custom';       // 自定义

/**
 * 筛选条件
 */
export interface FilterCondition {
  /** 列索引或 key */
  column: number | string;
  /** 操作符 */
  operator: FilterOperator;
  /** 筛选值 */
  value?: any;
  /** 第二个值（用于 between） */
  value2?: any;
  /** 自定义筛选函数 */
  filter?: (value: any, rowData: RowData, column: Column) => boolean;
}

/**
 * 列筛选值列表（用于下拉选择）
 */
export interface ColumnFilterValues {
  columnIndex: number;
  values: Array<{ value: any; label: string; count: number }>;
}

interface FilterEvents {
  'filter:change': { conditions: FilterCondition[]; data: RowData[] };
}

export class Filter extends EventEmitter<FilterEvents> {
  private conditions: FilterCondition[] = [];
  private originalData: RowData[] = [];
  private filteredData: RowData[] = [];
  private columns: Column[] = [];

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
    this.filteredData = [...data];
    
    // 如果有筛选条件，重新筛选
    if (this.conditions.length > 0) {
      this.applyFilter();
    }
  }

  /**
   * 获取筛选后的数据
   */
  getData(): RowData[] {
    return this.filteredData;
  }

  /**
   * 获取原始数据
   */
  getOriginalData(): RowData[] {
    return this.originalData;
  }

  /**
   * 获取当前筛选条件
   */
  getConditions(): FilterCondition[] {
    return [...this.conditions];
  }

  /**
   * 添加筛选条件
   */
  addCondition(condition: FilterCondition): void {
    // 移除同一列的旧条件
    this.conditions = this.conditions.filter(c => c.column !== condition.column);
    this.conditions.push(condition);
    this.applyFilter();
  }

  /**
   * 移除筛选条件
   */
  removeCondition(column: number | string): void {
    this.conditions = this.conditions.filter(c => c.column !== column);
    this.applyFilter();
  }

  /**
   * 设置所有筛选条件
   */
  setConditions(conditions: FilterCondition[]): void {
    this.conditions = conditions;
    this.applyFilter();
  }

  /**
   * 清除所有筛选
   */
  clearFilter(): void {
    this.conditions = [];
    this.filteredData = [...this.originalData];
    this.emit('filter:change', { conditions: [], data: this.filteredData });
  }

  /**
   * 清除所有筛选（别名）
   */
  clearAll(): void {
    this.clearFilter();
  }

  /**
   * 应用筛选（公开方法）
   */
  apply(): void {
    this.applyFilter();
  }

  /**
   * 检查列是否有筛选
   */
  hasFilter(column: number | string): boolean {
    return this.conditions.some(c => c.column === column);
  }

  /**
   * 获取有筛选的列索引列表（用于显示筛选状态指示器）
   */
  getFilteredColumns(): number[] {
    return this.conditions.map(c => {
      if (typeof c.column === 'number') {
        return c.column;
      }
      // 如果是 key，找到对应的索引
      return this.columns.findIndex(col => col.key === c.column);
    }).filter(index => index >= 0);
  }

  /**
   * 检查是否有任何筛选条件
   */
  hasAnyFilter(): boolean {
    return this.conditions.length > 0;
  }

  /**
   * 获取列的唯一值列表（用于筛选下拉）
   */
  getColumnFilterValues(columnIndex: number): ColumnFilterValues {
    const column = this.columns[columnIndex];
    if (!column) {
      return { columnIndex, values: [] };
    }

    const valueMap = new Map<any, number>();
    
    for (const row of this.originalData) {
      const value = row[column.key];
      const key = value === null || value === undefined ? '__empty__' : value;
      valueMap.set(key, (valueMap.get(key) || 0) + 1);
    }

    const values = Array.from(valueMap.entries())
      .map(([value, count]) => ({
        value: value === '__empty__' ? null : value,
        label: value === '__empty__' ? '(空)' : String(value),
        count,
      }))
      .sort((a, b) => {
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return String(a.value).localeCompare(String(b.value), 'zh-CN');
      });

    return { columnIndex, values };
  }

  /**
   * 应用筛选
   */
  private applyFilter(): void {
    if (this.conditions.length === 0) {
      this.filteredData = [...this.originalData];
    } else {
      this.filteredData = this.originalData.filter(row => {
        return this.conditions.every(condition => {
          return this.matchCondition(row, condition);
        });
      });
    }

    this.emit('filter:change', { conditions: this.conditions, data: this.filteredData });
  }

  /**
   * 检查行是否匹配条件
   */
  private matchCondition(row: RowData, condition: FilterCondition): boolean {
    // 获取列定义
    let column: Column | undefined;
    if (typeof condition.column === 'number') {
      column = this.columns[condition.column];
    } else {
      column = this.columns.find(c => c.key === condition.column);
    }

    if (!column) return true;

    const value = row[column.key];
    const filterValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return this.equals(value, filterValue);

      case 'notEquals':
        return !this.equals(value, filterValue);

      case 'contains':
        return String(value || '').toLowerCase().includes(String(filterValue || '').toLowerCase());

      case 'notContains':
        return !String(value || '').toLowerCase().includes(String(filterValue || '').toLowerCase());

      case 'startsWith':
        return String(value || '').toLowerCase().startsWith(String(filterValue || '').toLowerCase());

      case 'endsWith':
        return String(value || '').toLowerCase().endsWith(String(filterValue || '').toLowerCase());

      case 'greaterThan':
        return Number(value) > Number(filterValue);

      case 'lessThan':
        return Number(value) < Number(filterValue);

      case 'greaterOrEqual':
        return Number(value) >= Number(filterValue);

      case 'lessOrEqual':
        return Number(value) <= Number(filterValue);

      case 'between':
        const num = Number(value);
        return num >= Number(filterValue) && num <= Number(condition.value2);

      case 'isEmpty':
        return value === null || value === undefined || value === '';

      case 'notEmpty':
        return value !== null && value !== undefined && value !== '';

      case 'inList':
        if (Array.isArray(filterValue)) {
          return filterValue.some(v => this.equals(value, v));
        }
        return false;

      case 'custom':
        if (condition.filter) {
          return condition.filter(value, row, column);
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * 值比较
   */
  private equals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || a === undefined) return b === null || b === undefined;
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
}

/**
 * 创建筛选条件的工厂函数
 */
export const FilterConditions = {
  equals: (column: number | string, value: any): FilterCondition => ({
    column,
    operator: 'equals',
    value,
  }),

  notEquals: (column: number | string, value: any): FilterCondition => ({
    column,
    operator: 'notEquals',
    value,
  }),

  contains: (column: number | string, value: string): FilterCondition => ({
    column,
    operator: 'contains',
    value,
  }),

  startsWith: (column: number | string, value: string): FilterCondition => ({
    column,
    operator: 'startsWith',
    value,
  }),

  endsWith: (column: number | string, value: string): FilterCondition => ({
    column,
    operator: 'endsWith',
    value,
  }),

  greaterThan: (column: number | string, value: number): FilterCondition => ({
    column,
    operator: 'greaterThan',
    value,
  }),

  lessThan: (column: number | string, value: number): FilterCondition => ({
    column,
    operator: 'lessThan',
    value,
  }),

  between: (column: number | string, min: number, max: number): FilterCondition => ({
    column,
    operator: 'between',
    value: min,
    value2: max,
  }),

  isEmpty: (column: number | string): FilterCondition => ({
    column,
    operator: 'isEmpty',
  }),

  notEmpty: (column: number | string): FilterCondition => ({
    column,
    operator: 'notEmpty',
  }),

  inList: (column: number | string, values: any[]): FilterCondition => ({
    column,
    operator: 'inList',
    value: values,
  }),

  custom: (
    column: number | string,
    filter: (value: any, rowData: RowData, column: Column) => boolean
  ): FilterCondition => ({
    column,
    operator: 'custom',
    filter,
  }),
};

