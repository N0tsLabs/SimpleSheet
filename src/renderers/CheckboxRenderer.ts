/**
 * 复选框渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class CheckboxRenderer extends BaseRenderer {
  private onChange?: (row: number, col: number, value: boolean) => void;

  setOnChange(callback: (row: number, col: number, value: boolean) => void): void {
    this.onChange = callback;
  }

  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    const wrapper = createElement('div', 'ss-checkbox-wrapper');
    const checkbox = createElement('input', 'ss-checkbox') as HTMLInputElement;
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(value);

    // 只读列禁用复选框
    if (column.readonly) {
      checkbox.disabled = true;
    }

    // 点击事件
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const row = parseInt(cell.dataset.row || '0', 10);
      const col = parseInt(cell.dataset.col || '0', 10);
      this.onChange?.(row, col, checkbox.checked);
    });

    wrapper.appendChild(checkbox);
    cell.appendChild(wrapper);
  }
}

