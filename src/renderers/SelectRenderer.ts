/**
 * 下拉选择渲染器
 * 支持单选和多选，标签样式显示
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column, SelectOption } from '../types';
import { createElement } from '../utils/dom';
import { showTagsPopover, closeTagsPopover } from '../plugins/TagsPopover';

// 预设颜色方案
const PRESET_COLORS = [
  { bg: '#e3f2fd', text: '#1565c0' }, // 蓝色
  { bg: '#e8f5e9', text: '#2e7d32' }, // 绿色
  { bg: '#fff3e0', text: '#ef6c00' }, // 橙色
  { bg: '#fce4ec', text: '#c2185b' }, // 粉色
  { bg: '#f3e5f5', text: '#7b1fa2' }, // 紫色
  { bg: '#e0f7fa', text: '#00838f' }, // 青色
  { bg: '#fff8e1', text: '#ff8f00' }, // 琥珀色
  { bg: '#efebe9', text: '#5d4037' }, // 棕色
  { bg: '#e8eaf6', text: '#3949ab' }, // 靛蓝
  { bg: '#fbe9e7', text: '#d84315' }, // 深橙
];

export class SelectRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';
    cell.classList.add('ss-cell-select');
    
    const options: SelectOption[] = column.options || [];
    
    // 处理多选（数组值）
    if (Array.isArray(value)) {
      this.renderMultiple(cell, value, options);
      return;
    }
    
    // 单选
    this.renderSingle(cell, value, options);
  }
  
  /**
   * 渲染单选值
   */
  private renderSingle(cell: HTMLElement, value: any, options: SelectOption[]): void {
    if (value === null || value === undefined || value === '') {
      cell.title = '';
      return;
    }
    
    const selectedOption = options.find(opt => 
      opt.value === value || String(opt.value) === String(value)
    );
    
    if (selectedOption) {
      const tag = this.createTag(selectedOption, options);
      cell.appendChild(tag);
      cell.title = selectedOption.label;
    } else {
      // 没有匹配的选项，显示原始值
      const tag = this.createPlainTag(String(value));
      cell.appendChild(tag);
      cell.title = String(value);
    }
  }
  
  /**
   * 渲染多选值
   */
  private renderMultiple(cell: HTMLElement, values: any[], options: SelectOption[]): void {
    const container = createElement('div', 'ss-select-tags');
    container.classList.add('ss-select-tags-clickable');
    const titles: string[] = [];
    
    for (const val of values) {
      const option = options.find(opt => 
        opt.value === val || String(opt.value) === String(val)
      );
      
      if (option) {
        const tag = this.createTag(option, options);
        container.appendChild(tag);
        titles.push(option.label);
      } else if (val !== null && val !== undefined && val !== '') {
        const tag = this.createPlainTag(String(val));
        container.appendChild(tag);
        titles.push(String(val));
      }
    }
    
    // 存储数据用于点击显示悬浮窗
    container.setAttribute('data-values', JSON.stringify(values));
    container.setAttribute('data-options', JSON.stringify(options));
    
    cell.appendChild(container);
    cell.title = titles.join(', ');
    
    // 检测溢出并添加提示
    requestAnimationFrame(() => {
      this.checkOverflow(cell, container, titles);
    });
  }
  
  /**
   * 检测溢出并添加省略提示
   */
  private checkOverflow(cell: HTMLElement, container: HTMLElement, titles: string[]): void {
    // 检查是否溢出
    if (container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight) {
      cell.classList.add('ss-select-overflow');
      
      // 移除已有的溢出指示器
      const existing = container.querySelector('.ss-select-more');
      if (existing) existing.remove();
      
      // 添加溢出指示器
      const more = createElement('span', 'ss-select-more');
      more.textContent = '...';
      more.title = titles.join('\n');
      container.appendChild(more);
    }
  }
  
  /**
   * 创建标签元素
   */
  private createTag(option: SelectOption, allOptions: SelectOption[]): HTMLElement {
    const tag = createElement('span', 'ss-select-tag');
    tag.textContent = option.label;
    
    // 获取颜色
    const colors = this.getOptionColors(option, allOptions);
    tag.style.backgroundColor = colors.bg;
    tag.style.color = colors.text;
    
    return tag;
  }
  
  /**
   * 创建普通标签（无颜色配置时）
   */
  private createPlainTag(text: string): HTMLElement {
    const tag = createElement('span', 'ss-select-tag ss-select-tag-plain');
    tag.textContent = text;
    return tag;
  }
  
  /**
   * 获取选项的颜色
   */
  private getOptionColors(option: SelectOption, allOptions: SelectOption[]): { bg: string; text: string } {
    // 如果选项有自定义颜色
    if (option.color) {
      return {
        bg: option.color,
        text: option.textColor || this.getContrastColor(option.color),
      };
    }
    
    // 使用预设颜色（根据选项在列表中的索引）
    const index = allOptions.findIndex(opt => opt.value === option.value);
    const colorIndex = index >= 0 ? index % PRESET_COLORS.length : 0;
    return PRESET_COLORS[colorIndex];
  }
  
  /**
   * 根据背景色计算对比文字颜色
   */
  private getContrastColor(bgColor: string): string {
    // 解析颜色
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
    } else if (bgColor.startsWith('rgb')) {
      const match = bgColor.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }
    
    // 计算亮度
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // 亮度高于0.5使用深色文字，否则使用浅色
    return luminance > 0.5 ? '#333333' : '#ffffff';
  }
}

