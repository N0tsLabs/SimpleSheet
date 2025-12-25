/**
 * 条件格式插件
 */

import { EventEmitter } from '../core/EventEmitter';
import type { Column, RowData, CellMeta } from '../types';

/**
 * 条件格式规则类型
 */
export type ConditionalFormatType =
  | 'cellValue'       // 单元格值比较
  | 'text'            // 文本条件
  | 'top'             // 前 N 项
  | 'bottom'          // 后 N 项
  | 'aboveAverage'    // 高于平均值
  | 'belowAverage'    // 低于平均值
  | 'duplicate'       // 重复值
  | 'unique'          // 唯一值
  | 'dataBar'         // 数据条
  | 'colorScale'      // 色阶
  | 'iconSet'         // 图标集
  | 'custom';         // 自定义

/**
 * 比较操作符
 */
export type CompareOperator =
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'equal'
  | 'notEqual'
  | 'between'
  | 'notBetween';

/**
 * 样式配置
 */
export interface FormatStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  border?: string;
}

/**
 * 条件格式规则
 */
export interface ConditionalFormatRule {
  /** 规则 ID */
  id: string;
  /** 规则类型 */
  type: ConditionalFormatType;
  /** 应用的列（索引或 key） */
  columns: Array<number | string>;
  /** 优先级（数字越小优先级越高） */
  priority?: number;
  /** 是否停止匹配后续规则 */
  stopIfTrue?: boolean;

  // 单元格值条件
  operator?: CompareOperator;
  value?: any;
  value2?: any; // 用于 between

  // 文本条件
  textOperator?: 'contains' | 'notContains' | 'startsWith' | 'endsWith';
  textValue?: string;

  // Top/Bottom
  rank?: number;
  percent?: boolean; // 是否按百分比

  // 样式
  style?: FormatStyle;

  // 数据条
  dataBar?: {
    minColor?: string;
    maxColor?: string;
    showValue?: boolean;
  };

  // 色阶
  colorScale?: {
    minColor: string;
    midColor?: string;
    maxColor: string;
  };

  // 自定义
  condition?: (value: any, rowData: RowData, column: Column) => boolean;
}

interface ConditionalFormatEvents {
  'rules:change': ConditionalFormatRule[];
}

export class ConditionalFormat extends EventEmitter<ConditionalFormatEvents> {
  private rules: ConditionalFormatRule[] = [];
  private data: RowData[] = [];
  private columns: Column[] = [];

  /**
   * 设置数据源
   */
  setData(data: RowData[], columns: Column[]): void {
    this.data = data;
    this.columns = columns;
  }

  /**
   * 添加规则
   */
  addRule(rule: ConditionalFormatRule): void {
    this.rules.push(rule);
    this.sortRules();
    this.emit('rules:change', this.rules);
  }

