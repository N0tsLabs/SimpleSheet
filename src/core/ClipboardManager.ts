/**
 * 剪贴板管理器
 * 处理复制、剪切、粘贴操作
 */

import { EventEmitter } from './EventEmitter';
import { parseCSV, toCSV } from '../utils/helpers';

interface ClipboardData {
  values: any[][];
  text: string;
}

interface ClipboardEvents {
  'copy': ClipboardData;
  'cut': ClipboardData;
  'paste': { values: any[][] };
}

export class ClipboardManager extends EventEmitter<ClipboardEvents> {
  /** 内部剪贴板数据 */
  private internalData: ClipboardData | null = null;
  
  /** 是否是剪切操作 */
  private isCut = false;

  /**
   * 复制数据
   */
  async copy(values: any[][]): Promise<void> {
    const text = toCSV(values);
    
    this.internalData = { values, text };
    this.isCut = false;
    
    // 写入系统剪贴板
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // 回退到 execCommand
      this.fallbackCopy(text);
    }
    
    this.emit('copy', this.internalData);
  }

  /**
   * 剪切数据
   */
  async cut(values: any[][]): Promise<void> {
    const text = toCSV(values);
    
    this.internalData = { values, text };
    this.isCut = true;
    
    // 写入系统剪贴板
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      this.fallbackCopy(text);
    }
    
    this.emit('cut', this.internalData);
  }

  /**
   * 粘贴数据
   */
  async paste(): Promise<any[][] | null> {
    let text: string;
    
    // 从系统剪贴板读取
    try {
      text = await navigator.clipboard.readText();
    } catch (error) {
      // 如果无法访问系统剪贴板，使用内部数据
      if (this.internalData) {
        const values = this.internalData.values;
        
        // 如果是剪切操作，清除内部数据
        if (this.isCut) {
          this.internalData = null;
          this.isCut = false;
        }
        
        this.emit('paste', { values });
        return values;
      }
      return null;
    }
    
    // 解析剪贴板文本
    const values = parseCSV(text);
    
    if (values.length === 0) {
      return null;
    }
    
    // 如果是剪切操作且文本匹配，清除内部数据
    if (this.isCut && this.internalData?.text === text) {
      this.internalData = null;
      this.isCut = false;
    }
    
    this.emit('paste', { values });
    return values;
  }

  /**
   * 检查是否有数据可粘贴
   */
  hasData(): boolean {
    return this.internalData !== null;
  }

  /**
   * 检查是否是剪切操作
   */
  isCutOperation(): boolean {
    return this.isCut;
  }

  /**
   * 清除内部剪贴板
   */
  clear(): void {
    this.internalData = null;
    this.isCut = false;
  }

  /**
   * 获取内部剪贴板数据
   */
  getInternalData(): ClipboardData | null {
    return this.internalData;
  }

  /**
   * 回退的复制方法（使用 execCommand）
   */
  private fallbackCopy(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
    } catch (error) {
      console.warn('Fallback copy failed:', error);
    }
    
    document.body.removeChild(textarea);
  }
}

