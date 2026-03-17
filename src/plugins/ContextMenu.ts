/**
 * 右键菜单插件
 */

import { createElement, setStyles, addEvent } from '../utils/dom';
import type { CellPosition, SelectionRange } from '../types';
import { hidePopover } from './CustomPopover';

export interface MenuItem {
  /** 菜单项标识 */
  key?: string;
  /** 显示文本 */
  label: string;
  /** 动态获取标签（优先级高于 label） */
  getLabel?: (context: MenuContext) => string;
  /** 图标（可选） */
  icon?: string;
  /** 快捷键提示 */
  shortcut?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 分隔线 */
  type?: 'divider';
  /** 子菜单 */
  children?: MenuItem[];
  /** 点击回调 */
  action?: (context: MenuContext) => void;
}

export interface MenuContext {
  /** 点击位置 */
  position: CellPosition | null;
  /** 当前选区 */
  selection: SelectionRange[];
  /** 选中的单元格 */
  selectedCells: CellPosition[];
  /** 原始鼠标事件 */
  originalEvent: MouseEvent;
  /** 点击区域类型 */
  clickArea?: 'cell' | 'header' | 'rowNumber' | 'corner';
  /** 如果点击表头，包含列索引 */
  headerColIndex?: number;
  /** 如果点击行号，包含行索引 */
  rowNumberIndex?: number;
}

interface ContextMenuOptions {
  /** 菜单项 */
  items: MenuItem[];
  /** 菜单打开前的回调，可以动态修改菜单项 */
  onBeforeOpen?: (items: MenuItem[], context: MenuContext) => MenuItem[];
}

export class ContextMenu {
  private container: HTMLElement | null = null;
  private menuElement: HTMLElement | null = null;
  private options: ContextMenuOptions;
  private currentContext: MenuContext | null = null;
  private cleanupFns: Array<() => void> = [];
  private subMenus: HTMLElement[] = [];
  private isShowing: boolean = false;

  constructor(options: ContextMenuOptions) {
    this.options = options;
    this.createMenuElement();
  }

  /**
   * 创建菜单 DOM 元素
   */
  private createMenuElement(): void {
    this.menuElement = createElement('div', 'ss-context-menu');
    this.menuElement.style.display = 'none';
    document.body.appendChild(this.menuElement);

    // 点击外部关闭菜单
    this.cleanupFns.push(
      addEvent(document, 'click', (e) => {
        // 检查是否点击在菜单或子菜单内
        const isInsideMenu = this.menuElement?.contains(e.target as Node) || 
          this.subMenus.some(sub => sub.contains(e.target as Node));
        
        // 如果正在显示菜单，延迟检查，避免立即隐藏刚显示的菜单
        if (this.isShowing) {
          setTimeout(() => {
            const isInsideMenuDelayed = this.menuElement?.contains(e.target as Node) || 
              this.subMenus.some(sub => sub.contains(e.target as Node));
            if (!isInsideMenuDelayed) {
              this.hide();
            }
          }, 50);
          return;
        }
        if (!isInsideMenu) {
          this.hide();
        }
      }),
      addEvent(document, 'contextmenu', (e) => {
        // 如果正在显示菜单，忽略这次事件，避免立即隐藏刚显示的菜单
        if (this.isShowing) {
          e.stopPropagation();
          return;
        }
        // 如果右键点击的不是菜单本身，才隐藏菜单
        if (!this.menuElement?.contains(e.target as Node)) {
          this.hide();
        }
      }),
      addEvent(window, 'resize', () => {
        this.hide();
      }),
      addEvent(window, 'scroll', () => {
        this.hide();
      }, true)
    );
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement): void {
    this.container = container;
  }

  /**
   * 同步表格主题
   */
  private syncTheme(): void {
    if (!this.menuElement || !this.container) return;
    
    // 查找表格根元素（.ss-root）
    const sheetRoot = this.container.querySelector('.ss-root') as HTMLElement;
    if (!sheetRoot) return;
    
    // 获取表格的主题
    const theme = sheetRoot.getAttribute('data-theme');
    
    // 应用主题到菜单
    if (theme) {
      this.menuElement.setAttribute('data-theme', theme);
    } else {
      // 如果没有设置主题，检查是否是自动模式
      // 自动模式下，移除 data-theme 属性，让 CSS 变量自动生效
      this.menuElement.removeAttribute('data-theme');
    }
  }

