/**
 * 进度条渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement, setStyles } from '../utils/dom';

export class ProgressRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined) {
      return;
    }

    // 确保值在 0-100 之间
    const percent = Math.min(100, Math.max(0, Number(value) || 0));

    const wrapper = createElement('div', 'ss-progress-wrapper');
    const bar = createElement('div', 'ss-progress-bar');
    const fill = createElement('div', 'ss-progress-fill');
    const text = createElement('span', 'ss-progress-text');

    // 根据百分比设置颜色
    let color = '#3b82f6'; // 蓝色
    if (percent >= 100) {
      color = '#10b981'; // 绿色
    } else if (percent >= 80) {
      color = '#3b82f6'; // 蓝色
    } else if (percent >= 50) {
      color = '#f59e0b'; // 黄色
    } else if (percent >= 30) {
      color = '#f97316'; // 橙色
    } else {
      color = '#ef4444'; // 红色
    }

    setStyles(fill, {
      width: `${percent}%`,
      backgroundColor: color,
    });

    text.textContent = `${Math.round(percent)}%`;

    bar.appendChild(fill);
    wrapper.appendChild(bar);
    wrapper.appendChild(text);
    cell.appendChild(wrapper);
    
    cell.title = `${percent}%`;
  }
}

