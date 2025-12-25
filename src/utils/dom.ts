/**
 * DOM 操作工具函数
 */

/**
 * 创建 DOM 元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attributes?: Record<string, string>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

/**
 * 添加事件监听器（支持清理）
 */
export function addEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Window | Document,
  type: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  el.addEventListener(type, handler as EventListener, options);
  return () => el.removeEventListener(type, handler as EventListener, options);
}

/**
 * 批量添加事件监听器
 */
export function addEvents(
  el: HTMLElement | Window | Document,
  events: Record<string, EventListener>,
  options?: boolean | AddEventListenerOptions
): () => void {
  const cleanups: Array<() => void> = [];
  for (const [type, handler] of Object.entries(events)) {
    el.addEventListener(type, handler, options);
    cleanups.push(() => el.removeEventListener(type, handler, options));
  }
  return () => cleanups.forEach(fn => fn());
}

/**
 * 设置元素样式
 */
export function setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && value !== null) {
      (el.style as any)[key] = value;
    }
  }
}

/**
 * 获取元素相对于指定父元素的位置
 */
export function getRelativePosition(
  el: HTMLElement,
  parent: HTMLElement
): { top: number; left: number } {
  const elRect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  return {
    top: elRect.top - parentRect.top,
    left: elRect.left - parentRect.left,
  };
}

/**
 * 获取鼠标相对于元素的位置
 */
export function getMousePosition(
  e: MouseEvent,
  el: HTMLElement
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

/**
 * 检查元素是否在可视区域内
 */
export function isElementInViewport(el: HTMLElement, container: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  return (
    elRect.top >= containerRect.top &&
    elRect.left >= containerRect.left &&
    elRect.bottom <= containerRect.bottom &&
    elRect.right <= containerRect.right
  );
}

/**
 * 滚动元素到可视区域
 */
export function scrollIntoView(
  el: HTMLElement,
  container: HTMLElement,
  options?: { behavior?: ScrollBehavior }
): void {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  const offsetTop = elRect.top - containerRect.top + container.scrollTop;
  const offsetLeft = elRect.left - containerRect.left + container.scrollLeft;
  
  const behavior = options?.behavior || 'smooth';
  
  // 垂直滚动
  if (elRect.top < containerRect.top) {
    container.scrollTo({ top: offsetTop, behavior });
  } else if (elRect.bottom > containerRect.bottom) {
    container.scrollTo({
      top: offsetTop - containerRect.height + elRect.height,
      behavior,
    });
  }
  
  // 水平滚动
  if (elRect.left < containerRect.left) {
    container.scrollTo({ left: offsetLeft, behavior });
  } else if (elRect.right > containerRect.right) {
    container.scrollTo({
      left: offsetLeft - containerRect.width + elRect.width,
      behavior,
    });
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * RAF 节流
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      fn.apply(this, args);
      rafId = null;
    });
  };
}

/**
 * 类名工具
 */
export function classNames(...args: Array<string | undefined | null | false | Record<string, boolean>>): string {
  const classes: string[] = [];
  
  for (const arg of args) {
    if (!arg) continue;
    
    if (typeof arg === 'string') {
      classes.push(arg);
    } else if (typeof arg === 'object') {
      for (const [key, value] of Object.entries(arg)) {
        if (value) classes.push(key);
      }
    }
  }
  
  return classes.join(' ');
}

