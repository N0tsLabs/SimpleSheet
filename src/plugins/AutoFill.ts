/**
 * 自动填充插件
 * 支持拖拽填充柄来填充数据
 */

import { EventEmitter } from '../core/EventEmitter';
import type { CellPosition, SelectionRange } from '../types';
import { createElement, addEvent, setStyles } from '../utils/dom';
import { normalizeRange } from '../utils/helpers';

/** 填充模式 */
export type FillMode = 'copy' | 'series' | 'formatOnly' | 'noFormat';

interface AutoFillEvents {
  'fill:start': { range: SelectionRange };
  'fill:move': { targetRange: SelectionRange };
  'fill:end': { sourceRange: SelectionRange; targetRange: SelectionRange; direction: FillDirection; mode: FillMode };
}

type FillDirection = 'down' | 'up' | 'right' | 'left';

interface AutoFillOptions {
  /** 获取单元格值 */
  getCellValue: (row: number, col: number) => any;
  /** 设置单元格值 */
  setCellValue: (row: number, col: number, value: any) => void;
  /** 获取单元格位置 */
  getCellRect: (row: number, col: number) => DOMRect | null;
  /** 根据坐标获取单元格 */
  getCellFromPoint: (x: number, y: number) => CellPosition | null;
  /** 获取当前选区 */
  getSelection: () => SelectionRange | null;
  /** 最大行数 */
  maxRow: number;
  /** 最大列数 */
  maxCol: number;
}

export class AutoFill extends EventEmitter<AutoFillEvents> {
  private container: HTMLElement | null = null;
  private options: AutoFillOptions;
  private handle: HTMLElement | null = null;
  private preview: HTMLElement | null = null;
  private optionsMenu: HTMLElement | null = null;
  private isDragging = false;
  private sourceRange: SelectionRange | null = null;
  private targetEnd: CellPosition | null = null;
  private lastFillInfo: {
    source: SelectionRange;
    target: SelectionRange;
    direction: FillDirection;
    originalValues: any[][];
  } | null = null;
  private currentMode: FillMode = 'copy';
  private cleanupFns: Array<() => void> = [];

  constructor(options: AutoFillOptions) {
    super();
    this.options = options;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement, selectionLayer: HTMLElement): void {
    this.container = container;

    // 创建填充手柄
    this.handle = createElement('div', 'ss-fill-handle');
    this.handle.style.display = 'none';
    selectionLayer.appendChild(this.handle);

    // 创建预览层
    this.preview = createElement('div', 'ss-fill-preview');
    this.preview.style.display = 'none';
    selectionLayer.appendChild(this.preview);

    // 创建填充选项菜单
    this.optionsMenu = createElement('div', 'ss-fill-options-menu');
    this.optionsMenu.style.display = 'none';
    this.optionsMenu.innerHTML = `
      <div class="ss-fill-option" data-mode="copy">
        <span class="ss-fill-option-icon">📋</span>
        <span>复制单元格</span>
      </div>
      <div class="ss-fill-option" data-mode="series">
        <span class="ss-fill-option-icon">🔢</span>
        <span>填充序列</span>
      </div>
      <div class="ss-fill-option-divider"></div>
      <div class="ss-fill-option" data-mode="formatOnly">
        <span class="ss-fill-option-icon">🎨</span>
        <span>仅填充格式</span>
      </div>
      <div class="ss-fill-option" data-mode="noFormat">
        <span class="ss-fill-option-icon">📝</span>
        <span>不带格式填充</span>
      </div>
    `;
    document.body.appendChild(this.optionsMenu);

    // 监听手柄拖拽
    this.cleanupFns.push(
      addEvent(this.handle, 'mousedown', this.handleMouseDown.bind(this) as EventListener)
    );

    // 全局鼠标事件
    this.cleanupFns.push(
      addEvent(document, 'mousemove', this.handleMouseMove.bind(this) as EventListener),
      addEvent(document, 'mouseup', this.handleMouseUp.bind(this) as EventListener)
    );

    // 监听选项菜单点击
    this.cleanupFns.push(
      addEvent(this.optionsMenu, 'click', this.handleOptionClick.bind(this) as EventListener)
    );

    // 点击其他地方关闭菜单
    this.cleanupFns.push(
      addEvent(document, 'mousedown', this.handleDocumentClick.bind(this) as EventListener)
    );
  }