  /**
   * 显示菜单
   */
  show(x: number, y: number, context: MenuContext): void {
    // 先关闭悬浮窗
    hidePopover();

    if (!this.menuElement) {
      console.warn('ContextMenu: menuElement is null');
      return;
    }

    // 先设置标志，防止全局监听器立即隐藏菜单
    this.isShowing = true;
    this.currentContext = context;
    this.hideSubMenus();

    // 动态获取菜单项
    let items = this.options.items;
    if (this.options.onBeforeOpen) {
      items = this.options.onBeforeOpen([...items], context);
    }

    // 检查是否有菜单项
    if (!items || items.length === 0) {
      console.warn('ContextMenu: no menu items to display');
      this.isShowing = false;
      return;
    }

    // 先隐藏菜单，确保状态正确
    this.menuElement.style.display = 'none';
    
    // 同步表格主题
    this.syncTheme();
    
    // 渲染菜单
    this.renderMenu(this.menuElement, items);

    // 先设置位置，再显示菜单（避免位置计算错误）
    setStyles(this.menuElement, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      zIndex: '10000',
    });

    // 使用 requestAnimationFrame 确保 DOM 已更新后再计算位置
    requestAnimationFrame(() => {
      if (!this.menuElement) return;
      
      // 计算位置，防止超出视口
      const menuRect = this.menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let finalX = x;
      let finalY = y;

      if (x + menuRect.width > viewportWidth) {
        finalX = viewportWidth - menuRect.width - 10;
      }

      if (y + menuRect.height > viewportHeight) {
        finalY = viewportHeight - menuRect.height - 10;
      }

      setStyles(this.menuElement!, {
        left: `${Math.max(10, finalX)}px`,
        top: `${Math.max(10, finalY)}px`,
      });
      
      // 标记菜单已显示完成（延迟一点，确保菜单完全显示）
      setTimeout(() => {
        this.isShowing = false;
      }, 200);
    });
  }

  /**
   * 隐藏菜单
   */
  hide(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
    this.hideSubMenus();
    this.currentContext = null;
    this.isShowing = false;
  }

  /**
   * 隐藏所有子菜单
   */
  private hideSubMenus(): void {
    this.subMenus.forEach(sub => sub.remove());
    this.subMenus = [];
  }

  /**
   * 渲染菜单项
   */
  private renderMenu(container: HTMLElement, items: MenuItem[]): void {
    container.innerHTML = '';

    for (const item of items) {
      if (item.hidden) continue;

      if (item.type === 'divider') {
        const divider = createElement('div', 'ss-menu-divider');
        container.appendChild(divider);
        continue;
      }

      const menuItem = createElement('div', 'ss-menu-item');
      
      if (item.disabled) {
        menuItem.classList.add('ss-menu-item-disabled');
      }

      // 图标
      if (item.icon) {
        const icon = createElement('span', 'ss-menu-icon');
        icon.innerHTML = item.icon;
        menuItem.appendChild(icon);
      }

      // 文本（支持动态标签）
      const label = createElement('span', 'ss-menu-label');
      const labelText = item.getLabel && this.currentContext
        ? item.getLabel(this.currentContext)
        : item.label;
      label.textContent = labelText;
      menuItem.appendChild(label);

      // 快捷键
      if (item.shortcut) {
        const shortcut = createElement('span', 'ss-menu-shortcut');
        shortcut.textContent = item.shortcut;
        menuItem.appendChild(shortcut);
      }

      // 子菜单箭头
      if (item.children && item.children.length > 0) {
        const arrow = createElement('span', 'ss-menu-arrow');
        arrow.innerHTML = '▶';
        menuItem.appendChild(arrow);
        menuItem.classList.add('ss-menu-item-has-children');

        // 鼠标悬停显示子菜单
        menuItem.addEventListener('mouseenter', () => {
          if (item.disabled) return;
          this.showSubMenu(menuItem, item.children!);
        });
      }

      // 点击事件
      if (!item.disabled && item.action) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.currentContext) {
            item.action!(this.currentContext);
          }
          this.hide();
        });
      }

      container.appendChild(menuItem);
    }
  }

  /**
   * 显示子菜单
   */
  private showSubMenu(parentItem: HTMLElement, items: MenuItem[]): void {
    this.hideSubMenus();

    const subMenu = createElement('div', 'ss-context-menu ss-submenu');
    
    // 同步主题到子菜单
    if (this.menuElement) {
      const theme = this.menuElement.getAttribute('data-theme');
      if (theme) {
        subMenu.setAttribute('data-theme', theme);
      } else {
        subMenu.removeAttribute('data-theme');
      }
    }
    
    this.renderMenu(subMenu, items);

    document.body.appendChild(subMenu);
    this.subMenus.push(subMenu);

    // 计算子菜单位置
    const parentRect = parentItem.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let left = parentRect.right;
    
    // 如果右侧空间不够，显示在左侧
    subMenu.style.display = 'block';
    const subMenuRect = subMenu.getBoundingClientRect();
    
    if (left + subMenuRect.width > viewportWidth) {
      left = parentRect.left - subMenuRect.width;
    }

    setStyles(subMenu, {
      left: `${left}px`,
      top: `${parentRect.top}px`,
    });
  }

  /**
   * 更新菜单项
   */
  setItems(items: MenuItem[]): void {
    this.options.items = items;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.hide();
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.menuElement?.remove();
    this.menuElement = null;
  }
}

