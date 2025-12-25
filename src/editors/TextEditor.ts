/**
 * 文本编辑器 - 支持 Alt+Enter 换行
 */

import { BaseEditor } from './BaseEditor';
import { createElement, setStyles } from '../utils/dom';

export class TextEditor extends BaseEditor {
  private textarea: HTMLTextAreaElement | null = null;
  private initialHeight = 32;

  protected createElement(): HTMLElement {
    const wrapper = this.createWrapper('ss-editor ss-text-editor');
    
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'ss-editor-input ss-editor-textarea';
    this.textarea.spellcheck = false;
    this.textarea.autocomplete = 'off';
    this.textarea.rows = 1;
    
    // 监听键盘事件处理 Alt+Enter 换行
    this.textarea.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 自动调整高度
    this.textarea.addEventListener('input', this.autoResize.bind(this));
    
    wrapper.appendChild(this.textarea);
    return wrapper;
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Alt+Enter 换行
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.textarea) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        // 在光标位置插入换行符
        this.textarea.value = value.substring(0, start) + '\n' + value.substring(end);
        
        // 移动光标到换行符后面
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
        
        // 调整高度
        this.autoResize();
      }
    }
  }

  /**
   * 自动调整高度
   */
  private autoResize(): void {
    if (!this.textarea) return;
    
    // 重置高度以获取正确的 scrollHeight
    this.textarea.style.height = 'auto';
    
    // 设置新高度
    const newHeight = Math.max(this.initialHeight, this.textarea.scrollHeight);
    this.textarea.style.height = `${newHeight}px`;
    
    // 同时调整 wrapper 高度
    if (this.element) {
      this.element.style.height = `${newHeight}px`;
    }
  }

  protected setValue(value: any): void {
    if (this.textarea) {
      // 处理换行符显示
      this.textarea.value = value ?? '';
      // 延迟调整高度，确保 DOM 已更新
      setTimeout(() => this.autoResize(), 0);
    }
  }

  getValue(): any {
    return this.textarea?.value ?? '';
  }

  focus(): void {
    if (this.textarea) {
      this.textarea.focus();
      // 不全选，把光标放到末尾（Excel 风格）
      const len = this.textarea.value.length;
      this.textarea.setSelectionRange(len, len);
    }
  }

  destroy(): void {
    this.textarea = null;
    super.destroy();
  }
}
