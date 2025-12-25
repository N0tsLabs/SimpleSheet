/**
 * 历史记录管理器
 * 支持撤销/重做功能
 */

import { EventEmitter } from './EventEmitter';
import type { HistoryRecord, HistoryEvent } from '../types';

interface HistoryEvents {
  'undo': HistoryEvent;
  'redo': HistoryEvent;
  'change': { canUndo: boolean; canRedo: boolean };
}

export class HistoryManager extends EventEmitter<HistoryEvents> {
  /** 撤销栈 */
  private undoStack: HistoryRecord[] = [];
  
  /** 重做栈 */
  private redoStack: HistoryRecord[] = [];
  
  /** 最大历史记录数 */
  private maxSize: number;
  
  /** 是否正在执行撤销/重做（防止循环记录） */
  private isExecuting = false;
  
  /** 批量操作暂存 */
  private batchChanges: HistoryRecord['changes'] | null = null;

  constructor(maxSize = 100) {
    super();
    this.maxSize = maxSize;
  }

  /**
   * 记录变更
   */
  record(changes: HistoryRecord['changes']): void {
    if (this.isExecuting || changes.length === 0) return;
    
    // 如果正在批量操作中，暂存变更
    if (this.batchChanges !== null) {
      this.batchChanges.push(...changes);
      return;
    }
    
    this.pushRecord({
      changes,
      timestamp: Date.now(),
    });
  }

  /**
   * 开始批量操作
   */
  startBatch(): void {
    if (this.batchChanges === null) {
      this.batchChanges = [];
    }
  }

  /**
   * 结束批量操作
   */
  endBatch(): void {
    if (this.batchChanges !== null && this.batchChanges.length > 0) {
      this.pushRecord({
        changes: this.batchChanges,
        timestamp: Date.now(),
      });
    }
    this.batchChanges = null;
  }

  /**
   * 取消批量操作
   */
  cancelBatch(): void {
    this.batchChanges = null;
  }

  /**
   * 推入记录
   */
  private pushRecord(record: HistoryRecord): void {
    this.undoStack.push(record);
    
    // 超出最大记录数时移除最旧的
    while (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    
    // 新操作清空重做栈
    this.redoStack = [];
    
    this.emitChange();
  }

  /**
   * 撤销
   * @returns 需要应用的反向变更
   */
  undo(): HistoryRecord['changes'] | null {
    const record = this.undoStack.pop();
    if (!record) return null;
    
    // 生成反向变更
    const reverseChanges = record.changes.map(change => ({
      row: change.row,
      col: change.col,
      oldValue: change.newValue,
      newValue: change.oldValue,
    }));
    
    // 推入重做栈
    this.redoStack.push({
      changes: reverseChanges,
      timestamp: Date.now(),
    });
    
    this.isExecuting = true;
    
    this.emit('undo', {
      action: 'undo',
      changes: {
        type: 'batch',
        changes: reverseChanges,
      },
    });
    
    this.emitChange();
    this.isExecuting = false;
    
    // 返回反向变更，让调用者应用
    return reverseChanges;
  }

  /**
   * 重做
   * @returns 需要应用的变更
   */
  redo(): HistoryRecord['changes'] | null {
    const record = this.redoStack.pop();
    if (!record) return null;
    
    // 生成反向变更（恢复原操作）
    const reverseChanges = record.changes.map(change => ({
      row: change.row,
      col: change.col,
      oldValue: change.newValue,
      newValue: change.oldValue,
    }));
    
    // 推入撤销栈
    this.undoStack.push({
      changes: reverseChanges,
      timestamp: Date.now(),
    });
    
    this.isExecuting = true;
    
    this.emit('redo', {
      action: 'redo',
      changes: {
        type: 'batch',
        changes: reverseChanges,
      },
    });
    
    this.emitChange();
    this.isExecuting = false;
    
    // 返回反向变更，让调用者应用
    return reverseChanges;
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.batchChanges = null;
    this.emitChange();
  }

  /**
   * 设置最大历史记录数
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    while (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * 发送状态变更事件
   */
  private emitChange(): void {
    this.emit('change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }
}

