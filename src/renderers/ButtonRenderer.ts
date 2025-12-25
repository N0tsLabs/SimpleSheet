/**
 * 按钮渲染器（操作列）
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column } from '../types';
import { createElement } from '../utils/dom';

export interface ButtonConfig {
  label: string;
  onClick?: (row: number, col: number, rowData: RowData) => void;
  className?: string;
  disabled?: boolean | ((rowData: RowData) => boolean);
}

export class ButtonRenderer extends BaseRenderer {
  private buttonConfig?: ButtonConfig | ButtonConfig[];
  private onClick?: (row: number, col: number, rowData: RowData, buttonIndex?: number) => void;

  /**
   * 设置按钮配置
   */
  setButtonConfig(config: ButtonConfig | ButtonConfig[]): void {
    this.buttonConfig = config;
  }

  /**
   * 设置点击回调
   */
  setOnClick(callback: (row: number, col: number, rowData: RowData, buttonIndex?: number) => void): void {
    this.onClick = callback;
  }

  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';
    
    const configs = Array.isArray(this.buttonConfig) ? this.buttonConfig : (this.buttonConfig ? [this.buttonConfig] : []);
    
    // 如果没有配置，使用默认按钮
    if (configs.length === 0) {
      const button = createElement('button', 'ss-button');
      button.textContent = value || '操作';
      button.type = 'button';
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = parseInt(cell.dataset.row || '0', 10);
        const col = parseInt(cell.dataset.col || '0', 10);
        this.onClick?.(row, col, rowData);
      });
      
      cell.appendChild(button);
      return;
    }
    
    // 渲染多个按钮
    const wrapper = createElement('div', 'ss-button-group');
    configs.forEach((config, index) => {
      const button = createElement('button', 'ss-button');
      button.textContent = config.label;
      button.type = 'button';
      
      if (config.className) {
        button.classList.add(config.className);
      }
      
      // 检查是否禁用
      const isDisabled = typeof config.disabled === 'function' 
        ? config.disabled(rowData) 
        : config.disabled === true;
      
      if (isDisabled || column.readonly) {
        button.disabled = true;
        button.classList.add('ss-button-disabled');
      }
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDisabled || column.readonly) return;
        
        const row = parseInt(cell.dataset.row || '0', 10);
        const col = parseInt(cell.dataset.col || '0', 10);
        
        config.onClick?.(row, col, rowData);
        this.onClick?.(row, col, rowData, index);
      });
      
      wrapper.appendChild(button);
    });
    
    cell.appendChild(wrapper);
  }
}

