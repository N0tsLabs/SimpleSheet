/**
 * 日期编辑器
 */

import { BaseEditor } from './BaseEditor';
import { createElement } from '../utils/dom';

export class DateEditor extends BaseEditor {
  private input: HTMLInputElement | null = null;

  protected createElement(): HTMLElement {
    const wrapper = this.createWrapper('ss-editor ss-date-editor');
    
    this.input = createElement('input', 'ss-editor-input') as HTMLInputElement;
    this.input.type = 'date';
    
    wrapper.appendChild(this.input);
    return wrapper;
  }

  protected setValue(value: any): void {
    if (!this.input) return;
    
    if (!value) {
      this.input.value = '';
      return;
    }

    // 尝试转换为日期格式
    let dateStr = '';
    
    if (value instanceof Date) {
      dateStr = this.formatDateForInput(value);
    } else if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        dateStr = this.formatDateForInput(date);
      } else {
        // 尝试解析 YYYY-MM-DD 格式
        const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          dateStr = value;
        }
      }
    } else if (typeof value === 'number') {
      const date = new Date(value);
      dateStr = this.formatDateForInput(date);
    }

    this.input.value = dateStr;
  }

  getValue(): any {
    const value = this.input?.value;
    if (!value) return null;
    
    // 返回 Date 对象或字符串，取决于使用场景
    return value; // YYYY-MM-DD 格式字符串
  }

  focus(): void {
    this.input?.focus();
  }

  validate(): boolean | string {
    const value = this.input?.value;
    if (!value) return true;
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return '请输入有效的日期';
    }
    
    return true;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  destroy(): void {
    this.input = null;
    super.destroy();
  }
}

