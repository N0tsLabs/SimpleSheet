/**
 * 单元格编辑器基类
 */

import type { CellEditor, RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export abstract class BaseEditor implements CellEditor {
  protected container: HTMLElement | null = null;
  protected value: any;
  protected rowData: RowData = {};
  protected column: Column | null = null;
  protected element: HTMLElement | null = null;

  /**
   * 创建编辑器
   */
  create(container: HTMLElement, value: any, rowData: RowData, column: Column): void {
    this.container = container;
    this.value = value;
    this.rowData = rowData;
    this.column = column;
    
    this.element = this.createElement();
    this.container.appendChild(this.element);
    this.setValue(value);
  }

  /**
   * 创建编辑器元素
   */
  protected abstract createElement(): HTMLElement;

  /**
   * 设置编辑器值
   */
  protected abstract setValue(value: any): void;

  /**
   * 获取编辑后的值
   */
  abstract getValue(): any;

  /**
   * 聚焦编辑器
   */
  abstract focus(): void;

  /**
   * 验证输入
   */
  validate(): boolean | string {
    return true;
  }

  /**
   * 销毁编辑器
   */
  destroy(): void {
    if (this.element && this.container) {
      this.container.removeChild(this.element);
    }
    this.element = null;
    this.container = null;
    this.column = null;
  }

  /**
   * 创建包装器元素
   */
  protected createWrapper(className = 'ss-editor'): HTMLDivElement {
    return createElement('div', className);
  }
}

