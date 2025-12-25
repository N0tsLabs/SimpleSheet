/**
 * 单元格渲染器基类
 */

import type { CellRenderer, RowData, Column } from '../types';

export abstract class BaseRenderer implements CellRenderer {
  /**
   * 渲染单元格内容
   */
  abstract render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void;

  /**
   * 销毁渲染器
   */
  destroy(): void {
    // 子类可以覆盖此方法进行清理
  }

  /**
   * 格式化显示值
   */
  protected formatValue(value: any, column: Column): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (column.formatter) {
      return column.formatter(value, {}, column);
    }
    
    return String(value);
  }

  /**
   * 设置单元格文本内容
   */
  protected setText(cell: HTMLElement, text: string): void {
    cell.textContent = text;
  }

  /**
   * 设置单元格 HTML 内容
   */
  protected setHTML(cell: HTMLElement, html: string): void {
    cell.innerHTML = html;
  }

  /**
   * 清空单元格内容
   */
  protected clear(cell: HTMLElement): void {
    cell.textContent = '';
  }
}

