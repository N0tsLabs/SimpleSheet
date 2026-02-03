/**
 * 标签悬浮窗
 * 点击标签单元格时显示全部标签
 */

import { createElement } from '../utils/dom';
import type { SelectOption } from '../types';

export interface TagsPopoverOptions {
  values: any[];
  options: SelectOption[];
  cell: HTMLElement;
  onClose?: () => void;
  onChange?: (values: any[]) => void; // 多选时回调
  multiple?: boolean; // 是否支持多选
}

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

let currentPopover: HTMLElement | null = null;
let closeHandler: ((e: Event) => void) | null = null;

/**
 * 关闭当前悬浮窗
 */
export function closeTagsPopover(): void {
  if (currentPopover) {
    currentPopover.remove();
    currentPopover = null;
  }
  if (closeHandler) {
    document.removeEventListener('mousedown', closeHandler);
    document.removeEventListener('scroll', closeHandler, true);
    closeHandler = null;
  }
}

/**
 * 获取选项颜色
 */
function getOptionColors(opt: SelectOption, index: number): { bg: string; text: string } {
  if (opt.color) {
    return {
      bg: opt.color,
      text: opt.textColor || getContrastColor(opt.color),
    };
  }
  return PRESET_COLORS[index % PRESET_COLORS.length];
}

/**
 * 计算对比色
 */
function getContrastColor(bgColor: string): string {
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

/**
 * 显示标签悬浮窗
 */
export function showTagsPopover(options: TagsPopoverOptions): void {
  // 先关闭已有的
  closeTagsPopover();
  
  const { values, options: selectOptions, cell, onClose, onChange, multiple = false } = options;
  
  // 创建悬浮窗
  const popover = createElement('div', 'ss-tags-popover');
  
  // 继承主题
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme) {
    popover.setAttribute('data-theme', theme);
  }
  
  // 当前选中的值（用于多选）
  let selectedValues: any[] = Array.isArray(values) ? [...values] : (values ? [values] : []);
  
  // 标题
  const header = createElement('div', 'ss-tags-popover-header');
  if (multiple) {
    header.innerHTML = `<span class="ss-tags-popover-title">选择标签</span><span class="ss-tags-popover-count">${selectedValues.length} 个已选</span>`;
  } else {
    header.innerHTML = `<span class="ss-tags-popover-title">全部标签</span><span class="ss-tags-popover-count">${selectedValues.length} 个</span>`;
  }
  popover.appendChild(header);
  
  // 标签列表
  const content = createElement('div', 'ss-tags-popover-content');
  
  if (multiple) {
    // 多选模式：显示所有选项，可点击切换选中状态
    for (const opt of selectOptions) {
      const isSelected = selectedValues.some(val => 
        opt.value === val || String(opt.value) === String(val)
      );
      
      const tagItem = createElement('div', 'ss-tags-popover-item');
      if (isSelected) {
        tagItem.classList.add('ss-tags-popover-item-selected');
      }
      
      const tag = createElement('span', 'ss-tags-popover-tag');
      const optIndex = selectOptions.indexOf(opt);
      const colors = getOptionColors(opt, optIndex);
      tag.textContent = opt.label;
      tag.style.backgroundColor = colors.bg;
      tag.style.color = colors.text;
      tagItem.appendChild(tag);
      
      // 选中标记
      if (isSelected) {
        const check = createElement('span', 'ss-tags-popover-check');
        check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        tagItem.appendChild(check);
      }
      
      // 点击切换选中状态
      tagItem.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = selectedValues.findIndex(val => 
          opt.value === val || String(opt.value) === String(val)
        );
        
        if (index >= 0) {
          // 取消选中
          selectedValues.splice(index, 1);
          tagItem.classList.remove('ss-tags-popover-item-selected');
          const check = tagItem.querySelector('.ss-tags-popover-check');
          if (check) check.remove();
        } else {
          // 选中
          selectedValues.push(opt.value);
          tagItem.classList.add('ss-tags-popover-item-selected');
          const check = createElement('span', 'ss-tags-popover-check');
          check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          tagItem.appendChild(check);
        }
        
        // 更新标题
        header.querySelector('.ss-tags-popover-count')!.textContent = `${selectedValues.length} 个已选`;
        
        // 触发回调
        onChange?.(selectedValues);
      });
      
      content.appendChild(tagItem);
    }
  } else {
    // 只读模式：仅显示已有标签
    if (!selectedValues || selectedValues.length === 0) return;
    
    for (const val of selectedValues) {
      const option = selectOptions.find(opt => 
        opt.value === val || String(opt.value) === String(val)
      );
      
      const tag = createElement('span', 'ss-tags-popover-tag');
      
      if (option) {
        const optIndex = selectOptions.indexOf(option);
        const colors = getOptionColors(option, optIndex);
        tag.textContent = option.label;
        tag.style.backgroundColor = colors.bg;
        tag.style.color = colors.text;
      } else {
        tag.textContent = String(val);
        tag.classList.add('ss-tags-popover-tag-plain');
      }
      
      content.appendChild(tag);
    }
  }
  
  popover.appendChild(content);
  
  // 操作按钮
  const actions = createElement('div', 'ss-tags-popover-actions');
  
  // 复制全部
  const copyBtn = createElement('button', 'ss-tags-popover-btn');
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
  copyBtn.innerHTML += '<span>复制全部</span>';
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const labels = values.map(val => {
      const opt = selectOptions.find(o => o.value === val || String(o.value) === String(val));
      return opt ? opt.label : String(val);
    });
    try {
      await navigator.clipboard.writeText(labels.join(', '));
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>已复制</span>';
      copyBtn.classList.add('ss-tags-popover-btn-success');
      setTimeout(() => {
        closeTagsPopover();
      }, 800);
    } catch {
      console.warn('复制失败');
    }
  });
  actions.appendChild(copyBtn);
  
  popover.appendChild(actions);
  
  // 定位
  const cellRect = cell.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.top = `${cellRect.bottom + 4}px`;
  popover.style.left = `${cellRect.left}px`;
  popover.style.zIndex = '10000';
  
  document.body.appendChild(popover);
  currentPopover = popover;
  
  // 调整位置确保在视口内
  const popoverRect = popover.getBoundingClientRect();
  if (popoverRect.right > window.innerWidth) {
    popover.style.left = `${window.innerWidth - popoverRect.width - 8}px`;
  }
  if (popoverRect.bottom > window.innerHeight) {
    popover.style.top = `${cellRect.top - popoverRect.height - 4}px`;
  }
  
  // 点击外部关闭 - 使用 mousedown 避免和当前点击事件冲突
  closeHandler = (e: Event) => {
    if (!popover.contains(e.target as Node)) {
      closeTagsPopover();
      onClose?.();
    }
  };
  
  // 延迟注册事件，确保当前点击事件完全处理完毕
  setTimeout(() => {
    document.addEventListener('mousedown', closeHandler!);
    document.addEventListener('scroll', closeHandler!, true);
  }, 50);
}