/**
 * 创建默认菜单项
 */
export function createDefaultMenuItems(handlers: {
  onCopy?: (context: MenuContext) => void;
  onCut?: (context: MenuContext) => void;
  onPaste?: (context: MenuContext) => void;
  onInsertRowAbove?: (context: MenuContext) => void;
  onInsertRowBelow?: (context: MenuContext) => void;
  onDeleteRow?: (context: MenuContext) => void;
  onInsertColumnLeft?: (context: MenuContext) => void;
  onInsertColumnRight?: (context: MenuContext) => void;
  onDeleteColumn?: (context: MenuContext) => void;
  onClearContent?: (context: MenuContext) => void;
  onCopyColumn?: (context: MenuContext) => void;
  onCopyRow?: (context: MenuContext) => void;
  onHideColumn?: (context: MenuContext) => void;
  onShowAllColumns?: (context: MenuContext) => void;
  onHideRow?: (context: MenuContext) => void;
  onShowAllRows?: (context: MenuContext) => void;
  onSortAsc?: (context: MenuContext) => void;
  onSortDesc?: (context: MenuContext) => void;
}): MenuItem[] {
  return [
    {
      key: 'copy',
      label: '复制',
      icon: '📋',
      shortcut: 'Ctrl+C',
      action: (context) => handlers.onCopy?.(context),
    },
    {
      key: 'cut',
      label: '剪切',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      action: (context) => handlers.onCut?.(context),
    },
    {
      key: 'paste',
      label: '粘贴',
      icon: '📄',
      shortcut: 'Ctrl+V',
      action: (context) => handlers.onPaste?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'insertRow',
      label: '插入行',
      icon: '➕',
      children: [
        {
          key: 'insertRowAbove',
          label: '在上方插入',
          action: (context) => handlers.onInsertRowAbove?.(context),
        },
        {
          key: 'insertRowBelow',
          label: '在下方插入',
          action: (context) => handlers.onInsertRowBelow?.(context),
        },
      ],
    },
    {
      key: 'insertColumn',
      label: '插入列',
      icon: '➕',
      children: [
        {
          key: 'insertColumnLeft',
          label: '在左侧插入',
          action: (context) => handlers.onInsertColumnLeft?.(context),
        },
        {
          key: 'insertColumnRight',
          label: '在右侧插入',
          action: (context) => handlers.onInsertColumnRight?.(context),
        },
      ],
    },
    { type: 'divider', label: '' },
    {
      key: 'deleteRow',
      label: '删除行',
      icon: '🗑️',
      action: (context) => handlers.onDeleteRow?.(context),
    },
    {
      key: 'deleteColumn',
      label: '删除列',
      icon: '🗑️',
      action: (context) => handlers.onDeleteColumn?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'clearContent',
      label: '清除内容',
      icon: '🧹',
      shortcut: 'Delete',
      action: (context) => handlers.onClearContent?.(context),
    },
  ];
}

