/**
 * 多链接渲染器
 * 支持多值，显示为可点击的链接
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

interface LinkValue {
  url: string;
  text?: string;
}

export class MultiLinkRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    // 标准化为数组
    let links: LinkValue[] = [];
    
    if (Array.isArray(value)) {
      links = value.map(v => this.normalizeLinkValue(v));
    } else {
      links = [this.normalizeLinkValue(value)];
    }
    
    if (links.length === 0) {
      return;
    }

    const container = createElement('div', 'ss-cell-links');

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (!link.url) continue;

      const anchor = createElement('a', 'ss-cell-link');
      anchor.href = link.url;
      anchor.textContent = link.text || this.getDisplayText(link.url);
      anchor.title = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      
      // 阻止链接点击时触发单元格选择
      anchor.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      container.appendChild(anchor);

      // 添加分隔符
      if (i < links.length - 1) {
        const separator = createElement('span', 'ss-cell-link-separator');
        separator.textContent = ', ';
        container.appendChild(separator);
      }
    }

    // 如果有多个值，显示数量标签
    if (links.length > 1) {
      const badge = createElement('span', 'ss-cell-multi-badge');
      badge.textContent = `${links.length}`;
      badge.title = links.map(l => l.url).join('\n');
      container.appendChild(badge);
    }

    cell.appendChild(container);
  }

  /**
   * 标准化链接值
   */
  private normalizeLinkValue(value: any): LinkValue {
    if (typeof value === 'object' && value !== null) {
      return {
        url: value.url || '',
        text: value.text,
      };
    }
    return {
      url: String(value || ''),
    };
  }

  /**
   * 获取显示文本
   */
  private getDisplayText(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname || url;
    } catch {
      // 如果不是完整 URL，直接返回
      if (url.length > 30) {
        return url.slice(0, 27) + '...';
      }
      return url;
    }
  }
}

