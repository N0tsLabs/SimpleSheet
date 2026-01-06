/**
 * 键盘管理器
 * 处理键盘快捷键和导航
 */

import { EventEmitter } from './EventEmitter';
import { addEvent } from '../utils/dom';

type KeyHandler = (e: KeyboardEvent) => void | boolean;

interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: KeyHandler;
  preventDefault?: boolean;
}

interface KeyboardEvents {
  'keydown': KeyboardEvent;
  'navigation': { direction: 'up' | 'down' | 'left' | 'right'; shift: boolean };
  'enter': { shift: boolean };
  'tab': { shift: boolean };
  'escape': void;
  'delete': void;
  'backspace': void;
  'copy': void;
  'cut': void;
  'paste': void;
  'undo': void;
  'redo': void;
  'selectAll': void;
  'home': { ctrl: boolean; shift: boolean };
  'end': { ctrl: boolean; shift: boolean };
}

export class KeyboardManager extends EventEmitter<KeyboardEvents> {
  private bindings: KeyBinding[] = [];
  private cleanup: (() => void) | null = null;
  private enabled = true;

  /**
   * 绑定到目标元素
   */
  attach(target: HTMLElement): void {
    this.detach();
    
    this.cleanup = addEvent(target, 'keydown', this.handleKeyDown.bind(this));
    this.setupDefaultBindings();
  }

  /**
   * 解除绑定
   */
  detach(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this.bindings = [];
  }

  /**
   * 启用/禁用键盘处理
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 注册快捷键
   */
  register(binding: KeyBinding): () => void {
    this.bindings.push(binding);
    return () => {
      const index = this.bindings.indexOf(binding);
      if (index > -1) {
        this.bindings.splice(index, 1);
      }
    };
  }

  /**
   * 设置默认快捷键绑定
   */
  private setupDefaultBindings(): void {
    // 方向键导航
    this.register({
      key: 'ArrowUp',
      handler: (e) => {
        this.emit('navigation', { direction: 'up', shift: e.shiftKey });
      },
      preventDefault: true,
    });
    
    this.register({
      key: 'ArrowDown',
      handler: (e) => {
        this.emit('navigation', { direction: 'down', shift: e.shiftKey });
      },
      preventDefault: true,
    });
    
    this.register({
      key: 'ArrowLeft',
      handler: (e) => {
        this.emit('navigation', { direction: 'left', shift: e.shiftKey });
      },
      preventDefault: true,
    });
    
    this.register({
      key: 'ArrowRight',
      handler: (e) => {
        this.emit('navigation', { direction: 'right', shift: e.shiftKey });
      },
      preventDefault: true,
    });

    // Enter
    this.register({
      key: 'Enter',
      handler: (e) => {
        this.emit('enter', { shift: e.shiftKey });
      },
      preventDefault: true,
    });

    // Tab
    this.register({
      key: 'Tab',
      handler: (e) => {
        this.emit('tab', { shift: e.shiftKey });
      },
      preventDefault: true,
    });

    // Escape
    this.register({
      key: 'Escape',
      handler: () => {
        this.emit('escape', undefined);
      },
    });

    // Delete
    this.register({
      key: 'Delete',
      handler: () => {
        this.emit('delete', undefined);
      },
    });

    // Backspace
    this.register({
      key: 'Backspace',
      handler: () => {
        this.emit('backspace', undefined);
      },
    });

    // Ctrl+C 复制
    this.register({
      key: 'c',
      ctrl: true,
      handler: () => {
        this.emit('copy', undefined);
      },
    });

    // Ctrl+X 剪切
    this.register({
      key: 'x',
      ctrl: true,
      handler: () => {
        this.emit('cut', undefined);
      },
    });

    // Ctrl+V 粘贴
    // 注意：不阻止默认行为，让浏览器触发原生 paste 事件
    // FilePasteHandler 可以通过 paste 事件接收文件
    this.register({
      key: 'v',
      ctrl: true,
      handler: () => {
        this.emit('paste', undefined);
      },
      preventDefault: false,
    });

    // Ctrl+Z 撤销
    this.register({
      key: 'z',
      ctrl: true,
      handler: () => {
        this.emit('undo', undefined);
      },
      preventDefault: true,
    });

    // Ctrl+Y / Ctrl+Shift+Z 重做
    this.register({
      key: 'y',
      ctrl: true,
      handler: () => {
        this.emit('redo', undefined);
      },
      preventDefault: true,
    });
    
    this.register({
      key: 'z',
      ctrl: true,
      shift: true,
      handler: () => {
        this.emit('redo', undefined);
      },
      preventDefault: true,
    });

    // Ctrl+A 全选
    this.register({
      key: 'a',
      ctrl: true,
      handler: () => {
        this.emit('selectAll', undefined);
      },
      preventDefault: true,
    });

    // Home
    this.register({
      key: 'Home',
      handler: (e) => {
        this.emit('home', { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
      },
      preventDefault: true,
    });

    // End
    this.register({
      key: 'End',
      handler: (e) => {
        this.emit('end', { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
      },
      preventDefault: true,
    });
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    
    this.emit('keydown', e);
    
    // 查找匹配的快捷键绑定
    for (const binding of this.bindings) {
      if (this.matchBinding(e, binding)) {
        const result = binding.handler(e);
        
        // 如果 handler 返回 false，不阻止默认行为
        if (result !== false && binding.preventDefault !== false) {
          e.preventDefault();
        }
        
        return;
      }
    }
  }

  /**
   * 检查事件是否匹配绑定
   */
  private matchBinding(e: KeyboardEvent, binding: KeyBinding): boolean {
    // 检查按键
    if (e.key.toLowerCase() !== binding.key.toLowerCase()) {
      return false;
    }
    
    // 检查修饰键
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    
    if (binding.ctrl && !ctrlOrMeta) return false;
    if (!binding.ctrl && ctrlOrMeta && binding.key.length === 1) return false;
    
    if (binding.shift && !e.shiftKey) return false;
    if (!binding.shift && e.shiftKey && binding.key.length === 1) return false;
    
    if (binding.alt && !e.altKey) return false;
    if (!binding.alt && e.altKey) return false;
    
    return true;
  }

  /**
   * 模拟按键
   */
  simulate(key: string, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): void {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: modifiers.ctrl,
      shiftKey: modifiers.shift,
      altKey: modifiers.alt,
      bubbles: true,
    });
    
    this.handleKeyDown(event);
  }
}

