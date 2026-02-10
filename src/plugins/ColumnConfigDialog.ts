/**
 * 列配置弹窗
 * 支持配置列名、类型、以及各类型的特定配置
 */

import { createElement, setStyles, addEvent } from '../utils/dom';
import { COLUMN_TYPES } from './ColumnTypePicker';
import type { Column, ColumnType, SelectOption } from '../types';

/** 日期格式选项 */
export const DATE_FORMATS = [
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD', example: '2024-01-15' },
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD', example: '2024/01/15' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY', example: '15/01/2024' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY', example: '01/15/2024' },
  { label: 'YYYY年MM月DD日', value: 'YYYY年MM月DD日', example: '2024年01月15日' },
  { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm', example: '2024-01-15 14:30' },
  { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss', example: '2024-01-15 14:30:00' },
];

/** 常用数字前缀 */
export const NUMBER_PREFIXES = [
  { label: '无', value: '' },
  { label: '¥ 人民币', value: '¥' },
  { label: '$ 美元', value: '$' },
  { label: '€ 欧元', value: '€' },
  { label: '£ 英镑', value: '£' },
];

/** 常用数字后缀 */
export const NUMBER_SUFFIXES = [
  { label: '无', value: '' },
  { label: '%', value: '%' },
  { label: '元', value: '元' },
  { label: '个', value: '个' },
  { label: '件', value: '件' },
];

export interface ColumnConfigDialogOptions {
  /** 确认回调 */
  onConfirm: (column: Column) => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 初始列配置（编辑模式） */
  initialColumn?: Column;
  /** 模式：新建或编辑 */
  mode?: 'create' | 'edit';
}

export class ColumnConfigDialog {
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private options: ColumnConfigDialogOptions;
  private cleanupFns: Array<() => void> = [];
  
  // 表单状态
  private columnName: string = '';
  private columnType: ColumnType = 'text';
  private selectOptions: SelectOption[] = [];
  private selectMultiple: boolean = false; // 是否支持多选
  private decimalPlaces: number = 2;
  private numberPrefix: string = '';
  private numberSuffix: string = '';
  private useThousandSeparator: boolean = true;
  private dateFormat: string = 'YYYY-MM-DD';
  
  // DOM 引用
  private typeConfigContainer: HTMLElement | null = null;
  private optionsListEl: HTMLElement | null = null;
  private draggedItem: HTMLElement | null = null;

  constructor(options: ColumnConfigDialogOptions) {
    this.options = options;
    
    // 初始化状态
    if (options.initialColumn) {
      this.columnName = options.initialColumn.title || '';
      this.columnType = options.initialColumn.type || 'text';
      this.selectOptions = [...(options.initialColumn.options || [])];
      this.selectMultiple = options.initialColumn.multiple ?? false;
      this.decimalPlaces = options.initialColumn.decimalPlaces ?? 2;
      this.numberPrefix = options.initialColumn.numberPrefix || '';
      this.numberSuffix = options.initialColumn.numberSuffix || '';
      this.useThousandSeparator = options.initialColumn.useThousandSeparator ?? true;
      this.dateFormat = options.initialColumn.dateFormat || 'YYYY-MM-DD';
    }
  }

  /**
   * 显示弹窗
   */
  show(): void {
    this.createDialog();
    
    // ESC 关闭
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        this.options.onCancel?.();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    this.cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown));
  }

  /**
   * 隐藏弹窗
   */
  hide(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.overlay?.remove();
    this.overlay = null;
    this.dialog = null;
  }

  /**
   * 创建弹窗
   */
  private createDialog(): void {
    // 遮罩层
    this.overlay = createElement('div', 'ss-ccd-overlay');
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
        this.options.onCancel?.();
      }
    });
    
    // 继承页面主题设置
    // 优先从表格根元素获取主题，避免跟随系统暗色模式
    const ssRoot = document.querySelector('.ss-root');
    const theme = ssRoot?.getAttribute('data-theme') || 
                  document.documentElement.getAttribute('data-theme') || 
                  document.body.getAttribute('data-theme') ||
                  'light'; // 默认浅色主题
    this.overlay.setAttribute('data-theme', theme);

    // 弹窗容器
    this.dialog = createElement('div', 'ss-ccd-dialog');
    
    // 标题栏
    const header = createElement('div', 'ss-ccd-header');
    const title = createElement('h3', 'ss-ccd-title');
    title.textContent = this.options.mode === 'edit' ? '编辑列配置' : '新建列';
    header.appendChild(title);
    
    const closeBtn = createElement('button', 'ss-ccd-close');
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => {
      this.hide();
      this.options.onCancel?.();
    });
    header.appendChild(closeBtn);
    this.dialog.appendChild(header);

    // 内容区
    const content = createElement('div', 'ss-ccd-content');
    
    // 列名输入
    content.appendChild(this.createNameInput());
    
    // 列类型选择
    content.appendChild(this.createTypeSelect());
    
    // 类型特定配置区域
    this.typeConfigContainer = createElement('div', 'ss-ccd-type-config');
    this.updateTypeConfig();
    content.appendChild(this.typeConfigContainer);
    
    this.dialog.appendChild(content);

    // 底部按钮
    const footer = createElement('div', 'ss-ccd-footer');
    
    const cancelBtn = createElement('button', 'ss-ccd-btn ss-ccd-btn-cancel');
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      this.hide();
      this.options.onCancel?.();
    });
    footer.appendChild(cancelBtn);
    
    const confirmBtn = createElement('button', 'ss-ccd-btn ss-ccd-btn-confirm');
    confirmBtn.textContent = '确定';
    confirmBtn.addEventListener('click', () => this.handleConfirm());
    footer.appendChild(confirmBtn);
    
    this.dialog.appendChild(footer);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    
    // 聚焦到列名输入框
    const nameInput = this.dialog.querySelector('.ss-ccd-name-input') as HTMLInputElement;
    setTimeout(() => nameInput?.focus(), 100);
  }

  /**
   * 创建列名输入
   */
  private createNameInput(): HTMLElement {
    const group = createElement('div', 'ss-ccd-form-group');
    
    const label = createElement('label', 'ss-ccd-label');
    label.textContent = '列名称';
    group.appendChild(label);
    
    const input = createElement('input', 'ss-ccd-input ss-ccd-name-input') as HTMLInputElement;
    input.type = 'text';
    input.placeholder = '请输入列名称';
    input.value = this.columnName;
    input.addEventListener('input', (e) => {
      this.columnName = (e.target as HTMLInputElement).value;
    });
    group.appendChild(input);
    
    return group;
  }

  /**
   * 创建类型选择
   */
  private createTypeSelect(): HTMLElement {
    const group = createElement('div', 'ss-ccd-form-group');
    
    const label = createElement('label', 'ss-ccd-label');
    label.textContent = '列类型';
    group.appendChild(label);
    
    const select = createElement('select', 'ss-ccd-select') as HTMLSelectElement;
    
    // 按分组组织类型
    const groups: Record<string, typeof COLUMN_TYPES> = {};
    for (const config of COLUMN_TYPES) {
      const groupName = config.group || '其他';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(config);
    }
    
    for (const [groupName, types] of Object.entries(groups)) {
      const optgroup = createElement('optgroup') as HTMLOptGroupElement;
      optgroup.label = groupName;
      
      for (const config of types) {
        const option = createElement('option') as HTMLOptionElement;
        option.value = config.type;
        option.textContent = `${config.icon} ${config.label}`;
        if (config.type === this.columnType) {
          option.selected = true;
        }
        optgroup.appendChild(option);
      }
      select.appendChild(optgroup);
    }
    
    select.addEventListener('change', (e) => {
      this.columnType = (e.target as HTMLSelectElement).value as ColumnType;
      this.updateTypeConfig();
    });
    group.appendChild(select);
    
    return group;
  }

  /**
   * 更新类型特定配置区域
   */
  private updateTypeConfig(): void {
    if (!this.typeConfigContainer) return;
    this.typeConfigContainer.innerHTML = '';
    
    switch (this.columnType) {
      case 'select':
        this.typeConfigContainer.appendChild(this.createSelectConfig());
        break;
      case 'number':
        this.typeConfigContainer.appendChild(this.createNumberConfig());
        break;
      case 'date':
        this.typeConfigContainer.appendChild(this.createDateConfig());
        break;
    }
  }

  /**
   * 创建下拉选项配置
   */
  private createSelectConfig(): HTMLElement {
    const container = createElement('div', 'ss-ccd-select-config');
    
    const header = createElement('div', 'ss-ccd-config-header');
    const label = createElement('label', 'ss-ccd-label');
    label.textContent = '选项列表';
    header.appendChild(label);
    
    const addBtn = createElement('button', 'ss-ccd-btn-add');
    addBtn.textContent = '+ 添加选项';
    addBtn.addEventListener('click', () => this.addSelectOption());
    header.appendChild(addBtn);
    container.appendChild(header);
    
    // 选项列表
    this.optionsListEl = createElement('div', 'ss-ccd-options-list');
    this.renderOptionsList();
    container.appendChild(this.optionsListEl);
    
    if (this.selectOptions.length === 0) {
      const hint = createElement('div', 'ss-ccd-hint');
      hint.textContent = '暂无选项，点击上方按钮添加';
      this.optionsListEl.appendChild(hint);
    }

    // 多选配置
    const multipleGroup = createElement('div', 'ss-ccd-form-group ss-ccd-checkbox-group');
    const multipleCheckbox = createElement('input', 'ss-ccd-checkbox') as HTMLInputElement;
    multipleCheckbox.type = 'checkbox';
    multipleCheckbox.id = 'ss-ccd-select-multiple';
    multipleCheckbox.checked = this.selectMultiple;
    multipleCheckbox.addEventListener('change', (e) => {
      this.selectMultiple = (e.target as HTMLInputElement).checked;
    });
    multipleGroup.appendChild(multipleCheckbox);

    const multipleLabel = createElement('label', 'ss-ccd-checkbox-label') as HTMLLabelElement;
    multipleLabel.htmlFor = 'ss-ccd-select-multiple';
    multipleLabel.textContent = '支持多选（可选择多个标签）';
    multipleGroup.appendChild(multipleLabel);
    container.appendChild(multipleGroup);

    return container;
  }

  // 预设颜色
  private readonly presetColors = [
    '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5',
    '#e0f7fa', '#fff8e1', '#efebe9', '#e8eaf6', '#fbe9e7',
    '#ff5722', '#2196f3', '#4caf50', '#9c27b0', '#607d8b',
    '#f44336', '#3f51b5', '#8bc34a', '#e91e63', '#00bcd4',
  ];

  /**
   * 渲染选项列表
   */
  private renderOptionsList(): void {
    if (!this.optionsListEl) return;
    this.optionsListEl.innerHTML = '';
    
    if (this.selectOptions.length === 0) {
      const hint = createElement('div', 'ss-ccd-hint');
      hint.textContent = '暂无选项，点击上方按钮添加';
      this.optionsListEl.appendChild(hint);
      return;
    }
    
    this.selectOptions.forEach((option, index) => {
      const item = createElement('div', 'ss-ccd-option-item');
      item.dataset.index = String(index);
      item.draggable = true;
      
      // 拖拽手柄
      const handle = createElement('span', 'ss-ccd-drag-handle');
      handle.innerHTML = '☰';
      item.appendChild(handle);
      
      // 颜色选择器
      const colorWrapper = createElement('div', 'ss-ccd-color-wrapper');
      const colorBtn = createElement('button', 'ss-ccd-color-btn') as HTMLButtonElement;
      colorBtn.type = 'button';
      colorBtn.style.backgroundColor = option.color || '#e5e7eb';
      colorBtn.title = '选择颜色';
      colorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showColorPicker(colorBtn, index);
      });
      colorWrapper.appendChild(colorBtn);
      item.appendChild(colorWrapper);
      
      // Label 输入
      const labelInput = createElement('input', 'ss-ccd-option-input') as HTMLInputElement;
      labelInput.type = 'text';
      labelInput.placeholder = '显示名称';
      labelInput.value = option.label;
      labelInput.addEventListener('input', (e) => {
        this.selectOptions[index].label = (e.target as HTMLInputElement).value;
      });
      item.appendChild(labelInput);
      
      // Value 输入
      const valueInput = createElement('input', 'ss-ccd-option-input ss-ccd-option-value') as HTMLInputElement;
      valueInput.type = 'text';
      valueInput.placeholder = '值';
      valueInput.value = String(option.value);
      valueInput.addEventListener('input', (e) => {
        this.selectOptions[index].value = (e.target as HTMLInputElement).value;
      });
      item.appendChild(valueInput);
      
      // 删除按钮
      const deleteBtn = createElement('button', 'ss-ccd-btn-delete');
      deleteBtn.innerHTML = '✕';
      deleteBtn.addEventListener('click', () => this.deleteSelectOption(index));
      item.appendChild(deleteBtn);
      
      // 拖拽事件
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
      item.addEventListener('dragover', (e) => this.handleDragOver(e));
      item.addEventListener('drop', (e) => this.handleDrop(e, item));
      item.addEventListener('dragend', () => this.handleDragEnd());
      
      this.optionsListEl!.appendChild(item);
    });
  }
  
  /**
   * 显示颜色选择器
   */
  private showColorPicker(btn: HTMLButtonElement, optionIndex: number): void {
    // 移除已存在的选择器
    const existingPicker = document.querySelector('.ss-ccd-color-picker');
    if (existingPicker) existingPicker.remove();
    
    const picker = createElement('div', 'ss-ccd-color-picker');
    
    // 预设颜色网格
    const grid = createElement('div', 'ss-ccd-color-grid');
    this.presetColors.forEach(color => {
      const colorItem = createElement('button', 'ss-ccd-color-item') as HTMLButtonElement;
      colorItem.type = 'button';
      colorItem.style.backgroundColor = color;
      colorItem.title = color;
      if (this.selectOptions[optionIndex].color === color) {
        colorItem.classList.add('selected');
      }
      colorItem.addEventListener('click', () => {
        this.selectOptions[optionIndex].color = color;
        this.selectOptions[optionIndex].textColor = this.getContrastColor(color);
        btn.style.backgroundColor = color;
        picker.remove();
      });
      grid.appendChild(colorItem);
    });
    picker.appendChild(grid);
    
    // 自定义颜色输入
    const customRow = createElement('div', 'ss-ccd-color-custom');
    const customInput = createElement('input', 'ss-ccd-color-input') as HTMLInputElement;
    customInput.type = 'color';
    customInput.value = this.selectOptions[optionIndex].color || '#e5e7eb';
    customInput.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      this.selectOptions[optionIndex].color = color;
      this.selectOptions[optionIndex].textColor = this.getContrastColor(color);
      btn.style.backgroundColor = color;
    });
    customRow.appendChild(customInput);
    
    const customLabel = createElement('span', 'ss-ccd-color-label');
    customLabel.textContent = '自定义颜色';
    customRow.appendChild(customLabel);
    
    // 清除颜色按钮
    const clearBtn = createElement('button', 'ss-ccd-color-clear') as HTMLButtonElement;
    clearBtn.type = 'button';
    clearBtn.textContent = '清除';
    clearBtn.addEventListener('click', () => {
      delete this.selectOptions[optionIndex].color;
      delete this.selectOptions[optionIndex].textColor;
      btn.style.backgroundColor = '#e5e7eb';
      picker.remove();
    });
    customRow.appendChild(clearBtn);
    
    picker.appendChild(customRow);
    
    // 定位
    const btnRect = btn.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = `${btnRect.bottom + 4}px`;
    picker.style.left = `${btnRect.left}px`;
    picker.style.zIndex = '100002';
    
    document.body.appendChild(picker);
    
    // 点击外部关闭
    const closeHandler = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node) && e.target !== btn) {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }
  
  /**
   * 根据背景色计算对比文字颜色
   */
  private getContrastColor(bgColor: string): string {
    let r = 0, g = 0, b = 0;
    
    if (bgColor.startsWith('#')) {
      const hex = bgColor.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    }
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  }

  /**
   * 添加选项
   */
  private addSelectOption(): void {
    const newOption: SelectOption = {
      label: `选项${this.selectOptions.length + 1}`,
      value: `option${this.selectOptions.length + 1}`,
    };
    this.selectOptions.push(newOption);
    this.renderOptionsList();
    
    // 聚焦到新添加的输入框
    const inputs = this.optionsListEl?.querySelectorAll('.ss-ccd-option-input');
    if (inputs && inputs.length > 0) {
      const lastInput = inputs[inputs.length - 2] as HTMLInputElement;
      lastInput?.focus();
      lastInput?.select();
    }
  }

  /**
   * 删除选项
   */
  private deleteSelectOption(index: number): void {
    this.selectOptions.splice(index, 1);
    this.renderOptionsList();
  }

  /**
   * 拖拽开始
   */
  private handleDragStart(e: DragEvent, item: HTMLElement): void {
    this.draggedItem = item;
    item.classList.add('ss-ccd-dragging');
    e.dataTransfer!.effectAllowed = 'move';
  }

  /**
   * 拖拽经过
   */
  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }

  /**
   * 放置
   */
  private handleDrop(e: DragEvent, target: HTMLElement): void {
    e.preventDefault();
    if (!this.draggedItem || this.draggedItem === target) return;
    
    const fromIndex = parseInt(this.draggedItem.dataset.index || '0');
    const toIndex = parseInt(target.dataset.index || '0');
    
    // 交换位置
    const [removed] = this.selectOptions.splice(fromIndex, 1);
    this.selectOptions.splice(toIndex, 0, removed);
    
    this.renderOptionsList();
  }

  /**
   * 拖拽结束
   */
  private handleDragEnd(): void {
    if (this.draggedItem) {
      this.draggedItem.classList.remove('ss-ccd-dragging');
      this.draggedItem = null;
    }
  }

  /**
   * 创建数字配置
   */
  private createNumberConfig(): HTMLElement {
    const container = createElement('div', 'ss-ccd-number-config');
    
    // 小数位数
    const decimalGroup = createElement('div', 'ss-ccd-form-group ss-ccd-inline-group');
    const decimalLabel = createElement('label', 'ss-ccd-label');
    decimalLabel.textContent = '小数位数';
    decimalGroup.appendChild(decimalLabel);
    
    const decimalInput = createElement('input', 'ss-ccd-input ss-ccd-small-input') as HTMLInputElement;
    decimalInput.type = 'number';
    decimalInput.min = '0';
    decimalInput.max = '10';
    decimalInput.value = String(this.decimalPlaces);
    decimalInput.addEventListener('input', (e) => {
      this.decimalPlaces = parseInt((e.target as HTMLInputElement).value) || 0;
    });
    decimalGroup.appendChild(decimalInput);
    container.appendChild(decimalGroup);
    
    // 千分位分隔符
    const separatorGroup = createElement('div', 'ss-ccd-form-group ss-ccd-checkbox-group');
    const separatorCheckbox = createElement('input', 'ss-ccd-checkbox') as HTMLInputElement;
    separatorCheckbox.type = 'checkbox';
    separatorCheckbox.id = 'ss-ccd-thousand-separator';
    separatorCheckbox.checked = this.useThousandSeparator;
    separatorCheckbox.addEventListener('change', (e) => {
      this.useThousandSeparator = (e.target as HTMLInputElement).checked;
    });
    separatorGroup.appendChild(separatorCheckbox);
    
    const separatorLabel = createElement('label', 'ss-ccd-checkbox-label') as HTMLLabelElement;
    separatorLabel.htmlFor = 'ss-ccd-thousand-separator';
    separatorLabel.textContent = '使用千分位分隔符';
    separatorGroup.appendChild(separatorLabel);
    container.appendChild(separatorGroup);
    
    // 前缀
    const prefixGroup = createElement('div', 'ss-ccd-form-group ss-ccd-inline-group');
    const prefixLabel = createElement('label', 'ss-ccd-label');
    prefixLabel.textContent = '前缀';
    prefixGroup.appendChild(prefixLabel);
    
    const prefixSelect = createElement('select', 'ss-ccd-select ss-ccd-small-select') as HTMLSelectElement;
    for (const prefix of NUMBER_PREFIXES) {
      const option = createElement('option') as HTMLOptionElement;
      option.value = prefix.value;
      option.textContent = prefix.label;
      if (prefix.value === this.numberPrefix) option.selected = true;
      prefixSelect.appendChild(option);
    }
    prefixSelect.addEventListener('change', (e) => {
      this.numberPrefix = (e.target as HTMLSelectElement).value;
    });
    prefixGroup.appendChild(prefixSelect);
    
    const prefixCustom = createElement('input', 'ss-ccd-input ss-ccd-small-input') as HTMLInputElement;
    prefixCustom.type = 'text';
    prefixCustom.placeholder = '自定义';
    prefixCustom.value = NUMBER_PREFIXES.find(p => p.value === this.numberPrefix) ? '' : this.numberPrefix;
    prefixCustom.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      if (value) {
        this.numberPrefix = value;
        prefixSelect.value = '';
      }
    });
    prefixGroup.appendChild(prefixCustom);
    container.appendChild(prefixGroup);
    
    // 后缀
    const suffixGroup = createElement('div', 'ss-ccd-form-group ss-ccd-inline-group');
    const suffixLabel = createElement('label', 'ss-ccd-label');
    suffixLabel.textContent = '后缀';
    suffixGroup.appendChild(suffixLabel);
    
    const suffixSelect = createElement('select', 'ss-ccd-select ss-ccd-small-select') as HTMLSelectElement;
    for (const suffix of NUMBER_SUFFIXES) {
      const option = createElement('option') as HTMLOptionElement;
      option.value = suffix.value;
      option.textContent = suffix.label;
      if (suffix.value === this.numberSuffix) option.selected = true;
      suffixSelect.appendChild(option);
    }
    suffixSelect.addEventListener('change', (e) => {
      this.numberSuffix = (e.target as HTMLSelectElement).value;
    });
    suffixGroup.appendChild(suffixSelect);
    
    const suffixCustom = createElement('input', 'ss-ccd-input ss-ccd-small-input') as HTMLInputElement;
    suffixCustom.type = 'text';
    suffixCustom.placeholder = '自定义';
    suffixCustom.value = NUMBER_SUFFIXES.find(s => s.value === this.numberSuffix) ? '' : this.numberSuffix;
    suffixCustom.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      if (value) {
        this.numberSuffix = value;
        suffixSelect.value = '';
      }
    });
    suffixGroup.appendChild(suffixCustom);
    container.appendChild(suffixGroup);
    
    return container;
  }

  /**
   * 创建日期配置
   */
  private createDateConfig(): HTMLElement {
    const container = createElement('div', 'ss-ccd-date-config');
    
    const group = createElement('div', 'ss-ccd-form-group');
    const label = createElement('label', 'ss-ccd-label');
    label.textContent = '日期格式';
    group.appendChild(label);
    
    const select = createElement('select', 'ss-ccd-select') as HTMLSelectElement;
    for (const format of DATE_FORMATS) {
      const option = createElement('option') as HTMLOptionElement;
      option.value = format.value;
      option.textContent = `${format.label} (${format.example})`;
      if (format.value === this.dateFormat) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', (e) => {
      this.dateFormat = (e.target as HTMLSelectElement).value;
    });
    group.appendChild(select);
    container.appendChild(group);
    
    return container;
  }

  /**
   * 确认提交
   */
  private handleConfirm(): void {
    // 验证
    if (!this.columnName.trim()) {
      alert('请输入列名称');
      return;
    }
    
    // 构建列配置
    const column: Column = {
      key: this.options.initialColumn?.key || `col_${Date.now()}`,
      title: this.columnName.trim(),
      type: this.columnType,
      width: this.options.initialColumn?.width || this.getDefaultWidth(),
    };
    
    // 类型特定配置
    switch (this.columnType) {
      case 'select':
        column.options = this.selectOptions.filter(opt => opt.label.trim());
        column.multiple = this.selectMultiple;
        break;
      case 'number':
        column.decimalPlaces = this.decimalPlaces;
        column.numberPrefix = this.numberPrefix;
        column.numberSuffix = this.numberSuffix;
        column.useThousandSeparator = this.useThousandSeparator;
        column.align = 'right';
        break;
      case 'date':
        column.dateFormat = this.dateFormat;
        break;
      case 'boolean':
        column.align = 'center';
        break;
    }
    
    this.options.onConfirm(column);
    this.hide();
  }

  /**
   * 获取默认宽度
   */
  private getDefaultWidth(): number {
    switch (this.columnType) {
      case 'date': return 140;
      case 'email':
      case 'phone':
      case 'link': return 180;
      case 'file': return 150;
      case 'boolean': return 80;
      default: return 120;
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.hide();
  }
}

/**
 * 显示新建列弹窗
 */
export function showCreateColumnDialog(onConfirm: (column: Column) => void): ColumnConfigDialog {
  const dialog = new ColumnConfigDialog({
    mode: 'create',
    onConfirm,
  });
  dialog.show();
  return dialog;
}

/**
 * 显示编辑列弹窗
 */
export function showEditColumnDialog(column: Column, onConfirm: (column: Column) => void): ColumnConfigDialog {
  const dialog = new ColumnConfigDialog({
    mode: 'edit',
    initialColumn: column,
    onConfirm,
  });
  dialog.show();
  return dialog;
}