/**
 * 创建表头专用菜单项
 */
export function createHeaderMenuItems(handlers: {
  onCopy?: (context: MenuContext) => void;
  onInsertColumnLeft?: (context: MenuContext) => void;
  onInsertColumnRight?: (context: MenuContext) => void;
  onDeleteColumn?: (context: MenuContext) => void;
  onHideColumn?: (context: MenuContext) => void;
  onShowAllColumns?: (context: MenuContext) => void;
  onSortAsc?: (context: MenuContext) => void;
  onSortDesc?: (context: MenuContext) => void;
  onEditColumn?: (context: MenuContext) => void;
  onSetColumnReadonly?: (context: MenuContext, readonly: boolean) => void;
  getColumnReadonly?: (context: MenuContext) => boolean;
}): MenuItem[] {
  return [
    {
      key: 'editColumn',
      label: '编辑列配置',
      icon: '⚙️',
      action: (context) => handlers.onEditColumn?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'toggleReadonly',
      label: '设置为只读',
      icon: '🔒',
      action: (context) => {
        const currentReadonly = handlers.getColumnReadonly?.(context) ?? false;
        handlers.onSetColumnReadonly?.(context, !currentReadonly);
      },
      // 动态更新标签
      getLabel: (context) => {
        const isReadonly = handlers.getColumnReadonly?.(context) ?? false;
        return isReadonly ? '取消只读' : '设置为只读';
      },
    },
    { type: 'divider', label: '' },
    {
      key: 'copyColumn',
      label: '复制整列',
      icon: '📋',
      action: (context) => handlers.onCopy?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'sortAsc',
      label: '升序排序',
      icon: '↑',
      action: (context) => handlers.onSortAsc?.(context),
    },
    {
      key: 'sortDesc',
      label: '降序排序',
      icon: '↓',
      action: (context) => handlers.onSortDesc?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'insertColumnLeft',
      label: '在左侧插入列',
      icon: '⬅️',
      action: (context) => handlers.onInsertColumnLeft?.(context),
    },
    {
      key: 'insertColumnRight',
      label: '在右侧插入列',
      icon: '➡️',
      action: (context) => handlers.onInsertColumnRight?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'hideColumn',
      label: '隐藏列',
      icon: '👁️‍🗨️',
      action: (context) => handlers.onHideColumn?.(context),
    },
    {
      key: 'showAllColumns',
      label: '显示所有隐藏列',
      icon: '👁️',
      action: (context) => handlers.onShowAllColumns?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'deleteColumn',
      label: '删除列',
      icon: '🗑️',
      action: (context) => handlers.onDeleteColumn?.(context),
    },
  ];
}

/**
 * 创建行号专用菜单项
 */
export function createRowNumberMenuItems(handlers: {
  onCopy?: (context: MenuContext) => void;
  onInsertRowAbove?: (context: MenuContext) => void;
  onInsertRowBelow?: (context: MenuContext) => void;
  onDeleteRow?: (context: MenuContext) => void;
  onHideRow?: (context: MenuContext) => void;
  onShowAllRows?: (context: MenuContext) => void;
}): MenuItem[] {
  return [
    {
      key: 'copyRow',
      label: '复制整行',
      icon: '📋',
      action: (context) => handlers.onCopy?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'insertRowAbove',
      label: '在上方插入行',
      icon: '⬆️',
      action: (context) => handlers.onInsertRowAbove?.(context),
    },
    {
      key: 'insertRowBelow',
      label: '在下方插入行',
      icon: '⬇️',
      action: (context) => handlers.onInsertRowBelow?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'hideRow',
      label: '隐藏行',
      icon: '👁️‍🗨️',
      action: (context) => handlers.onHideRow?.(context),
    },
    {
      key: 'showAllRows',
      label: '显示所有隐藏行',
      icon: '👁️',
      action: (context) => handlers.onShowAllRows?.(context),
    },
    { type: 'divider', label: '' },
    {
      key: 'deleteRow',
      label: '删除行',
      icon: '🗑️',
      action: (context) => handlers.onDeleteRow?.(context),
    },
  ];
}

