/**
 * 数字编辑器
 */

import { BaseEditor } from './BaseEditor';
import { createElement } from '../utils/dom';

export class NumberEditor extends BaseEditor {
  private input: HTMLInputElement | null = null;

  protected createElement(): HTMLElement {
    const wrapper = this.createWrapper('ss-editor ss-number-editor');
    
    this.input = createElement('input', 'ss-editor-input');
    this.input.type = 'text'; // 使用 text 类型以获得更好的控制
    this.input.inputMode = 'decimal';
    this.input.spellcheck = false;
    this.input.autocomplete = 'off';
    
    // 限制输入只能是数字
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    wrapper.appendChild(this.input);
    return wrapper;
  }

  protected setValue(value: any): void {
    if (this.input) {
      this.input.value = value !== null && value !== undefined ? String(value) : '';
    }
  }

  getValue(): any {
    const value = this.input?.value ?? '';
    if (value === '') return null;
    
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  focus(): void {
    if (this.input) {
      this.input.focus();
      // 不全选，把光标放到末尾（Excel 风格）
      const len = this.input.value.length;
      this.input.setSelectionRange(len, len);
    }
  }

  validate(): boolean | string {
    const value = this.input?.value ?? '';
    if (value === '') return true;
    
    if (isNaN(Number(value))) {
      return '请输入有效的数字';
    }
    
    return true;
  }

  private handleInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    // 允许数字、小数点、负号
    input.value = input.value.replace(/[^0-9.\-]/g, '');
    
    // 只允许一个小数点
    const parts = input.value.split('.');
    if (parts.length > 2) {
      input.value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 只允许在开头有负号
    if (input.value.indexOf('-') > 0) {
      input.value = input.value.replace(/-/g, '');
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // 允许的按键：数字、小数点、负号、退格、删除、方向键、Tab、Enter
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', '.', '-',
    ];
    
    if (
      allowedKeys.includes(e.key) ||
      /^[0-9]$/.test(e.key) ||
      (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))
    ) {
      return;
    }
    
    e.preventDefault();
  }

  destroy(): void {
    this.input = null;
    super.destroy();
  }
}

