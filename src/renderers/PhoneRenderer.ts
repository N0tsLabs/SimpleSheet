/**
 * 手机号渲染器
 * 显示为可点击的电话链接样式
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class PhoneRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';
    cell.classList.add('ss-cell-link-type');

    if (value === null || value === undefined || value === '') {
      return;
    }

    const phone = String(value);
    
    const link = createElement('span', 'ss-cell-link ss-cell-phone');
    link.textContent = this.formatPhone(phone);
    link.setAttribute('data-url', phone);
    link.setAttribute('data-type', 'phone');

    cell.appendChild(link);
    cell.title = phone;
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

