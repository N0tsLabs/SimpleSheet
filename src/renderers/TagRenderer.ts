/**
 * 标签渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

// 预定义的标签颜色
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  default: { bg: '#e5e7eb', text: '#374151' },
  blue: { bg: '#dbeafe', text: '#1d4ed8' },
  green: { bg: '#dcfce7', text: '#15803d' },
  yellow: { bg: '#fef3c7', text: '#b45309' },
  red: { bg: '#fee2e2', text: '#dc2626' },
  purple: { bg: '#ede9fe', text: '#7c3aed' },
  pink: { bg: '#fce7f3', text: '#db2777' },
  cyan: { bg: '#cffafe', text: '#0891b2' },
};

export interface TagValue {
  text: string;
  color?: string;
}

export class TagRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    const wrapper = createElement('div', 'ss-cell-tags');

    // 支持数组或单个值
    const tags: TagValue[] = Array.isArray(value) 
      ? value 
      : [typeof value === 'object' ? value : { text: String(value) }];

    for (const tag of tags) {
      const tagEl = createElement('span', 'ss-tag');
      const color = TAG_COLORS[tag.color || 'default'] || TAG_COLORS.default;
      
      tagEl.textContent = tag.text;
      tagEl.style.backgroundColor = color.bg;
      tagEl.style.color = color.text;
      
      wrapper.appendChild(tagEl);
    }

    cell.appendChild(wrapper);
  }
}

