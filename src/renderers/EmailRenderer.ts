/**
 * 邮箱渲染器
 * 显示为可点击的邮箱链接样式
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class EmailRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';
    cell.classList.add('ss-cell-link-type');

    if (value === null || value === undefined || value === '') {
      return;
    }

    const email = String(value);
    
    const link = createElement('span', 'ss-cell-link ss-cell-email');
    link.textContent = email;
    link.setAttribute('data-url', email);
    link.setAttribute('data-type', 'email');

    cell.appendChild(link);
    cell.title = email;
  }
}

