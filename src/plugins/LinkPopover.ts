/**
 * 链接操作悬浮窗
 * 点击链接/邮箱/电话时显示操作菜单
 */

import { createElement } from '../utils/dom';

export interface LinkPopoverOptions {
  type: 'link' | 'email' | 'phone';
  value: string;
  displayText?: string;
  cell: HTMLElement;
  onClose?: () => void;
}

let currentPopover: HTMLElement | null = null;
let closeHandler: ((e: Event) => void) | null = null;

/**
 * 关闭当前悬浮窗
 */
export function closeLinkPopover(): void {
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
 * 显示链接操作悬浮窗
 */
export function showLinkPopover(options: LinkPopoverOptions): void {
  // 先关闭已有的
  closeLinkPopover();
  
  const { type, value, displayText, cell, onClose } = options;
  
  // 创建悬浮窗
  const popover = createElement('div', 'ss-link-popover');
  
  // 显示内容
  const content = createElement('div', 'ss-link-popover-content');
  const icon = createElement('span', 'ss-link-popover-icon');
  const text = createElement('span', 'ss-link-popover-text');
  
  if (type === 'email') {
    icon.textContent = '✉️';
    text.textContent = value;
  } else if (type === 'phone') {
    icon.textContent = '📞';
    text.textContent = value;
  } else {
    icon.textContent = '🔗';
    text.textContent = displayText || value;
    text.title = value;
  }
  
  content.appendChild(icon);
  content.appendChild(text);
  popover.appendChild(content);
  
  // 操作按钮
  const actions = createElement('div', 'ss-link-popover-actions');
  
  // 复制按钮
  const copyBtn = createElement('button', 'ss-link-popover-btn');
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
  copyBtn.title = '复制';
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      copyBtn.classList.add('ss-link-popover-btn-success');
      setTimeout(() => {
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
        copyBtn.classList.remove('ss-link-popover-btn-success');
      }, 1500);
    } catch {
      console.warn('复制失败');
    }
  });
  actions.appendChild(copyBtn);
  
  // 打开/跳转按钮
  if (type === 'link') {
    const openBtn = createElement('button', 'ss-link-popover-btn ss-link-popover-btn-primary');
    openBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
    openBtn.title = '在新窗口打开';
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(value, '_blank', 'noopener,noreferrer');
      closeLinkPopover();
    });
    actions.appendChild(openBtn);
  } else if (type === 'email') {
    const mailBtn = createElement('button', 'ss-link-popover-btn ss-link-popover-btn-primary');
    mailBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>';
    mailBtn.title = '发送邮件';
    mailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `mailto:${value}`;
      closeLinkPopover();
    });
    actions.appendChild(mailBtn);
  } else if (type === 'phone') {
    const callBtn = createElement('button', 'ss-link-popover-btn ss-link-popover-btn-primary');
    callBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
    callBtn.title = '拨打电话';
    callBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `tel:${value}`;
      closeLinkPopover();
    });
    actions.appendChild(callBtn);
  }
  
  popover.appendChild(actions);
  
  // 定位
  const cellRect = cell.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.top = `${cellRect.bottom + 4}px`;
  popover.style.left = `${cellRect.left}px`;
  popover.style.zIndex = '10000';

  // 继承主题 - sheetRoot 最先因为主题实际设置在那里
  const sheetRoot = cell.closest('.ss-root');
  const theme = sheetRoot?.getAttribute('data-theme') ||
                 document.documentElement.getAttribute('data-theme') ||
                 document.body.getAttribute('data-theme');
  if (theme) {
    popover.setAttribute('data-theme', theme);
    // 直接设置暗色主题的样式，确保 CSS 选择器不生效时也能正确显示
    if (theme === 'dark') {
      popover.style.background = '#2a2a3e';
      popover.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)';
    }
  }

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
      closeLinkPopover();
      onClose?.();
    }
  };
  
  // 延迟注册事件，确保当前点击事件完全处理完毕
  setTimeout(() => {
    document.addEventListener('mousedown', closeHandler!);
    document.addEventListener('scroll', closeHandler!, true);
  }, 50);
}

