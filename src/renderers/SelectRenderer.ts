/**
 * 下拉选择渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column, SelectOption } from '../types';
import { createElement } from '../utils/dom';

export class SelectRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';
    
    const options: SelectOption[] = column.options || [];
    
    // 查找匹配的选项
    const selectedOption = options.find(opt => {
      if (opt.value === value) return true;
      return String(opt.value) === String(value);
    });
    
    if (selectedOption) {
      this.setText(cell, selectedOption.label);
    } else if (value !== null && value !== undefined) {
      this.setText(cell, String(value));
    } else {
      this.setText(cell, '');
    }
    
    // 设置 title 提示
    cell.title = selectedOption ? selectedOption.label : String(value || '');
  }
}

