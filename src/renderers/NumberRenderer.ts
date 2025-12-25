/**
 * 数字渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { formatNumber } from '../utils/helpers';

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
    
    // 使用格式化函数或默认格式化
    const formatted = column.formatter 
      ? column.formatter(num, rowData, column)
      : formatNumber(num);
    
    this.setText(cell, formatted);
    cell.title = formatted;
    
    // 数字默认右对齐
    if (!column.align) {
      cell.style.textAlign = 'right';
    }
  }
}

