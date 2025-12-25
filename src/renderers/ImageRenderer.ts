/**
 * 图片渲染器
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement, setStyles } from '../utils/dom';

export class ImageRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    const wrapper = createElement('div', 'ss-cell-image-wrapper');
    const img = createElement('img', 'ss-cell-image') as HTMLImageElement;
    
    // 支持对象格式 { src, alt } 或纯字符串
    if (typeof value === 'object' && value.src) {
      img.src = value.src;
      img.alt = value.alt || '';
    } else {
      img.src = String(value);
      img.alt = '';
    }

    img.loading = 'lazy';
    
    // 图片加载失败时显示占位符
    img.onerror = () => {
      wrapper.innerHTML = '<span class="ss-image-error">🖼️</span>';
    };

    // 点击图片可以预览
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showPreview(img.src);
    });

    wrapper.appendChild(img);
    cell.appendChild(wrapper);
    cell.title = img.src;
  }

  /**
   * 显示图片预览
   */
  private showPreview(src: string): void {
    const overlay = createElement('div', 'ss-image-preview-overlay');
    const img = createElement('img', 'ss-image-preview') as HTMLImageElement;
    img.src = src;

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    // 点击关闭预览
    overlay.addEventListener('click', () => {
      overlay.remove();
    });

    // ESC 关闭
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }
}

