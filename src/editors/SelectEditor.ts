/**
 * 下拉选择编辑器
 * 自定义下拉菜单，支持颜色标签
 */

import { BaseEditor } from './BaseEditor';
import type { Column, SelectOption } from '../types';
import { createElement, setStyles, addEvent } from '../utils/dom';

// 预设颜色
const PRESET_COLORS = [
  { bg: '#e3f2fd', text: '#1565c0' },
  { bg: '#e8f5e9', text: '#2e7d32' },
  { bg: '#fff3e0', text: '#ef6c00' },
  { bg: '#fce4ec', text: '#c2185b' },
  { bg: '#f3e5f5', text: '#7b1fa2' },
  { bg: '#e0f7fa', text: '#00838f' },
  { bg: '#fff8e1', text: '#ff8f00' },
  { bg: '#efebe9', text: '#5d4037' },
  { bg: '#e8eaf6', text: '#3949ab' },
  { bg: '#fbe9e7', text: '#d84315' },
];

export class SelectEditor extends BaseEditor {
  private trigger: HTMLElement | null = null;
  private dropdown: HTMLElement | null = null;
  private options: SelectOption[] = [];
  private selectedValue: any = null;
  private isOpen = false;
  private closeHandler: ((e: Event) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private highlightedIndex = -1;

  protected createElement(): HTMLElement {
    const wrapper = this.createWrapper('ss-editor ss-select-editor-custom');
    
    // 从列配置获取选项
    this.options = this.column?.options || [];
    
    // 创建触发器（显示当前选中值）
    this.trigger = createElement('div', 'ss-select-trigger');
    this.trigger.setAttribute('tabindex', '0');
    
    const triggerContent = createElement('div', 'ss-select-trigger-content');
    triggerContent.innerHTML = '<span class="ss-select-placeholder">请选择...</span>';
    this.trigger.appendChild(triggerContent);
    
    const arrow = createElement('span', 'ss-select-arrow');
    arrow.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>';
    this.trigger.appendChild(arrow);
    
    // 点击触发器打开/关闭下拉
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });
    
