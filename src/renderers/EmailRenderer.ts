/**
 * 邮箱渲染器
 * 支持多值，显示为可点击的邮箱链接
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class EmailRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    // 标准化为数组
    const emails: string[] = Array.isArray(value) ? value : [value];
    
    if (emails.length === 0) {
      return;
    }

    const container = createElement('div', 'ss-cell-emails');

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      if (!email) continue;

      const link = createElement('a', 'ss-cell-email');
      link.href = `mailto:${email}`;
      link.textContent = email;
      link.title = email;
      
      // 阻止链接点击时触发单元格选择
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      container.appendChild(link);

      // 添加分隔符
      if (i < emails.length - 1) {
        const separator = createElement('span', 'ss-cell-email-separator');
        separator.textContent = ', ';
        container.appendChild(separator);
      }
    }

    // 如果有多个值，显示数量标签
    if (emails.length > 1) {
      const badge = createElement('span', 'ss-cell-multi-badge');
      badge.textContent = `${emails.length}`;
      badge.title = emails.join(', ');
      container.appendChild(badge);
    }

    cell.appendChild(container);
  }
}

