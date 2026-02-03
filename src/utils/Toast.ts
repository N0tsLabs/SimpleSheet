/**
 * 提示组件
 * 用于显示各种操作提示信息
 */

import { createElement } from './dom';

export type ToastType = 'info' | 'warning' | 'error' | 'success';

export interface ToastOptions {
  /** 提示类型 */
  type?: ToastType;
  /** 提示文本 */
  message: string;
  /** 持续时间（毫秒），0 表示不自动关闭 */
  duration?: number;
  /** 位置 */
  position?: 'top' | 'bottom' | 'center';
}

let toastContainer: HTMLElement | null = null;
interface ToastItem {
  id: number;
  element: HTMLElement;
  timer?: number;
}

let toastQueue: ToastItem[] = [];
let toastIdCounter = 0;

/**
 * 初始化提示容器
 */
function initToastContainer(): void {
  if (toastContainer) return;
  
  toastContainer = createElement('div', 'ss-toast-container');
  document.body.appendChild(toastContainer);
}

/**
 * 显示提示
 */
export function showToast(options: ToastOptions): () => void {
  initToastContainer();
  if (!toastContainer) return () => {};
  
  const id = ++toastIdCounter;
  const toast = createElement('div', 'ss-toast');
  toast.setAttribute('data-toast-id', String(id));
  
  // 设置类型
  if (options.type) {
    toast.classList.add(`ss-toast-${options.type}`);
  }
  
  // 设置位置
  const position = options.position || 'top';
  toastContainer.className = `ss-toast-container ss-toast-${position}`;
  
  // 设置内容
  const icon = getIcon(options.type || 'info');
  toast.innerHTML = `
    <span class="ss-toast-icon">${icon}</span>
    <span class="ss-toast-message">${options.message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // 触发动画
  requestAnimationFrame(() => {
    toast.classList.add('ss-toast-show');
  });
  
  // 添加到队列
  const toastItem: ToastItem = { id, element: toast };
  
  // 自动关闭
  const duration = options.duration !== undefined ? options.duration : 3000;
  if (duration > 0) {
    toastItem.timer = window.setTimeout(() => {
      hideToast(id);
    }, duration);
  }
  
  toastQueue.push(toastItem);
  
  // 返回关闭函数
  return () => hideToast(id);
}

/**
 * 隐藏提示
 */
function hideToast(id: number): void {
  const index = toastQueue.findIndex(item => item.id === id);
  if (index === -1) return;
  
  const item = toastQueue[index];
  
  // 清除定时器
  if (item.timer) {
    clearTimeout(item.timer);
  }
  
  // 移除动画
  item.element.classList.remove('ss-toast-show');
  item.element.classList.add('ss-toast-hide');
  
  // 延迟移除 DOM
  setTimeout(() => {
    item.element.remove();
    toastQueue.splice(index, 1);
    
    // 如果没有提示了，移除容器
    if (toastQueue.length === 0 && toastContainer) {
      toastContainer.remove();
      toastContainer = null;
    }
  }, 300);
}

/**
 * 获取图标
 */
function getIcon(type: ToastType): string {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  };
  return icons[type] || icons.info;
}

/**
 * 快捷方法
 */
export const Toast = {
  info: (message: string, duration?: number) => showToast({ type: 'info', message, duration }),
  warning: (message: string, duration?: number) => showToast({ type: 'warning', message, duration }),
  error: (message: string, duration?: number) => showToast({ type: 'error', message, duration }),
  success: (message: string, duration?: number) => showToast({ type: 'success', message, duration }),
};