  /**
   * 卸载
   */
  unmount(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.handle?.remove();
    this.preview?.remove();
    this.optionsMenu?.remove();
    this.handle = null;
    this.preview = null;
    this.optionsMenu = null;
    this.container = null;
  }

  /**
   * 更新手柄位置
   */
  updateHandlePosition(range: SelectionRange | null): void {
    if (!this.handle || !range) {
      if (this.handle) {
        this.handle.style.display = 'none';
      }
      return;
    }

    const normalized = normalizeRange(range);
    const cellRect = this.options.getCellRect(normalized.end.row, normalized.end.col);
    
    if (!cellRect || !this.container) {
      this.handle.style.display = 'none';
      return;
    }

    const containerRect = this.container.getBoundingClientRect();
    
    // 计算手柄在容器内的位置（相对于容器）
    // cellRect 是视口坐标，需要转换为相对于容器的坐标
    const handleSize = 10;
    const handleOffset = handleSize / 2;
    
    const left = cellRect.right - containerRect.left - handleOffset;
    const top = cellRect.bottom - containerRect.top - handleOffset;
    
    setStyles(this.handle, {
      display: 'block',
      left: `${left}px`,
      top: `${top}px`,
    });
  }

  /**
   * 隐藏手柄
   */
  hideHandle(): void {
    if (this.handle) {
      this.handle.style.display = 'none';
    }
  }

  /**
   * 更新边界
   */
  updateBounds(maxRow: number, maxCol: number): void {
    this.options.maxRow = maxRow;
    this.options.maxCol = maxCol;
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const selection = this.options.getSelection();
    if (!selection) return;

    this.isDragging = true;
    this.sourceRange = selection;
    this.targetEnd = null;

    document.body.classList.add('ss-filling');

    this.emit('fill:start', { range: selection });
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.sourceRange || !this.container) return;

    const containerRect = this.container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    const cell = this.options.getCellFromPoint(x, y);
    if (!cell) return;

    this.targetEnd = cell;

    // 计算填充方向和范围
    const normalized = normalizeRange(this.sourceRange);
    const targetRange = this.calculateTargetRange(normalized, cell);