  /**
   * 移除规则
   */
  removeRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index >= 0) {
      this.rules.splice(index, 1);
      this.emit('rules:change', this.rules);
      return true;
    }
    return false;
  }

  /**
   * 更新规则
   */
  updateRule(id: string, updates: Partial<ConditionalFormatRule>): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      this.sortRules();
      this.emit('rules:change', this.rules);
      return true;
    }
    return false;
  }

  /**
   * 获取所有规则
   */
  getRules(): ConditionalFormatRule[] {
    return [...this.rules];
  }

  /**
   * 设置规则
   */
  setRules(rules: ConditionalFormatRule[]): void {
    this.rules = rules;
    this.sortRules();
    this.emit('rules:change', this.rules);
  }

  /**
   * 清除所有规则
   */
  clearRules(): void {
    this.rules = [];
    this.emit('rules:change', this.rules);
  }

  /**
   * 获取单元格的条件格式样式
   */
  getCellStyle(row: number, col: number): FormatStyle | null {
    const column = this.columns[col];
    if (!column) return null;

    const rowData = this.data[row];
    if (!rowData) return null;

    const value = rowData[column.key];

    for (const rule of this.rules) {
      // 检查规则是否应用于该列
      if (!this.isRuleApplicable(rule, col, column.key)) {
        continue;
      }

      // 评估规则
      if (this.evaluateRule(rule, value, rowData, column, row, col)) {
        const style = this.computeStyle(rule, value, row, col);
        if (style) {
          if (rule.stopIfTrue) {
            return style;
          }
          return style; // 返回第一个匹配的样式
        }
      }
    }

    return null;
  }

  /**
   * 检查规则是否适用于该列
   */
  private isRuleApplicable(rule: ConditionalFormatRule, colIndex: number, colKey: string): boolean {
    return rule.columns.some(c => c === colIndex || c === colKey);
  }

  /**
   * 评估规则
   */
  private evaluateRule(
    rule: ConditionalFormatRule,
    value: any,
    rowData: RowData,
    column: Column,
    row: number,
    col: number
  ): boolean {
    switch (rule.type) {
      case 'cellValue':
        return this.evaluateCellValue(rule, value);

      case 'text':
        return this.evaluateText(rule, value);

      case 'top':
        return this.evaluateTopBottom(rule, value, col, true);

      case 'bottom':
        return this.evaluateTopBottom(rule, value, col, false);

      case 'aboveAverage':
        return this.evaluateAverage(rule, value, col, true);

      case 'belowAverage':
        return this.evaluateAverage(rule, value, col, false);

      case 'duplicate':
        return this.evaluateDuplicate(value, col);

      case 'unique':
        return !this.evaluateDuplicate(value, col);

      case 'dataBar':
      case 'colorScale':
        return true; // 数据条和色阶总是显示

      case 'custom':
        return rule.condition ? rule.condition(value, rowData, column) : false;

      default:
        return false;
    }
  }

  /**
   * 评估单元格值条件
   */
  private evaluateCellValue(rule: ConditionalFormatRule, value: any): boolean {
    const num = Number(value);
    const ruleNum = Number(rule.value);
    const ruleNum2 = Number(rule.value2);

    switch (rule.operator) {
      case 'greaterThan':
        return num > ruleNum;
      case 'lessThan':
        return num < ruleNum;
      case 'greaterOrEqual':
        return num >= ruleNum;
      case 'lessOrEqual':
        return num <= ruleNum;
      case 'equal':
        return value === rule.value || num === ruleNum;
      case 'notEqual':
        return value !== rule.value && num !== ruleNum;
      case 'between':
        return num >= ruleNum && num <= ruleNum2;
      case 'notBetween':
        return num < ruleNum || num > ruleNum2;
      default:
        return false;
    }
  }

  /**
   * 评估文本条件
   */
  private evaluateText(rule: ConditionalFormatRule, value: any): boolean {
    const str = String(value || '').toLowerCase();
    const textValue = String(rule.textValue || '').toLowerCase();

    switch (rule.textOperator) {
      case 'contains':
        return str.includes(textValue);
      case 'notContains':
        return !str.includes(textValue);
      case 'startsWith':
        return str.startsWith(textValue);
      case 'endsWith':
        return str.endsWith(textValue);
      default:
        return false;
    }
  }

  /**
   * 评估 Top/Bottom
   */
  private evaluateTopBottom(
    rule: ConditionalFormatRule,
    value: any,
    col: number,
    isTop: boolean
  ): boolean {
    const values = this.getColumnValues(col);
    const sorted = [...values].sort((a, b) => isTop ? b - a : a - b);
    
    let rank = rule.rank || 10;
    if (rule.percent) {
      rank = Math.ceil(values.length * rank / 100);
    }

    const threshold = sorted[Math.min(rank - 1, sorted.length - 1)];
    return isTop ? Number(value) >= threshold : Number(value) <= threshold;
  }

  /**
   * 评估平均值条件
   */
  private evaluateAverage(
    rule: ConditionalFormatRule,
    value: any,
    col: number,
    above: boolean
  ): boolean {
    const values = this.getColumnValues(col);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return above ? Number(value) > avg : Number(value) < avg;
  }

  /**
   * 评估重复值
   */
  private evaluateDuplicate(value: any, col: number): boolean {
    const column = this.columns[col];
    if (!column) return false;

    let count = 0;
    for (const row of this.data) {
      if (row[column.key] === value) {
        count++;
        if (count > 1) return true;
      }
    }
    return false;
  }

  /**
   * 获取列的所有数值
   */
  private getColumnValues(col: number): number[] {
    const column = this.columns[col];
    if (!column) return [];

    return this.data
      .map(row => Number(row[column.key]))
      .filter(n => !isNaN(n));
  }

  /**
   * 计算样式
   */
  private computeStyle(
    rule: ConditionalFormatRule,
    value: any,
    row: number,
    col: number
  ): FormatStyle | null {
    if (rule.type === 'dataBar') {
      return this.computeDataBarStyle(rule, value, col);
    }

    if (rule.type === 'colorScale') {
      return this.computeColorScaleStyle(rule, value, col);
    }

    return rule.style || null;
  }

  /**
   * 计算数据条样式
   */
  private computeDataBarStyle(
    rule: ConditionalFormatRule,
    value: any,
    col: number
  ): FormatStyle {
    const values = this.getColumnValues(col);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const num = Number(value);
    
    const percent = max > min ? ((num - min) / (max - min)) * 100 : 0;
    const color = rule.dataBar?.maxColor || '#3b82f6';

    // 使用 CSS 渐变作为背景
    return {
      backgroundColor: `linear-gradient(90deg, ${color} ${percent}%, transparent ${percent}%)`,
    };
  }

  /**
   * 计算色阶样式
   */
  private computeColorScaleStyle(
    rule: ConditionalFormatRule,
    value: any,
    col: number
  ): FormatStyle {
    const values = this.getColumnValues(col);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const num = Number(value);

    const percent = max > min ? (num - min) / (max - min) : 0;
    const { minColor, midColor, maxColor } = rule.colorScale!;

    let backgroundColor: string;
    if (midColor) {
      // 三色色阶
      if (percent <= 0.5) {
        backgroundColor = this.interpolateColor(minColor, midColor, percent * 2);
      } else {
        backgroundColor = this.interpolateColor(midColor, maxColor, (percent - 0.5) * 2);
      }
    } else {
      // 双色色阶
      backgroundColor = this.interpolateColor(minColor, maxColor, percent);
    }

    return { backgroundColor };
  }

  /**
   * 颜色插值
   */
  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 解析颜色
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // 简单的十六进制颜色解析
    const hex = color.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  /**
   * 按优先级排序规则
   */
  private sortRules(): void {
    this.rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
}

