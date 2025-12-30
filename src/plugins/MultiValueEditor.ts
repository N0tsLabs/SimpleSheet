/**
 * 多值编辑对话框
 * 用于编辑邮箱、手机号、链接等支持多值的字段
 */

import { createElement, setStyles, addEvent } from '../utils/dom';
import type { ColumnType } from '../types';

interface MultiValueEditorOptions {
  /** 字段类型 */
  type: ColumnType;
  /** 字段标题 */
  title: string;
  /** 当前值 */
  value: string[];
  /** 确认回调 */
  onConfirm: (values: string[]) => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 验证函数 */
  validate?: (value: string) => boolean | string;
  /** 占位符 */
  placeholder?: string;
}

const TYPE_CONFIG: Record<string, { placeholder: string; validate: (v: string) => boolean | string }> = {
  email: {
    placeholder: '请输入邮箱地址',
    validate: (v) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(v) || '请输入有效的邮箱地址';
    },
  },
  phone: {
    placeholder: '请输入手机号',
    validate: (v) => {
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(v) || '请输入有效的手机号';
    },
  },
  link: {
    placeholder: '请输入链接地址',
    validate: (v) => {
      try {
        new URL(v);
        return true;
      } catch {
        // 允许相对路径
        if (v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) {
          return true;
        }
        return '请输入有效的链接地址';
      }
    },
  },
};

export class MultiValueEditor {
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private options: MultiValueEditorOptions;
  private values: string[] = [];
  private cleanupFns: Array<() => void> = [];

  constructor(options: MultiValueEditorOptions) {
    this.options = options;
    this.values = [...(options.value || [])];
  }

  /**
   * 显示编辑器
   */
  show(): void {
    this.createDialog();
  }

  /**
   * 隐藏编辑器
   */
  hide(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
  }

  /**
   * 创建对话框
   */
  private createDialog(): void {
    // 遮罩层
    this.overlay = createElement('div', 'ss-mve-overlay');
    
    // 对话框
    this.dialog = createElement('div', 'ss-mve-dialog');
    
    // 头部
    const header = createElement('div', 'ss-mve-header');
    const title = createElement('span', 'ss-mve-title');
    title.textContent = `编辑${this.options.title}`;
    header.appendChild(title);
    
    const closeBtn = createElement('button', 'ss-mve-close');
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => {
      this.hide();
      this.options.onCancel?.();
    });
    header.appendChild(closeBtn);
    this.dialog.appendChild(header);

    // 内容区域
    const content = createElement('div', 'ss-mve-content');
    
    // 值列表
    const listContainer = createElement('div', 'ss-mve-list');
    this.renderValueList(listContainer);
    content.appendChild(listContainer);

    // 添加区域
    const addArea = createElement('div', 'ss-mve-add-area');
    const typeConfig = TYPE_CONFIG[this.options.type] || { placeholder: '请输入值', validate: () => true };
    
    const input = createElement('input', 'ss-mve-input') as HTMLInputElement;
    input.type = 'text';
    input.placeholder = this.options.placeholder || typeConfig.placeholder;
    addArea.appendChild(input);

    const addBtn = createElement('button', 'ss-mve-add-btn');
    addBtn.textContent = '添加';
    addBtn.addEventListener('click', () => this.addValue(input, listContainer));
    addArea.appendChild(addBtn);

    // 回车添加
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addValue(input, listContainer);
      }
    });

    // 粘贴支持（逗号分隔）
    input.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text');
      if (text && text.includes(',')) {
        e.preventDefault();
        const parts = text.split(',').map(s => s.trim()).filter(s => s);
        for (const part of parts) {
          this.values.push(part);
        }
        this.renderValueList(listContainer);
      }
    });

    content.appendChild(addArea);
    this.dialog.appendChild(content);

    // 底部按钮
    const footer = createElement('div', 'ss-mve-footer');
    
    const cancelBtn = createElement('button', 'ss-mve-btn ss-mve-btn-cancel');
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      this.hide();
      this.options.onCancel?.();
    });
    footer.appendChild(cancelBtn);

    const confirmBtn = createElement('button', 'ss-mve-btn ss-mve-btn-confirm');
    confirmBtn.textContent = '确定';
    confirmBtn.addEventListener('click', () => {
      this.options.onConfirm(this.values);
      this.hide();
    });
    footer.appendChild(confirmBtn);

    this.dialog.appendChild(footer);

    // 添加到页面
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // ESC 关闭
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        this.options.onCancel?.();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    this.cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown));

    // 聚焦输入框
    setTimeout(() => input.focus(), 100);
  }

  /**
   * 渲染值列表
   */
  private renderValueList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.values.length === 0) {
      const empty = createElement('div', 'ss-mve-empty');
      empty.textContent = '暂无数据，请添加';
      container.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.values.length; i++) {
      const item = this.createValueItem(i, container);
      container.appendChild(item);
    }
  }

  /**
   * 创建值项
   */
  private createValueItem(index: number, listContainer: HTMLElement): HTMLElement {
    const item = createElement('div', 'ss-mve-item');
    
    const input = createElement('input', 'ss-mve-item-input') as HTMLInputElement;
    input.type = 'text';
    input.value = this.values[index];
    input.addEventListener('change', () => {
      this.values[index] = input.value;
    });
    input.addEventListener('blur', () => {
      this.values[index] = input.value;
    });
    item.appendChild(input);

    // 复制按钮
    const copyBtn = createElement('button', 'ss-mve-item-btn ss-mve-item-copy');
    copyBtn.innerHTML = '📋';
    copyBtn.title = '复制';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(this.values[index]);
    });
    item.appendChild(copyBtn);

    // 删除按钮
    const deleteBtn = createElement('button', 'ss-mve-item-btn ss-mve-item-delete');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', () => {
      this.values.splice(index, 1);
      this.renderValueList(listContainer);
    });
    item.appendChild(deleteBtn);

    return item;
  }

  /**
   * 添加值
   */
  private addValue(input: HTMLInputElement, listContainer: HTMLElement): void {
    const value = input.value.trim();
    if (!value) return;

    // 验证
    const typeConfig = TYPE_CONFIG[this.options.type];
    const validate = this.options.validate || typeConfig?.validate;
    if (validate) {
      const result = validate(value);
      if (result !== true) {
        alert(typeof result === 'string' ? result : '输入格式不正确');
        return;
      }
    }

    // 检查重复
    if (this.values.includes(value)) {
      alert('该值已存在');
      return;
    }

    this.values.push(value);
    input.value = '';
    this.renderValueList(listContainer);
    input.focus();
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.hide();
  }
}

/**
 * 显示多值编辑器的便捷方法
 */
export function showMultiValueEditor(options: MultiValueEditorOptions): MultiValueEditor {
  const editor = new MultiValueEditor(options);
  editor.show();
  return editor;
}

