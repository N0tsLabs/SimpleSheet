/**
 * 自定义悬浮窗插件
 * 通用的悬浮窗组件，支持多种内容类型和自定义渲染
 */

import { createElement, setStyles } from '../utils/dom';
import type { ExpandPopoverConfig, PopoverAction, RowData, SelectOption } from '../types';

// 当前显示的悬浮窗
let currentPopover: HTMLElement | null = null;
let currentPopoverCell: HTMLElement | null = null;
let currentPopoverConfig: PopoverShowConfig | null = null;
let closeHandler: ((e: Event) => void) | null = null;
let onDblClickCallback: ((cell: HTMLElement) => void) | null = null;

/**
 * 悬浮窗显示配置（用于键盘导航时重新显示）
 */
export interface PopoverShowConfig {
  type: 'file' | 'link' | 'email' | 'phone' | 'select' | 'text' | 'custom' | string;
  column?: any;
  cellValue?: any;
  rowData?: RowData;
  expandPopover?: ExpandPopoverConfig;
}

/**
 * 获取当前悬浮窗的配置信息
 */
export function getCurrentPopoverConfig(): PopoverShowConfig | null {
  return currentPopoverConfig;
}

/**
 * 获取当前悬浮窗关联的单元格
 */
export function getCurrentPopoverCell(): HTMLElement | null {
  return currentPopoverCell;
}

/**
 * 设置双击悬浮窗时的回调
 */
export function setPopoverDblClickHandler(callback: (cell: HTMLElement) => void): void {
  onDblClickCallback = callback;
}

/**
 * 关闭当前悬浮窗
 */
export function closePopover(): void {
  if (currentPopover) {
    currentPopover.remove();
    currentPopover = null;
  }
  if (closeHandler) {
    document.removeEventListener('mousedown', closeHandler);
    document.removeEventListener('scroll', closeHandler, true);
    closeHandler = null;
  }
  // 清除配置信息
  currentPopoverCell = null;
  currentPopoverConfig = null;
}

/**
 * 获取对比色
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
 * 获取标签颜色
 */
