/**
 * 数据验证插件
 */

import { EventEmitter } from '../core/EventEmitter';
import type { Column, RowData, CellMeta } from '../types';

/**
 * 验证规则类型
 */
export type ValidatorType = 
  | 'required'      // 必填
  | 'number'        // 数字
  | 'integer'       // 整数
  | 'email'         // 邮箱
  | 'url'           // URL
  | 'phone'         // 手机号
  | 'range'         // 数值范围
  | 'length'        // 文本长度
  | 'pattern'       // 正则表达式
  | 'custom';       // 自定义

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 规则类型 */
  type: ValidatorType;
  /** 错误提示消息 */
  message?: string;
  /** 最小值（用于 range 和 length） */
  min?: number;
  /** 最大值（用于 range 和 length） */
  max?: number;
  /** 正则表达式（用于 pattern） */
  pattern?: RegExp | string;
  /** 自定义验证函数 */
  validator?: (value: any, rowData: RowData, column: Column) => boolean | string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    row: number;
    col: number;
    message: string;
    rule: ValidationRule;
  }>;
}

/**
 * 列验证配置
 */
export interface ColumnValidation {
  /** 列索引或 key */
  column: number | string;
  /** 验证规则列表 */
  rules: ValidationRule[];
}

interface ValidatorEvents {
  'validation:error': { row: number; col: number; message: string };
  'validation:clear': { row: number; col: number };
  'validation:complete': ValidationResult;
}

export class Validator extends EventEmitter<ValidatorEvents> {
  private validations: Map<string | number, ValidationRule[]> = new Map();
  private errors: Map<string, string> = new Map();

  /**
   * 添加列验证规则
   */
  addValidation(column: number | string, rules: ValidationRule[]): void {
    this.validations.set(column, rules);
  }

  /**
   * 添加列验证规则（别名，支持单个规则）
   */
  addRule(column: number | string, rule: ValidationRule): void {
    const existing = this.validations.get(column) || [];
    existing.push(rule);
    this.validations.set(column, existing);
  }

  /**
   * 移除列验证规则
   */
  removeValidation(column: number | string): void {
    this.validations.delete(column);
  }

  /**
   * 清除所有验证规则
   */
  clearValidations(): void {
    this.validations.clear();
    this.errors.clear();
  }

  /**
   * 验证单个单元格
   */
  validateCell(
    row: number,
    col: number,
    value: any,
    rowData: RowData,
    column: Column
  ): string | null {
    const rules = this.validations.get(col) || this.validations.get(column.key);
    if (!rules || rules.length === 0) {
      return null;
    }

    for (const rule of rules) {
      const error = this.runValidation(value, rowData, column, rule);
      if (error) {
        const cellKey = `${row}:${col}`;
        this.errors.set(cellKey, error);
        this.emit('validation:error', { row, col, message: error });
        return error;
      }
    }

    // 验证通过，清除之前的错误
    const cellKey = `${row}:${col}`;
    if (this.errors.has(cellKey)) {
      this.errors.delete(cellKey);
      this.emit('validation:clear', { row, col });
    }

    return null;
  }

  /**
   * 验证所有数据
   */
  validateAll(
    data: RowData[],
    columns: Column[]
  ): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    this.errors.clear();

    for (let row = 0; row < data.length; row++) {
      const rowData = data[row];
      
      for (let col = 0; col < columns.length; col++) {
        const column = columns[col];
        const value = rowData[column.key];
        
        const error = this.validateCell(row, col, value, rowData, column);
        if (error) {
          const rules = this.validations.get(col) || this.validations.get(column.key);
          errors.push({
            row,
            col,
            message: error,
            rule: rules![0], // 返回第一个失败的规则
          });
        }
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    this.emit('validation:complete', result);
    return result;
  }

  /**
   * 获取单元格错误
   */
  getCellError(row: number, col: number): string | null {
    return this.errors.get(`${row}:${col}`) || null;
  }

  /**
   * 是否有错误
   */
  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): Array<{ row: number; col: number; message: string }> {
    const result: Array<{ row: number; col: number; message: string }> = [];
    
    for (const [key, message] of this.errors) {
      const [row, col] = key.split(':').map(Number);
      result.push({ row, col, message });
    }
    
    return result;
  }

