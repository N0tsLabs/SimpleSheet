/**
 * 日期渲染器
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
        formatted = formatDate(date, 'YYYY-MM-DD');
      }
    }

    this.setText(cell, formatted);
    cell.title = formatted;
    cell.classList.add('ss-cell-date');
  }
}