/**
 * 创建条件格式规则的工厂函数
 */
export const ConditionalFormatRules = {
  /**
   * 单元格值大于
   */
  greaterThan: (columns: Array<number | string>, value: number, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'cellValue',
    columns,
    operator: 'greaterThan',
    value,
    style,
  }),

  /**
   * 单元格值小于
   */
  lessThan: (columns: Array<number | string>, value: number, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'cellValue',
    columns,
    operator: 'lessThan',
    value,
    style,
  }),

  /**
   * 单元格值在区间
   */
  between: (columns: Array<number | string>, min: number, max: number, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'cellValue',
    columns,
    operator: 'between',
    value: min,
    value2: max,
    style,
  }),

  /**
   * 文本包含
   */
  textContains: (columns: Array<number | string>, text: string, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'text',
    columns,
    textOperator: 'contains',
    textValue: text,
    style,
  }),

  /**
   * 前 N 项
   */
  topN: (columns: Array<number | string>, n: number, style: FormatStyle, percent = false): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'top',
    columns,
    rank: n,
    percent,
    style,
  }),

  /**
   * 后 N 项
   */
  bottomN: (columns: Array<number | string>, n: number, style: FormatStyle, percent = false): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'bottom',
    columns,
    rank: n,
    percent,
    style,
  }),

  /**
   * 高于平均值
   */
  aboveAverage: (columns: Array<number | string>, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'aboveAverage',
    columns,
    style,
  }),

  /**
   * 低于平均值
   */
  belowAverage: (columns: Array<number | string>, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'belowAverage',
    columns,
    style,
  }),

  /**
   * 重复值
   */
  duplicate: (columns: Array<number | string>, style: FormatStyle): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'duplicate',
    columns,
    style,
  }),

  /**
   * 数据条
   */
  dataBar: (columns: Array<number | string>, maxColor = '#3b82f6'): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'dataBar',
    columns,
    dataBar: { maxColor, showValue: true },
  }),

  /**
   * 色阶
   */
  colorScale: (columns: Array<number | string>, minColor: string, maxColor: string, midColor?: string): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'colorScale',
    columns,
    colorScale: { minColor, maxColor, midColor },
  }),

  /**
   * 自定义
   */
  custom: (
    columns: Array<number | string>,
    condition: (value: any, rowData: RowData, column: Column) => boolean,
    style: FormatStyle
  ): ConditionalFormatRule => ({
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'custom',
    columns,
    condition,
    style,
  }),
};

