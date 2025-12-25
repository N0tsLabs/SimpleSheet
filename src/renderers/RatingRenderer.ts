/**
 * 评分渲染器（星级）
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export class RatingRenderer extends BaseRenderer {
  private maxRating = 5;

  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    const rating = Math.min(this.maxRating, Math.max(0, Number(value) || 0));
    const wrapper = createElement('div', 'ss-rating-wrapper');

    for (let i = 1; i <= this.maxRating; i++) {
      const star = createElement('span', 'ss-rating-star');
      
      if (i <= rating) {
        star.classList.add('ss-rating-star-filled');
        star.textContent = '★';
      } else if (i - 0.5 <= rating) {
        star.classList.add('ss-rating-star-half');
        star.textContent = '★';
      } else {
        star.textContent = '☆';
      }
      
      wrapper.appendChild(star);
    }

    cell.appendChild(wrapper);
    cell.title = `${rating} / ${this.maxRating}`;
  }
}