    // 键盘支持
    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleDropdown();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.isOpen) {
          this.openDropdown();
        }
      } else if (e.key === 'Escape') {
        this.closeDropdown();
        // 触发 blur 以结束编辑
        this.trigger?.blur();
      }
    });

    wrapper.appendChild(this.trigger);
    return wrapper;
  }

  private toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // 创建下拉菜单
    this.dropdown = createElement('div', 'ss-select-dropdown');
    
    // 继承主题
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme) {
      this.dropdown.setAttribute('data-theme', theme);
    }
    
    // 添加选项
    this.options.forEach((opt, index) => {
      const item = this.createOptionItem(opt, index);
      this.dropdown!.appendChild(item);
    });
    
    // 定位下拉菜单
    const triggerRect = this.trigger!.getBoundingClientRect();
    this.dropdown.style.position = 'fixed';
    this.dropdown.style.top = `${triggerRect.bottom + 4}px`;
    this.dropdown.style.left = `${triggerRect.left}px`;
    this.dropdown.style.minWidth = `${Math.min(triggerRect.width, 200)}px`;
    this.dropdown.style.maxWidth = '300px';
    this.dropdown.style.width = 'auto';
    this.dropdown.style.zIndex = '10001';
    
    document.body.appendChild(this.dropdown);
    
    // 调整位置确保在视口内
    const dropdownRect = this.dropdown.getBoundingClientRect();
    if (dropdownRect.bottom > window.innerHeight) {
      this.dropdown.style.top = `${triggerRect.top - dropdownRect.height - 2}px`;
    }
    if (dropdownRect.right > window.innerWidth) {
      this.dropdown.style.left = `${window.innerWidth - dropdownRect.width - 8}px`;
    }
    
    // 标记触发器为打开状态
    this.trigger?.classList.add('ss-select-open');
    
    // 高亮当前选中项
    this.highlightedIndex = this.options.findIndex(opt => opt.value === this.selectedValue);
    this.updateHighlight();
    
    // 点击外部关闭
    this.closeHandler = (e: Event) => {
      if (!this.dropdown?.contains(e.target as Node) && !this.trigger?.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    setTimeout(() => document.addEventListener('click', this.closeHandler!), 0);
    
    // 键盘导航
    this.keyHandler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.options.length - 1);
          this.updateHighlight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
          this.updateHighlight();
          break;
        case 'Enter':
          e.preventDefault();
          if (this.highlightedIndex >= 0) {
            this.selectOption(this.options[this.highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.closeDropdown();
          break;
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  private closeDropdown(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    
    this.dropdown?.remove();
    this.dropdown = null;
    this.trigger?.classList.remove('ss-select-open');
    
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler);
      this.closeHandler = null;
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  private createOptionItem(opt: SelectOption, index: number): HTMLElement {
    const item = createElement('div', 'ss-select-option');
    item.dataset.index = String(index);
    
    // 颜色标签
    const colors = this.getOptionColors(opt, index);
    const tag = createElement('span', 'ss-select-option-tag');
    tag.textContent = opt.label;
    tag.style.backgroundColor = colors.bg;
    tag.style.color = colors.text;
    item.appendChild(tag);
    
    // 选中状态
    if (opt.value === this.selectedValue) {
      item.classList.add('ss-select-option-selected');
      const check = createElement('span', 'ss-select-option-check');
      check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      item.appendChild(check);
    }
    
    // 点击选中
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectOption(opt);
    });
    
    // 悬停高亮
    item.addEventListener('mouseenter', () => {
      this.highlightedIndex = index;
      this.updateHighlight();
    });
    
    return item;
  }

  private updateHighlight(): void {
    if (!this.dropdown) return;
    
    const items = this.dropdown.querySelectorAll('.ss-select-option');
    items.forEach((item, index) => {
      if (index === this.highlightedIndex) {
        item.classList.add('ss-select-option-highlighted');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('ss-select-option-highlighted');
      }
    });
  }

  private selectOption(opt: SelectOption): void {
    this.selectedValue = opt.value;
    this.updateTriggerDisplay();
    this.closeDropdown();
    // 模拟 Enter 键触发完成编辑
    this.trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  private updateTriggerDisplay(): void {
    if (!this.trigger) return;
    
    const content = this.trigger.querySelector('.ss-select-trigger-content');
    if (!content) return;
    
    const selected = this.options.find(opt => opt.value === this.selectedValue);
    
    if (selected) {
      const colors = this.getOptionColors(selected, this.options.indexOf(selected));
      content.innerHTML = '';
      const tag = createElement('span', 'ss-select-trigger-tag');
      tag.textContent = selected.label;
      tag.style.backgroundColor = colors.bg;
      tag.style.color = colors.text;
      content.appendChild(tag);
    } else {
      content.innerHTML = '<span class="ss-select-placeholder">请选择...</span>';
    }
  }

  private getOptionColors(opt: SelectOption, index: number): { bg: string; text: string } {
    if (opt.color) {
      return {
        bg: opt.color,
        text: opt.textColor || this.getContrastColor(opt.color),
      };
    }
    return PRESET_COLORS[index % PRESET_COLORS.length];
  }

  private getContrastColor(bgColor: string): string {
    let r = 0, g = 0, b = 0;
    if (bgColor.startsWith('#')) {
      const hex = bgColor.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  }

  protected setValue(value: any): void {
    this.selectedValue = value;
    this.updateTriggerDisplay();
  }

  getValue(): any {
    return this.selectedValue;
  }

  focus(): void {
    this.trigger?.focus();
    // 自动打开下拉
    setTimeout(() => this.openDropdown(), 100);
  }

  destroy(): void {
    this.closeDropdown();
    this.trigger = null;
    super.destroy();
  }
}

