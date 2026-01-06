/**
 * 链接渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class LinkRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';
    cell.classList.add('ss-cell-link-type');

    if (value === null || value === undefined || value === '') {
      return;
    }

    const link = createElement('span', 'ss-cell-link');
    
    let url: string;
    let displayText: string;
    
    // 支持对象格式 { url, text } 或纯字符串
    if (typeof value === 'object' && value.url) {
      url = value.url;
      displayText = value.text || value.url;
    } else {
      url = String(value);
      displayText = url;
    }

    link.textContent = displayText;
    link.setAttribute('data-url', url);
    link.setAttribute('data-type', 'link');
    link.setAttribute('data-display', displayText);

    cell.appendChild(link);
    cell.title = url;
  }
}

