/**
 * 链接渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class LinkRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    const link = createElement('a', 'ss-cell-link');
    
    // 支持对象格式 { url, text } 或纯字符串
    if (typeof value === 'object' && value.url) {
      link.href = value.url;
      link.textContent = value.text || value.url;
    } else {
      const url = String(value);
      link.href = url;
      link.textContent = url;
    }

    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // 阻止链接点击时触发单元格选择
    link.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    cell.appendChild(link);
    cell.title = link.href;
  }
}

