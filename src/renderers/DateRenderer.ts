/**
 * 日期渲染器
 * 支持自定义日期格式配置
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { formatDate } from '../utils/helpers';

export class DateRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    if (value === null || value === undefined || value === '') {
      this.clear(cell);
      return;
    }

    let formatted: string;
    
    if (column.formatter) {
      formatted = column.formatter(value, rowData, column);
    } else {
      // 尝试解析日期
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) {
        formatted = String(value);
      } else {
        // 使用列配置的日期格式，默认 YYYY-MM-DD
        const dateFormat = column.dateFormat || 'YYYY-MM-DD';
        formatted = formatDate(date, dateFormat);
      }
    }

    this.setText(cell, formatted);
    cell.title = formatted;
    cell.classList.add('ss-cell-date');
  }
}

