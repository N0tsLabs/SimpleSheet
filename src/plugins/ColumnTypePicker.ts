/**
 * 列类型选择器
 * 类似腾讯文档的字段类型选择面板
 */

import { createElement, setStyles, addEvent } from '../utils/dom';
import type { ColumnType, ColumnTypeConfig, Column } from '../types';

/** 列类型定义 */
export const COLUMN_TYPES: ColumnTypeConfig[] = [
  // 基础类型
  { type: 'text', label: '文本', icon: 'A', group: '基础' },
  { type: 'number', label: '数字', icon: '123', group: '基础' },
  { type: 'date', label: '日期', icon: '📅', group: '基础' },
  { type: 'select', label: '选项', icon: '◉', group: '基础', description: '支持单选/多选' },

  // 联系方式
  { type: 'phone', label: '手机号', icon: '📱', group: '联系方式', description: '支持多个' },
  { type: 'email', label: '邮箱', icon: '✉️', group: '联系方式', description: '支持多个' },
  { type: 'link', label: '链接', icon: '🔗', group: '联系方式', description: '支持多个' },

  // 媒体
  { type: 'file', label: '文件/图片', icon: '📎', group: '媒体' },

  // 其他
  { type: 'boolean', label: '复选框', icon: '☑️', group: '其他' },
];

interface ColumnTypePickerOptions {
  /** 选择后的回调 */
  onSelect: (type: ColumnType, config: ColumnTypeConfig) => void;
  /** 取消回调 */
  onCancel?: () => void;
}

export class ColumnTypePicker {
  private element: HTMLElement | null = null;
  private options: ColumnTypePickerOptions;
  private cleanupFns: Array<() => void> = [];

  constructor(options: ColumnTypePickerOptions) {
    this.options = options;
  }

  /**
   * 显示选择器
   */
  show(x: number, y: number): void {
    this.hide();
    this.element = this.createPicker();
    document.body.appendChild(this.element);

    // 定位
    const rect = this.element.getBoundingClientRect();
    let finalX = x;
    let finalY = y;

    if (x + rect.width > window.innerWidth) {
      finalX = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
      finalY = window.innerHeight - rect.height - 10;
    }

    setStyles(this.element, {
      left: `${Math.max(10, finalX)}px`,
      top: `${Math.max(10, finalY)}px`,
    });

    // 点击外部关闭
    const handleClickOutside = (e: MouseEvent) => {
      if (this.element && !this.element.contains(e.target as Node)) {
        this.hide();
        this.options.onCancel?.();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      this.cleanupFns.push(() => document.removeEventListener('mousedown', handleClickOutside));
    }, 100);
  }

  /**
   * 隐藏选择器
   */
  hide(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.element?.remove();
    this.element = null;
  }

  /**
   * 创建选择器 DOM
   */
  private createPicker(): HTMLElement {
    const picker = createElement('div', 'ss-column-type-picker');
    
    // 标题
    const header = createElement('div', 'ss-ctp-header');
    header.textContent = '选择字段类型';
    picker.appendChild(header);

    // 按分组渲染
    const groups = this.groupTypes();
    const content = createElement('div', 'ss-ctp-content');

    for (const [groupName, types] of Object.entries(groups)) {
      const group = createElement('div', 'ss-ctp-group');
      
      if (groupName !== 'undefined') {
        const groupLabel = createElement('div', 'ss-ctp-group-label');
        groupLabel.textContent = groupName;
        group.appendChild(groupLabel);
      }

      const items = createElement('div', 'ss-ctp-items');
      for (const config of types) {
        const item = this.createTypeItem(config);
        items.appendChild(item);
      }
      group.appendChild(items);
      content.appendChild(group);
    }

    picker.appendChild(content);
    return picker;
  }

  /**
   * 创建类型项
   */
  private createTypeItem(config: ColumnTypeConfig): HTMLElement {
    const item = createElement('div', 'ss-ctp-item');
    item.dataset.type = config.type;

    const icon = createElement('span', 'ss-ctp-item-icon');
    icon.textContent = config.icon;
    item.appendChild(icon);

    const info = createElement('div', 'ss-ctp-item-info');
    const label = createElement('span', 'ss-ctp-item-label');
    label.textContent = config.label;
    info.appendChild(label);

    if (config.description) {
      const desc = createElement('span', 'ss-ctp-item-desc');
      desc.textContent = config.description;
      info.appendChild(desc);
    }
    item.appendChild(info);

    // 点击选择
    item.addEventListener('click', () => {
      this.options.onSelect(config.type, config);
      this.hide();
    });

    return item;
  }

  /**
   * 按分组组织类型
   */
  private groupTypes(): Record<string, ColumnTypeConfig[]> {
    const groups: Record<string, ColumnTypeConfig[]> = {};
    for (const config of COLUMN_TYPES) {
      const group = config.group || '';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(config);
    }
    return groups;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.hide();
  }
}

/**
 * 根据类型创建列配置
 */
export function createColumnByType(type: ColumnType, index: number): Column {
  const config = COLUMN_TYPES.find(c => c.type === type);
  const baseColumn: Column = {
    key: `col_${Date.now()}_${index}`,
    title: config?.label || '新列',
    width: 120,
    type,
  };

  // 根据类型设置默认配置
  switch (type) {
    case 'number':
      baseColumn.align = 'right';
      break;
    case 'date':
      baseColumn.width = 140;
      break;
    case 'email':
    case 'phone':
    case 'link':
      baseColumn.width = 180;
      break;
    case 'file':
      baseColumn.width = 150;
      break;
    case 'boolean':
      baseColumn.width = 80;
      baseColumn.align = 'center';
      break;
  }

  return baseColumn;
}

