/**
 * 搜索替换插件
 */

import { EventEmitter } from '../core/EventEmitter';
import type { CellPosition, Column, RowData } from '../types';

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 是否全字匹配 */
  wholeWord?: boolean;
  /** 是否使用正则表达式 */
  regex?: boolean;
  /** 搜索范围（列索引数组） */
  columns?: number[];
}

/**
 * 搜索结果
 */
export interface SearchResult {
  row: number;
  col: number;
  value: any;
  matchStart: number;
  matchEnd: number;
}

interface SearchEvents {
  'search:result': { results: SearchResult[]; currentIndex: number };
  'search:replace': { replaced: number };
}

export class Search extends EventEmitter<SearchEvents> {
  private results: SearchResult[] = [];
  private currentIndex = -1;
  private lastKeyword = '';
  private lastOptions: SearchOptions = {};

  private data: RowData[] = [];
  private columns: Column[] = [];

  /**
   * 设置数据源
   */
  setData(data: RowData[], columns: Column[]): void {
    this.data = data;
    this.columns = columns;
  }

  /**
   * 搜索
   */
  search(keyword: string, options: SearchOptions = {}): SearchResult[] {
    this.results = [];
    this.currentIndex = -1;
    this.lastKeyword = keyword;
    this.lastOptions = options;

    if (!keyword) {
      this.emit('search:result', { results: [], currentIndex: -1 });
      return [];
    }

    const {
      caseSensitive = false,
      wholeWord = false,
      regex = false,
      columns,
    } = options;

    // 构建搜索模式
    let pattern: RegExp;
    try {
      let patternStr = regex ? keyword : this.escapeRegex(keyword);
      if (wholeWord) {
        patternStr = `\\b${patternStr}\\b`;
      }
      pattern = new RegExp(patternStr, caseSensitive ? 'g' : 'gi');
    } catch (e) {
      // 无效的正则表达式
      this.emit('search:result', { results: [], currentIndex: -1 });
      return [];
    }

    // 搜索数据
    for (let row = 0; row < this.data.length; row++) {
      const rowData = this.data[row];
      
      for (let col = 0; col < this.columns.length; col++) {
        // 如果指定了列范围，检查是否在范围内
        if (columns && !columns.includes(col)) {
          continue;
        }

        const column = this.columns[col];
        const value = rowData[column.key];
        
        if (value === null || value === undefined) {
          continue;
        }

        const str = String(value);
        let match: RegExpExecArray | null;
        
        // 重置正则的 lastIndex
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(str)) !== null) {
          this.results.push({
            row,
            col,
            value,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });
          
          // 非全局模式下避免无限循环
          if (!pattern.global) break;
        }
      }
    }

    if (this.results.length > 0) {
      this.currentIndex = 0;
    }

    this.emit('search:result', { results: this.results, currentIndex: this.currentIndex });
    return this.results;
  }

  /**
   * 获取搜索结果
   */
  getResults(): SearchResult[] {
    return this.results;
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 获取当前结果
   */
  getCurrentResult(): SearchResult | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.results.length) {
      return null;
    }
    return this.results[this.currentIndex];
  }

  /**
   * 下一个结果
   */
  next(): SearchResult | null {
    if (this.results.length === 0) return null;
    
    this.currentIndex = (this.currentIndex + 1) % this.results.length;
    this.emit('search:result', { results: this.results, currentIndex: this.currentIndex });
    return this.results[this.currentIndex];
  }

  /**
   * 上一个结果
   */
  prev(): SearchResult | null {
    if (this.results.length === 0) return null;
    
    this.currentIndex = (this.currentIndex - 1 + this.results.length) % this.results.length;
    this.emit('search:result', { results: this.results, currentIndex: this.currentIndex });
    return this.results[this.currentIndex];
  }

  /**
   * 跳转到指定索引
   */
  goTo(index: number): SearchResult | null {
    if (index < 0 || index >= this.results.length) return null;
    
    this.currentIndex = index;
    this.emit('search:result', { results: this.results, currentIndex: this.currentIndex });
    return this.results[this.currentIndex];
  }

  /**
   * 替换当前
   */
  replaceCurrent(
    replacement: string,
    setCellValue: (row: number, col: number, value: any) => void
  ): boolean {
    const current = this.getCurrentResult();
    if (!current) return false;

    const column = this.columns[current.col];
    const rowData = this.data[current.row];
    const originalValue = String(rowData[column.key]);
    
    // 构建替换后的值
    const newValue = 
      originalValue.substring(0, current.matchStart) +
      replacement +
      originalValue.substring(current.matchEnd);

    // 设置新值
    setCellValue(current.row, current.col, newValue);

    // 更新数据并重新搜索
    rowData[column.key] = newValue;
    
    // 移除当前结果并重新搜索以更新索引
    this.search(this.lastKeyword, this.lastOptions);
    
    this.emit('search:replace', { replaced: 1 });
    return true;
  }

  /**
   * 替换全部
   */
  replaceAll(
    replacement: string,
    setCellValue: (row: number, col: number, value: any) => void
  ): number {
    if (this.results.length === 0) return 0;

    const {
      caseSensitive = false,
      wholeWord = false,
      regex = false,
    } = this.lastOptions;

    // 构建替换模式
    let patternStr = regex ? this.lastKeyword : this.escapeRegex(this.lastKeyword);
    if (wholeWord) {
      patternStr = `\\b${patternStr}\\b`;
    }
    const pattern = new RegExp(patternStr, caseSensitive ? 'g' : 'gi');

    // 按单元格分组替换
    const cellMap = new Map<string, SearchResult[]>();
    for (const result of this.results) {
      const key = `${result.row}:${result.col}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, []);
      }
      cellMap.get(key)!.push(result);
    }

    let replacedCount = 0;

    for (const [, results] of cellMap) {
      const { row, col } = results[0];
      const column = this.columns[col];
      const rowData = this.data[row];
      const originalValue = String(rowData[column.key]);
      
      // 使用正则全局替换
      const newValue = originalValue.replace(pattern, replacement);
      
      if (newValue !== originalValue) {
        setCellValue(row, col, newValue);
        rowData[column.key] = newValue;
        replacedCount += results.length;
      }
    }

    // 清空搜索结果
    this.results = [];
    this.currentIndex = -1;
    
    this.emit('search:replace', { replaced: replacedCount });
    this.emit('search:result', { results: [], currentIndex: -1 });
    
    return replacedCount;
  }

  /**
   * 清除搜索
   */
  clear(): void {
    this.results = [];
    this.currentIndex = -1;
    this.lastKeyword = '';
    this.emit('search:result', { results: [], currentIndex: -1 });
  }

  /**
   * 获取需要高亮的单元格（去重）
   */
  getHighlightCells(): Set<string> {
    const cells = new Set<string>();
    for (const result of this.results) {
      cells.add(`${result.row}:${result.col}`);
    }
    return cells;
  }

  /**
   * 获取当前高亮的单元格
   */
  getCurrentCell(): string | null {
    const current = this.getCurrentResult();
    if (!current) return null;
    return `${current.row}:${current.col}`;
  }

  /**
   * 检查单元格是否是搜索匹配
   */
  isSearchMatch(row: number, col: number): boolean {
    return this.results.some(r => r.row === row && r.col === col);
  }

  /**
   * 检查单元格是否是当前搜索结果
   */
  isCurrentMatch(row: number, col: number): boolean {
    const current = this.getCurrentResult();
    return current !== null && current.row === row && current.col === col;
  }

  /**
   * 转义正则特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

