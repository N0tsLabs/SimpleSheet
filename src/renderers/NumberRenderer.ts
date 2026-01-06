/**
 * 数字渲染器
 * 支持小数位数、前缀、后缀、千分位分隔符配置
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';

export class NumberRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    if (value === null || value === undefined || value === '') {
      this.clear(cell);
      return;
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
      this.setText(cell, String(value));
      return;
    }
    
    // 使用自定义格式化函数或根据列配置格式化
    let formatted: string;
    
    if (column.formatter) {
      formatted = column.formatter(num, rowData, column);
    } else {
      formatted = this.formatNumber(num, column);
    }
    
    this.setText(cell, formatted);
    cell.title = formatted;
    
    // 数字默认右对齐
    if (!column.align) {
      cell.style.textAlign = 'right';
    }
  }
  
  /**
   * 根据列配置格式化数字
   */
  private formatNumber(value: number, column: Column): string {
    const {
      decimalPlaces,
      numberPrefix = '',
      numberSuffix = '',
      useThousandSeparator = true,
    } = column;
    
    // 处理小数位数
    let numStr: string;
    if (decimalPlaces !== undefined && decimalPlaces >= 0) {
      numStr = value.toFixed(decimalPlaces);
    } else {
      numStr = String(value);
    }
    
    // 处理千分位分隔符
    if (useThousandSeparator) {
      const parts = numStr.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      numStr = parts.join('.');
    }
    
    // 添加前缀和后缀
    return `${numberPrefix}${numStr}${numberSuffix}`;
  }
}

