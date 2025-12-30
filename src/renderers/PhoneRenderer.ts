/**
 * 手机号渲染器
 * 支持多值，显示为可点击的电话链接
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class PhoneRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    // 标准化为数组
    const phones: string[] = Array.isArray(value) ? value : [value];
    
    if (phones.length === 0) {
      return;
    }

    const container = createElement('div', 'ss-cell-phones');

    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];
      if (!phone) continue;

      const link = createElement('a', 'ss-cell-phone');
      link.href = `tel:${phone}`;
      link.textContent = this.formatPhone(phone);
      link.title = phone;
      
      // 阻止链接点击时触发单元格选择
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      container.appendChild(link);

      // 添加分隔符
      if (i < phones.length - 1) {
        const separator = createElement('span', 'ss-cell-phone-separator');
        separator.textContent = ', ';
        container.appendChild(separator);
      }
    }

    // 如果有多个值，显示数量标签
    if (phones.length > 1) {
      const badge = createElement('span', 'ss-cell-multi-badge');
      badge.textContent = `${phones.length}`;
      badge.title = phones.join(', ');
      container.appendChild(badge);
    }

    cell.appendChild(container);
  }

  /**
   * 格式化手机号显示
   */
  private formatPhone(phone: string): string {
    // 中国手机号格式化为 xxx xxxx xxxx
    if (/^1[3-9]\d{9}$/.test(phone)) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
    }
    return phone;
  }
}