function getTagColors(opt: { color?: string; textColor?: string }, index: number): { bg: string; text: string } {
  if (opt.color) {
    return {
      bg: opt.color,
      text: opt.textColor || getContrastColor(opt.color),
    };
  }
  const presetColors = [
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
  return presetColors[index % presetColors.length];
}

/**
 * 显示悬浮窗
 */
export function showPopover(
  cell: HTMLElement,
  value: any,
  rowData: RowData,
  config: ExpandPopoverConfig,
  showConfig?: PopoverShowConfig
): void {
  // 先关闭已有的
  closePopover();

  // 保存当前悬浮窗的配置信息（用于键盘导航时重新显示）
  currentPopoverCell = cell;
  currentPopoverConfig = showConfig || {
    type: config.type || 'custom',
    cellValue: value,
    rowData,
    expandPopover: config
  };

  const {
    type,
    width,
    maxWidth = 300,
    title,
    showClose = false,
    content,
    valueField = 'value',
    displayField,
    tagsField = 'tags',
    tagOptions = [],
    multiple: isMultiple = false,
    onChange,
    render,
    actions = [],
    closeOnBlur = true,
    dblClickToEdit = false,
  } = config;

  // 获取实际值
  const actualValue = valueField ? (rowData as Record<string, any>)[valueField] : value;
  const displayText = displayField
    ? (rowData as Record<string, any>)[displayField]
    : String(actualValue ?? '');

  // 创建悬浮窗
  const popover = createElement('div', 'ss-custom-popover');
  popover.setAttribute('data-custom-popover', 'true');
  setStyles(popover, {
    width: width ? `${width}px` : 'auto',
    maxWidth: `${maxWidth}px`,
  });

  // 继承主题 - 从多个来源获取，sheetRoot 最先因为主题实际设置在那里
  const sheetRoot = cell.closest('.ss-root');
  const theme = sheetRoot?.getAttribute('data-theme') ||
                 document.documentElement.getAttribute('data-theme') ||
                 document.body.getAttribute('data-theme');
  if (theme) {
    popover.setAttribute('data-theme', theme);
    // 直接设置暗色主题的样式，确保 CSS 选择器不生效时也能正确显示
    if (theme === 'dark') {
      popover.style.background = '#2a2a3e';
      popover.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
    }
  }

  // 标题栏
  if (title || showClose) {
    const header = createElement('div', 'ss-popover-header');
    if (title) {
      const titleEl = createElement('div', 'ss-popover-title');
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }
    if (showClose) {
      const closeBtn = createElement('button', 'ss-popover-close');
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', () => closePopover());
      header.appendChild(closeBtn);
    }
    popover.appendChild(header);
  }

  // 内容区域
  const contentEl = createElement('div', 'ss-popover-content');
  popover.appendChild(contentEl);

  // 根据类型渲染内容
  switch (type) {
    case 'text': {
      const textEl = createElement('div', 'ss-popover-text');
      textEl.textContent = content || displayText;
      contentEl.appendChild(textEl);
      break;
    }

    case 'html': {
      const htmlEl = createElement('div', 'ss-popover-html');
      htmlEl.innerHTML = content || displayText;
      contentEl.appendChild(htmlEl);
      break;
    }

    case 'link':
    case 'email':
    case 'phone': {
      const iconMap = { link: '🔗', email: '✉️', phone: '📞' };
      const actionMap: Record<string, () => void> = {
        link: () => window.open(actualValue, '_blank', 'noopener,noreferrer'),
        email: () => window.location.href = `mailto:${actualValue}`,
        phone: () => window.location.href = `tel:${actualValue}`,
      };

      // 显示内容
      const infoRow = createElement('div', 'ss-popover-info-row');
      const icon = createElement('span', 'ss-popover-icon');
      icon.textContent = iconMap[type];
      const text = createElement('span', 'ss-popover-text');
      text.textContent = displayText;
      text.title = actualValue;
      infoRow.appendChild(icon);
      infoRow.appendChild(text);
      contentEl.appendChild(infoRow);

      // 操作按钮
      const actionsRow = createElement('div', 'ss-popover-actions');

      // 复制按钮
      const copyBtn = createElement('button', 'ss-popover-btn');
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
      copyBtn.title = '复制';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(actualValue);
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          copyBtn.classList.add('ss-popover-btn-success');
          setTimeout(() => {
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
            copyBtn.classList.remove('ss-popover-btn-success');
          }, 1500);
        } catch {
          console.warn('复制失败');
        }
      });
      actionsRow.appendChild(copyBtn);

      // 主要操作按钮
      if (actionMap[type]) {
        const actionBtn = createElement('button', 'ss-popover-btn ss-popover-btn-primary');
        const btnIconMap = { link: '↗️', email: '📧', phone: '📱' };
        actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
        actionBtn.title = type === 'link' ? '在新窗口打开' : (type === 'email' ? '发送邮件' : '拨打电话');
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          actionMap[type]!();
          closePopover();
        });
        actionsRow.appendChild(actionBtn);
      }

      contentEl.appendChild(actionsRow);
      break;
    }

    case 'tags': {
      const rawTags = (rowData as Record<string, any>)[tagsField];
      const tags = Array.isArray(rawTags)
        ? rawTags
        : (rawTags ? String(rawTags).split(',').map(t => t.trim()) : []);

      // 如果有 onChange 回调，显示为可选择模式
      if (onChange) {
        // 可选择模式（多选/单选）
        const selectedValues = [...tags];
        const header = createElement('div', 'ss-popover-header');
        const titleEl = createElement('div', 'ss-popover-title');
        titleEl.textContent = isMultiple ? '选择标签' : '选择';
        header.appendChild(titleEl);
        const countEl = createElement('span', 'ss-popover-count');
        countEl.textContent = `${selectedValues.length} 个已选`;
        header.appendChild(countEl);
        popover.querySelector('.ss-popover-header')?.appendChild(header);

        const itemsEl = createElement('div', 'ss-popover-tags-items');
        contentEl.appendChild(itemsEl);

        for (const opt of tagOptions) {
          const isSelected = selectedValues.some(val =>
            opt.value === val || String(opt.value) === String(val)
          );

          const itemEl = createElement('div', 'ss-popover-tag-item');
          if (isSelected) {
            itemEl.classList.add('ss-popover-tag-item-selected');
          }

          const tagEl = createElement('span', 'ss-popover-tag');
          const colors = getTagColors(opt, tagOptions.indexOf(opt));
          tagEl.textContent = opt.label;
          tagEl.style.backgroundColor = colors.bg;
          tagEl.style.color = colors.text;
          itemEl.appendChild(tagEl);

          // 选中标记
          if (isSelected) {
            const check = createElement('span', 'ss-popover-tag-check');
            check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            itemEl.appendChild(check);
          }

          // 点击切换选中状态
          itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = selectedValues.findIndex(val =>
              opt.value === val || String(opt.value) === String(val)
            );

            if (idx >= 0) {
              if (isMultiple) {
                selectedValues.splice(idx, 1);
                itemEl.classList.remove('ss-popover-tag-item-selected');
                const check = itemEl.querySelector('.ss-popover-tag-check');
                check?.remove();
              }
              // 单选模式下不允许取消选中
            } else {
              if (isMultiple) {
                selectedValues.push(opt.value);
                itemEl.classList.add('ss-popover-tag-item-selected');
                const check = createElement('span', 'ss-popover-tag-check');
                check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                itemEl.appendChild(check);
              } else {
                // 单选模式
                selectedValues.length = 0;
                selectedValues.push(opt.value);
                // 移除其他选中状态
                itemsEl.querySelectorAll('.ss-popover-tag-item').forEach((item, i) => {
                  if (tagOptions[i].value !== opt.value) {
                    item.classList.remove('ss-popover-tag-item-selected');
                    item.querySelector('.ss-popover-tag-check')?.remove();
                  }
                });
                itemEl.classList.add('ss-popover-tag-item-selected');
                // 移除已添加的 check（如果有）
                const existingCheck = itemEl.querySelector('.ss-popover-tag-check');
                if (!existingCheck) {
                  const check = createElement('span', 'ss-popover-tag-check');
                  check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                  itemEl.appendChild(check);
                }
              }
            }

            // 更新计数
            countEl.textContent = `${selectedValues.length} 个已选`;

            // 触发回调
            const finalValue = isMultiple ? selectedValues : (selectedValues.length > 0 ? selectedValues[0] : null);
            onChange(finalValue);
          });

          itemsEl.appendChild(itemEl);
        }
      } else {
        // 只读模式：仅显示已有标签
        if (tags.length > 0) {
          const tagsContainer = createElement('div', 'ss-popover-tags');
          tags.forEach((tag: any) => {
            const option = tagOptions.find((o: any) => o.value === tag || String(o.value) === String(tag));
            const tagEl = createElement('span', 'ss-popover-tag');
            if (option) {
              const colors = getTagColors(option, tagOptions.indexOf(option));
              tagEl.textContent = option.label;
              tagEl.style.backgroundColor = colors.bg;
              tagEl.style.color = colors.text;
            } else {
              tagEl.textContent = String(tag);
              tagEl.classList.add('ss-popover-tag-plain');
            }
            tagsContainer.appendChild(tagEl);
          });
          contentEl.appendChild(tagsContainer);
        }
      }
      break;
    }

    case 'custom': {
      if (render) {
        const customContent = render(actualValue, rowData);
        if (typeof customContent === 'string') {
          const wrapper = createElement('div', 'ss-popover-custom');
          wrapper.innerHTML = customContent;
          contentEl.appendChild(wrapper);
        } else if (customContent instanceof HTMLElement) {
          contentEl.appendChild(customContent);
        }
      }
      break;
    }
  }

  // 额外操作按钮
  if (actions.length > 0) {
    const extraActions = createElement('div', 'ss-popover-extra-actions');
    actions.forEach((action: PopoverAction) => {
      const btn = createElement('button', `ss-popover-btn${action.primary ? ' ss-popover-btn-primary' : ''}`);
      if (action.icon) {
        btn.innerHTML = action.icon;
      }
      btn.appendChild(document.createTextNode(action.label));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        action.action(actualValue, closePopover);
      });
      extraActions.appendChild(btn);
    });
    contentEl.appendChild(extraActions);
  }

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

  // 双击悬浮窗进入编辑模式
  if (dblClickToEdit) {
    popover.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      closePopover();
      if (onDblClickCallback) {
        onDblClickCallback(cell);
      }
    });
    popover.style.cursor = 'pointer';
  }

  // 点击外部关闭
  if (closeOnBlur) {
    closeHandler = (e: Event) => {
      if (!popover.contains(e.target as Node)) {
        closePopover();
      }
    };
    setTimeout(() => {
      document.addEventListener('mousedown', closeHandler!);
      document.addEventListener('scroll', closeHandler!, true);
    }, 50);
  }
}

/**
 * 隐藏悬浮窗
 */
export function hidePopover(): void {
  closePopover();
}