  /**
   * 执行单个验证规则
   */
  private runValidation(
    value: any,
    rowData: RowData,
    column: Column,
    rule: ValidationRule
  ): string | null {
    const isEmpty = value === null || value === undefined || value === '';

    switch (rule.type) {
      case 'required':
        if (isEmpty) {
          return rule.message || '此字段为必填项';
        }
        break;

      case 'number':
        if (!isEmpty && isNaN(Number(value))) {
          return rule.message || '请输入有效的数字';
        }
        break;

      case 'integer':
        if (!isEmpty && !Number.isInteger(Number(value))) {
          return rule.message || '请输入整数';
        }
        break;

      case 'email':
        if (!isEmpty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          return rule.message || '请输入有效的邮箱地址';
        }
        break;

      case 'url':
        if (!isEmpty) {
          try {
            new URL(String(value));
          } catch {
            return rule.message || '请输入有效的 URL';
          }
        }
        break;

      case 'phone':
        if (!isEmpty && !/^1[3-9]\d{9}$/.test(String(value))) {
          return rule.message || '请输入有效的手机号';
        }
        break;

      case 'range':
        if (!isEmpty) {
          const num = Number(value);
          if (isNaN(num)) {
            return rule.message || '请输入有效的数字';
          }
          if (rule.min !== undefined && num < rule.min) {
            return rule.message || `数值不能小于 ${rule.min}`;
          }
          if (rule.max !== undefined && num > rule.max) {
            return rule.message || `数值不能大于 ${rule.max}`;
          }
        }
        break;

      case 'length':
        if (!isEmpty) {
          const len = String(value).length;
          if (rule.min !== undefined && len < rule.min) {
            return rule.message || `长度不能少于 ${rule.min} 个字符`;
          }
          if (rule.max !== undefined && len > rule.max) {
            return rule.message || `长度不能超过 ${rule.max} 个字符`;
          }
        }
        break;

      case 'pattern':
        if (!isEmpty && rule.pattern) {
          const regex = typeof rule.pattern === 'string' 
            ? new RegExp(rule.pattern) 
            : rule.pattern;
          if (!regex.test(String(value))) {
            return rule.message || '格式不正确';
          }
        }
        break;

      case 'custom':
        if (rule.validator) {
          const result = rule.validator(value, rowData, column);
          if (result !== true) {
            return typeof result === 'string' ? result : (rule.message || '验证失败');
          }
        }
        break;
    }

    return null;
  }
}

/**
 * 创建常用验证规则的工厂函数
 */
export const ValidationRules = {
  required: (message?: string): ValidationRule => ({
    type: 'required',
    message,
  }),

  number: (message?: string): ValidationRule => ({
    type: 'number',
    message,
  }),

  integer: (message?: string): ValidationRule => ({
    type: 'integer',
    message,
  }),

  email: (message?: string): ValidationRule => ({
    type: 'email',
    message,
  }),

  url: (message?: string): ValidationRule => ({
    type: 'url',
    message,
  }),

  phone: (message?: string): ValidationRule => ({
    type: 'phone',
    message,
  }),

  range: (min?: number, max?: number, message?: string): ValidationRule => ({
    type: 'range',
    min,
    max,
    message,
  }),

  length: (min?: number, max?: number, message?: string): ValidationRule => ({
    type: 'length',
    min,
    max,
    message,
  }),

  pattern: (pattern: RegExp | string, message?: string): ValidationRule => ({
    type: 'pattern',
    pattern,
    message,
  }),

  custom: (
    validator: (value: any, rowData: RowData, column: Column) => boolean | string,
    message?: string
  ): ValidationRule => ({
    type: 'custom',
    validator,
    message,
  }),
};

