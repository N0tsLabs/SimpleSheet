/**
 * 下拉选择编辑器
 */

import { BaseEditor } from './BaseEditor';
import type { Column, SelectOption } from '../types';
import { createElement, setStyles, addEvent } from '../utils/dom';

export class SelectEditor extends BaseEditor {
  private select: HTMLSelectElement | null = null;
  private options: SelectOption[] = [];

  protected createElement(): HTMLElement {
    const wrapper = this.createWrapper('ss-editor ss-select-editor');
    
    this.select = createElement('select', 'ss-editor-select') as HTMLSelectElement;
    
    // 从列配置获取选项
    this.options = this.column?.options || [];
    
    // 添加空选项
    const emptyOption = createElement('option') as HTMLOptionElement;
    emptyOption.value = '';
    emptyOption.textContent = '请选择...';
    this.select.appendChild(emptyOption);
    
    // 添加选项
    for (const opt of this.options) {
      const option = createElement('option') as HTMLOptionElement;
      option.value = String(opt.value);
      option.textContent = opt.label;
      this.select.appendChild(option);
    }

    wrapper.appendChild(this.select);
    return wrapper;
  }

  protected setValue(value: any): void {
    if (this.select) {
      this.select.value = value !== null && value !== undefined ? String(value) : '';
    }
  }

  getValue(): any {
    const value = this.select?.value;
    if (value === '') return null;
    
    // 尝试返回原始类型的值
    const option = this.options.find(opt => String(opt.value) === value);
    return option ? option.value : value;
  }

  focus(): void {
    this.select?.focus();
  }

  destroy(): void {
    this.select = null;
    super.destroy();
  }
}

