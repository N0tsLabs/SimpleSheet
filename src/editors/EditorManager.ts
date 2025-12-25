/**
 * 编辑器管理器
 * 负责编辑器的创建、管理、销毁
 */

import { EventEmitter } from '../core/EventEmitter';
import type { CellEditor, CellEditorClass, Column, RowData, EditEvent } from '../types';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { createElement, setStyles } from '../utils/dom';

interface EditorEvents {
  'start': EditEvent;
  'change': EditEvent;
  'end': EditEvent;
  'cancel': EditEvent;
}

interface ActiveEditor {
  row: number;
  col: number;
  editor: CellEditor;
  container: HTMLElement;
  originalValue: any;
}

export class EditorManager extends EventEmitter<EditorEvents> {
  /** 当前活动的编辑器 */
  private activeEditor: ActiveEditor | null = null;
  
  /** 编辑器类型映射 */
  private editorTypes: Map<string, CellEditorClass> = new Map();
  
  /** 编辑器容器 */
  private editorLayer: HTMLElement | null = null;

  constructor() {
    super();
    this.registerDefaultEditors();
  }

  /**
   * 注册默认编辑器
   */
  private registerDefaultEditors(): void {
    this.editorTypes.set('text', TextEditor);
    this.editorTypes.set('number', NumberEditor);
  }

  /**
   * 注册自定义编辑器
   */
  registerEditor(type: string, editorClass: CellEditorClass): void {
    this.editorTypes.set(type, editorClass);
  }

  /**
   * 设置编辑器层
   */
  setEditorLayer(layer: HTMLElement): void {
    this.editorLayer = layer;
  }

  /**
   * 开始编辑
   */
  startEdit(
    row: number,
    col: number,
    value: any,
    rowData: RowData,
    column: Column,
    cellRect: DOMRect,
    containerRect: DOMRect
  ): boolean {
    // 如果列只读，不允许编辑
    if (column.readonly) {
      return false;
    }
    
    // 如果已有编辑器，先结束编辑
    if (this.activeEditor) {
      this.endEdit();
    }
    
    if (!this.editorLayer) {
      return false;
    }
    
    // 获取编辑器类
    const EditorClass = column.editor || this.getEditorClass(column.type || 'text');
    if (!EditorClass) {
      return false;
    }
    
    // 创建编辑器容器
    const container = createElement('div', 'ss-editor-container');
    setStyles(container, {
      position: 'absolute',
      top: `${cellRect.top - containerRect.top}px`,
      left: `${cellRect.left - containerRect.left}px`,
      width: `${cellRect.width}px`,
      height: `${cellRect.height}px`,
      zIndex: '100',
    });
    
    this.editorLayer.appendChild(container);
    
    // 创建编辑器实例
    const editor = new EditorClass();
    editor.create(container, value, rowData, column);
    
    this.activeEditor = {
      row,
      col,
      editor,
      container,
      originalValue: value,
    };
    
    // 延迟聚焦，确保 DOM 已更新
    requestAnimationFrame(() => {
      editor.focus();
    });
    
    this.emit('start', {
      row,
      col,
      oldValue: value,
      rowData,
      column,
    });
    
    return true;
  }

  /**
   * 结束编辑（保存）
   */
  endEdit(): { row: number; col: number; value: any } | null {
    if (!this.activeEditor) {
      return null;
    }
    
    const { row, col, editor, container, originalValue } = this.activeEditor;
    
    // 验证
    const validation = editor.validate?.() ?? true;
    if (validation !== true) {
      console.warn('Validation failed:', validation);
      // 可以在这里显示错误提示
    }
    
    const newValue = editor.getValue();
    
    // 销毁编辑器
    editor.destroy();
    container.remove();
    
    const result = { row, col, value: newValue };
    
    this.emit('end', {
      row,
      col,
      oldValue: originalValue,
      newValue,
      rowData: {},
      column: {} as Column,
    });
    
    this.activeEditor = null;
    
    return result;
  }

  /**
   * 取消编辑
   */
  cancelEdit(): void {
    if (!this.activeEditor) {
      return;
    }
    
    const { row, col, editor, container, originalValue } = this.activeEditor;
    
    // 销毁编辑器
    editor.destroy();
    container.remove();
    
    this.emit('cancel', {
      row,
      col,
      oldValue: originalValue,
      rowData: {},
      column: {} as Column,
    });
    
    this.activeEditor = null;
  }

  /**
   * 是否正在编辑
   */
  isEditing(): boolean {
    return this.activeEditor !== null;
  }

  /**
   * 获取当前编辑的位置
   */
  getEditingPosition(): { row: number; col: number } | null {
    if (!this.activeEditor) {
      return null;
    }
    return {
      row: this.activeEditor.row,
      col: this.activeEditor.col,
    };
  }

  /**
   * 更新编辑器位置
   */
  updatePosition(cellRect: DOMRect, containerRect: DOMRect): void {
    if (!this.activeEditor) return;
    
    setStyles(this.activeEditor.container, {
      top: `${cellRect.top - containerRect.top}px`,
      left: `${cellRect.left - containerRect.left}px`,
      width: `${cellRect.width}px`,
      height: `${cellRect.height}px`,
    });
  }

  /**
   * 获取编辑器类
   */
  private getEditorClass(type: string): CellEditorClass | undefined {
    return this.editorTypes.get(type);
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.cancelEdit();
    this.editorLayer = null;
  }
}