    if (targetRange) {
      this.showPreview(targetRange);
      this.emit('fill:move', { targetRange });
    }
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging || !this.sourceRange || !this.targetEnd) {
      this.isDragging = false;
      this.hidePreview();
      document.body.classList.remove('ss-filling');
      return;
    }

    const normalized = normalizeRange(this.sourceRange);
    const targetRange = this.calculateTargetRange(normalized, this.targetEnd);

    if (targetRange) {
      const direction = this.getDirection(normalized, this.targetEnd);
      if (direction) {
        // 保存原始值用于切换填充模式
        this.saveOriginalValues(targetRange);
        
        // 保存填充信息
        this.lastFillInfo = {
          source: normalized,
          target: targetRange,
          direction,
          originalValues: this.getTargetValues(targetRange),
        };
        
        // 默认使用复制填充
        this.currentMode = 'copy';
        this.performFill(normalized, targetRange, direction, 'copy');
        
        // 显示选项菜单
        this.showOptionsMenu(e.clientX, e.clientY);
        
        this.emit('fill:end', {
          sourceRange: normalized,
          targetRange,
          direction,
          mode: 'copy',
        });
      }
    }

    this.isDragging = false;
    this.sourceRange = null;
    this.targetEnd = null;
    this.hidePreview();
    document.body.classList.remove('ss-filling');
  }

  /**
   * 获取目标区域的值
   */
  private getTargetValues(range: SelectionRange): any[][] {
    const normalized = normalizeRange(range);
    const values: any[][] = [];
    for (let row = normalized.start.row; row <= normalized.end.row; row++) {
      const rowValues: any[] = [];
      for (let col = normalized.start.col; col <= normalized.end.col; col++) {
        rowValues.push(this.options.getCellValue(row, col));
      }
      values.push(rowValues);
    }
    return values;
  }

  /**
   * 保存原始值
   */
  private saveOriginalValues(range: SelectionRange): void {
    if (this.lastFillInfo) {
      this.lastFillInfo.originalValues = this.getTargetValues(range);
    }
  }

  /**
   * 显示选项菜单
   */
  private showOptionsMenu(x: number, y: number): void {
    if (!this.optionsMenu) return;
    
    setStyles(this.optionsMenu, {
      display: 'block',
      left: `${x}px`,
      top: `${y}px`,
    });
    
    // 确保菜单不超出视口
    const rect = this.optionsMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.optionsMenu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.optionsMenu.style.top = `${y - rect.height}px`;
    }
    
    // 高亮当前选中的模式
    this.updateMenuHighlight();
  }

  /**
   * 隐藏选项菜单
   */
  private hideOptionsMenu(): void {
    if (this.optionsMenu) {
      this.optionsMenu.style.display = 'none';
    }
  }

  /**
   * 更新菜单高亮
   */
  private updateMenuHighlight(): void {
    if (!this.optionsMenu) return;
    
    const options = this.optionsMenu.querySelectorAll('.ss-fill-option');
    options.forEach(opt => {
      const mode = (opt as HTMLElement).dataset.mode;
      opt.classList.toggle('ss-fill-option-active', mode === this.currentMode);
    });
  }

  /**
   * 处理选项点击
   */
  private handleOptionClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest('.ss-fill-option');
    if (!target) return;
    
    const mode = (target as HTMLElement).dataset.mode as FillMode;
    if (!mode || !this.lastFillInfo) return;
    
    // 如果模式改变了，重新执行填充
    if (mode !== this.currentMode) {
      this.currentMode = mode;
      
      // 先恢复原始值
      this.restoreOriginalValues();
      
      // 再用新模式填充
      this.performFill(
        this.lastFillInfo.source,
        this.lastFillInfo.target,
        this.lastFillInfo.direction,
        mode
      );
      
      this.updateMenuHighlight();
    }
    
    this.hideOptionsMenu();
  }

  /**
   * 恢复原始值
   */
  private restoreOriginalValues(): void {
    if (!this.lastFillInfo) return;
    
    const { target, originalValues } = this.lastFillInfo;
    const normalized = normalizeRange(target);
    
    for (let row = normalized.start.row; row <= normalized.end.row; row++) {
      for (let col = normalized.start.col; col <= normalized.end.col; col++) {
        const rowIdx = row - normalized.start.row;
        const colIdx = col - normalized.start.col;
        if (originalValues[rowIdx] && originalValues[rowIdx][colIdx] !== undefined) {
          this.options.setCellValue(row, col, originalValues[rowIdx][colIdx]);
        }
      }
    }
  }

  /**
   * 处理文档点击（关闭菜单）
   */
  private handleDocumentClick(e: MouseEvent): void {
    if (!this.optionsMenu) return;
    
    const target = e.target as HTMLElement;
    if (!this.optionsMenu.contains(target) && this.optionsMenu.style.display === 'block') {
      // 点击菜单外部，关闭菜单并清除填充信息
      this.hideOptionsMenu();
      this.lastFillInfo = null;
    }
  }

  /**
   * 计算目标范围
   */
  private calculateTargetRange(source: SelectionRange, target: CellPosition): SelectionRange | null {
    const direction = this.getDirection(source, target);
    if (!direction) return null;

    switch (direction) {
      case 'down':
        return {
          start: { row: source.end.row + 1, col: source.start.col },
          end: { row: Math.min(target.row, this.options.maxRow - 1), col: source.end.col },
        };
      case 'up':
        return {
          start: { row: Math.max(target.row, 0), col: source.start.col },
          end: { row: source.start.row - 1, col: source.end.col },
        };
      case 'right':
        return {
          start: { row: source.start.row, col: source.end.col + 1 },
          end: { row: source.end.row, col: Math.min(target.col, this.options.maxCol - 1) },
        };
      case 'left':
        return {
          start: { row: source.start.row, col: Math.max(target.col, 0) },
          end: { row: source.end.row, col: source.start.col - 1 },
        };
    }
  }

  /**
   * 获取填充方向
   */
  private getDirection(source: SelectionRange, target: CellPosition): FillDirection | null {
    // 优先判断垂直方向
    if (target.row > source.end.row && target.col >= source.start.col && target.col <= source.end.col) {
      return 'down';
    }
    if (target.row < source.start.row && target.col >= source.start.col && target.col <= source.end.col) {
      return 'up';
    }
    // 水平方向
    if (target.col > source.end.col && target.row >= source.start.row && target.row <= source.end.row) {
      return 'right';
    }
    if (target.col < source.start.col && target.row >= source.start.row && target.row <= source.end.row) {
      return 'left';
    }
    return null;
  }

  /**
   * 检测数字序列的步长
   */
  private detectStep(values: any[]): number | null {
    if (values.length < 2) return null;
    
    // 检查是否都是数字
    const nums = values.map(v => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        if (!isNaN(n)) return n;
      }
      return null;
    });
    
    if (nums.some(n => n === null)) return null;
    
    // 计算步长
    const step = (nums[1] as number) - (nums[0] as number);
    
    // 验证步长是否一致
    for (let i = 2; i < nums.length; i++) {
      if ((nums[i] as number) - (nums[i - 1] as number) !== step) {
        return null;
      }
    }
    
    return step;
  }

  /**
   * 执行填充
   */
  private performFill(source: SelectionRange, target: SelectionRange, direction: FillDirection, mode: FillMode = 'copy'): void {
    const sourceValues: any[][] = [];
    
    // 获取源数据
    for (let row = source.start.row; row <= source.end.row; row++) {
      const rowValues: any[] = [];
      for (let col = source.start.col; col <= source.end.col; col++) {
        rowValues.push(this.options.getCellValue(row, col));
      }
      sourceValues.push(rowValues);
    }

    const normalizedTarget = normalizeRange(target);
    
    // 根据填充模式执行不同逻辑
    switch (mode) {
      case 'copy':
        this.fillCopy(sourceValues, normalizedTarget, direction);
        break;
      case 'series':
        this.fillSeries(sourceValues, source, normalizedTarget, direction);
        break;
      case 'formatOnly':
        // 仅填充格式（目前简化处理，清空值）
        this.fillFormatOnly(normalizedTarget);
        break;
      case 'noFormat':
        // 不带格式填充（目前与复制相同）
        this.fillCopy(sourceValues, normalizedTarget, direction);
        break;
    }
  }

  /**
   * 复制填充（默认模式）
   */
  private fillCopy(sourceValues: any[][], target: SelectionRange, direction: FillDirection): void {
    const sourceRows = sourceValues.length;
    const sourceCols = sourceValues[0]?.length || 0;
    
    if (direction === 'down' || direction === 'up') {
      for (let row = target.start.row; row <= target.end.row; row++) {
        const sourceRowIndex = (row - target.start.row) % sourceRows;
        for (let col = target.start.col; col <= target.end.col; col++) {
          const sourceColIndex = col - target.start.col;
          this.options.setCellValue(row, col, sourceValues[sourceRowIndex][sourceColIndex]);
        }
      }
    } else {
      for (let col = target.start.col; col <= target.end.col; col++) {
        const sourceColIndex = (col - target.start.col) % sourceCols;
        for (let row = target.start.row; row <= target.end.row; row++) {
          const sourceRowIndex = row - target.start.row;
          this.options.setCellValue(row, col, sourceValues[sourceRowIndex][sourceColIndex]);
        }
      }
    }
  }

  /**
   * 序列填充
   */
  private fillSeries(sourceValues: any[][], source: SelectionRange, target: SelectionRange, direction: FillDirection): void {
    const sourceRows = sourceValues.length;
    const sourceCols = sourceValues[0]?.length || 0;
    
    if (direction === 'down' || direction === 'up') {
      // 检测每一列的序列步长
      const colSteps: (number | null)[] = [];
      for (let col = 0; col < sourceCols; col++) {
        const colValues = sourceValues.map(row => row[col]);
        colSteps.push(this.detectStep(colValues));
      }
      
      for (let row = target.start.row; row <= target.end.row; row++) {
        for (let col = target.start.col; col <= target.end.col; col++) {
          const sourceColIndex = col - target.start.col;
          const step = colSteps[sourceColIndex];
          
          if (step !== null && sourceRows >= 2) {
            // 有序列模式，按步长递增
            const baseValue = sourceValues[sourceRows - 1][sourceColIndex];
            const offset = row - source.end.row;
            const delta = direction === 'down' ? offset : -offset;
            if (typeof baseValue === 'number') {
              this.options.setCellValue(row, col, baseValue + delta * step);
            } else {
              this.options.setCellValue(row, col, baseValue);
            }
          } else {
            // 无序列模式，使用智能填充
            const sourceRowIndex = (row - target.start.row) % sourceRows;
            const value = this.smartFill(
              sourceValues[sourceRowIndex][sourceColIndex],
              row - source.start.row,
              direction
            );
            this.options.setCellValue(row, col, value);
          }
        }
      }
    } else {
      // 检测每一行的序列步长
      const rowSteps: (number | null)[] = [];
      for (let row = 0; row < sourceRows; row++) {
        rowSteps.push(this.detectStep(sourceValues[row]));
      }
      
      for (let col = target.start.col; col <= target.end.col; col++) {
        for (let row = target.start.row; row <= target.end.row; row++) {
          const sourceRowIndex = row - target.start.row;
          const step = rowSteps[sourceRowIndex];
          
          if (step !== null && sourceCols >= 2) {
            // 有序列模式，按步长递增
            const baseValue = sourceValues[sourceRowIndex][sourceCols - 1];
            const offset = col - source.end.col;
            const delta = direction === 'right' ? offset : -offset;
            if (typeof baseValue === 'number') {
              this.options.setCellValue(row, col, baseValue + delta * step);
            } else {
              this.options.setCellValue(row, col, baseValue);
            }
          } else {
            // 无序列模式，使用智能填充
            const sourceColIndex = (col - target.start.col) % sourceCols;
            const value = this.smartFill(
              sourceValues[sourceRowIndex][sourceColIndex],
              col - source.start.col,
              direction
            );
            this.options.setCellValue(row, col, value);
          }
        }
      }
    }
  }

  /**
   * 仅填充格式（清空值）
   */
  private fillFormatOnly(target: SelectionRange): void {
    for (let row = target.start.row; row <= target.end.row; row++) {
      for (let col = target.start.col; col <= target.end.col; col++) {
        this.options.setCellValue(row, col, null);
      }
    }
  }

  /**
   * 智能填充（识别序列）
   */
  private smartFill(value: any, offset: number, direction: FillDirection): any {
    // 数字递增/递减
    if (typeof value === 'number') {
      const delta = direction === 'down' || direction === 'right' ? 1 : -1;
      return value + (offset + 1) * delta;
    }
    
    // 字符串中包含数字的情况，尝试递增数字部分
    if (typeof value === 'string') {
      // 匹配末尾的数字，如 "Item1" -> "Item2"
      const match = value.match(/^(.*?)(\d+)(\D*)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        const suffix = match[3];
        const delta = direction === 'down' || direction === 'right' ? 1 : -1;
        const newNum = num + (offset + 1) * delta;
        // 保持原始数字的位数（补零）
        const numStr = newNum.toString().padStart(match[2].length, '0');
        return prefix + numStr + suffix;
      }
    }
    
    // 日期类型
    if (value instanceof Date) {
      const delta = direction === 'down' || direction === 'right' ? 1 : -1;
      const newDate = new Date(value);
      newDate.setDate(newDate.getDate() + (offset + 1) * delta);
      return newDate;
    }
    
    // 其他类型直接复制
    return value;
  }

  /**
   * 显示预览
   */
  private showPreview(range: SelectionRange): void {
    if (!this.preview || !this.container) return;

    const normalized = normalizeRange(range);
    const startRect = this.options.getCellRect(normalized.start.row, normalized.start.col);
    const endRect = this.options.getCellRect(normalized.end.row, normalized.end.col);
    
    if (!startRect || !endRect) return;

    const containerRect = this.container.getBoundingClientRect();

    setStyles(this.preview, {
      display: 'block',
      left: `${startRect.left - containerRect.left}px`,
      top: `${startRect.top - containerRect.top}px`,
      width: `${endRect.right - startRect.left}px`,
      height: `${endRect.bottom - startRect.top}px`,
    });
  }

  /**
   * 隐藏预览
   */
  private hidePreview(): void {
    if (this.preview) {
      this.preview.style.display = 'none';
    }
  }
}

