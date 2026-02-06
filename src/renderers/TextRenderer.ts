/**
 * 文本渲染器 - 支持多行文本显示
 * 腾讯文档风格：默认省略，选中时展开
 */

import { BaseRenderer } from './BaseRenderer';
import { createElement, setStyles } from '../utils/dom';
import type { RowData, Column } from '../types';

// 预计算行高模式标志（全局）
let precalculateMode = false;

/**
 * 设置预计算行高模式
 * 在预计算模式下，TextRenderer 不会在 requestAnimationFrame 中计算高度
 * 而是直接使用预计算的高度
 */
export function setPrecalculateMode(enabled: boolean): void {
  precalculateMode = enabled;
}

/**
 * 获取当前是否为预计算模式
 */
export function isPrecalculateMode(): boolean {
  return precalculateMode;
}
let expandOverlay: HTMLElement | null = null;
let currentExpandCell: HTMLElement | null = null;
let onDblClickCallback: ((cell: HTMLElement) => void) | null = null;
let clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

/**
 * 测量容器缓存（用于预计算行高）
 */
let measurementContainer: HTMLElement | null = null;

/**
 * 初始化测量容器
 */
function getMeasurementContainer(): HTMLElement {
  if (!measurementContainer) {
    measurementContainer = createElement('div', 'ss-measurement-container');
    measurementContainer.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;overflow:hidden;';
    measurementContainer.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    document.body.appendChild(measurementContainer);
  }
  return measurementContainer;
}

/**
 * 清理测量容器
 */
export function cleanupMeasurementContainer(): void {
  if (measurementContainer) {
    measurementContainer.remove();
    measurementContainer = null;
  }
}

/**
 * 测量单行的高度（用于分批预计算）
 * @param rowData 行数据
 * @param columns 列配置
 * @param defaultRowHeight 默认行高
 * @returns 行高
 */
export function measureRowHeight(
  rowData: RowData,
  columns: Column[],
  defaultRowHeight: number = 36
): number {
  const container = getMeasurementContainer();
  const wrapColumns = columns.filter(col => col.wrapText === 'wrap' || col.wrapText === 'fixed');

  if (wrapColumns.length === 0) {
    return defaultRowHeight;
  }

  let maxHeight = defaultRowHeight;

  // 测量每列的文本高度
  for (const col of wrapColumns) {
    const key = col.key;
    let text = '';

    // 对于有自定义渲染器的列，使用渲染器中的逻辑获取文本
    if (col.renderer) {
      const originalData = (rowData as any)._originalData || rowData;
      if (key === 'productInfo') {
        const brandName = originalData.brandName || '';
        const skuName = originalData.skuName || '';
        const skuModel = originalData.skuModel || '';
        text = [brandName, skuName, skuModel].filter(Boolean).join('\n');
      } else if (key === 'quantityUnit') {
        const quantity = originalData.quantity || '';
        const unit = originalData.unit || originalData.productUnit || '';
        text = quantity && unit ? `${quantity} ${unit}` : quantity || unit;
      } else {
        text = String(originalData[key] || '');
      }
    } else {
      text = String(rowData[key] || '');
    }

    if (!text) continue;

    // 测量元素样式 - 与实际 ss-wrap-text 单元格一致
    const measureEl = createElement('div', 'ss-cell ss-wrap-text');
    const colWidth = (col.width || 100) - 16; // 减去 padding
    measureEl.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      width: ${colWidth}px;
      padding: 4px 8px;
      box-sizing: border-box;
      white-space: pre-wrap;
      word-break: break-word;
      align-items: flex-start;
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      line-height: 1.2;
      overflow: hidden;
    `;
    measureEl.textContent = text;
    container.appendChild(measureEl);

    const neededHeight = measureEl.scrollHeight;
    if (neededHeight > maxHeight) {
      maxHeight = neededHeight;
    }

    measureEl.remove();
  }

  return maxHeight;
}

/**
 * 预计算所有行的实际高度（同步方法）
 * 在渲染前调用，确保虚拟滚动能立即使用准确的高度
 * @param dataList 所有行数据
 * @param columns 列配置
 * @param defaultRowHeight 默认行高
 * @returns Map<rowIndex, height> 每行的实际高度
 */
export function precalculateRowHeights(
  dataList: RowData[],
  columns: Column[],
  defaultRowHeight: number = 36
): Map<number, number> {
  const container = getMeasurementContainer();
  const heights = new Map<number, number>();

  // 测量容器样式
  const containerStyle = `
    position: absolute;
    visibility: hidden;
    pointer-events: none;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    line-height: 1.2;
  `;

  // 测量每行中所有 wrapText 列的高度，取最大值
  for (let rowIndex = 0; rowIndex < dataList.length; rowIndex++) {
    const rowData = dataList[rowIndex];
    let maxHeight = defaultRowHeight;

    // 检查是否有 wrapText 为 wrap 或 fixed 的列
    const wrapColumns = columns.filter(col => col.wrapText === 'wrap' || col.wrapText === 'fixed');
    if (wrapColumns.length === 0) {
      heights.set(rowIndex, defaultRowHeight);
      continue;
    }

    // 测量每列的文本高度
    for (const col of wrapColumns) {
      const key = col.key;
      let text = '';

      // 对于有自定义渲染器的列，使用渲染器中的逻辑获取文本
      if (col.renderer) {
        const originalData = (rowData as any)._originalData || rowData;
        if (key === 'productInfo') {
          const brandName = originalData.brandName || '';
          const skuName = originalData.skuName || '';
          const skuModel = originalData.skuModel || '';
          text = [brandName, skuName, skuModel].filter(Boolean).join('\n');
        } else if (key === 'quantityUnit') {
          const quantity = originalData.quantity || '';
          const unit = originalData.unit || originalData.productUnit || '';
          text = quantity && unit ? `${quantity} ${unit}` : quantity || unit;
        } else {
          text = String(originalData[key] || '');
        }
      } else {
        text = String(rowData[key] || '');
      }

      if (!text) continue;

      // 创建测量元素（使用与实际单元格相同的样式）
      const measureEl = createElement('div', 'ss-cell ss-wrap-text');
      measureEl.style.cssText = containerStyle + `
        width: ${(col.width || 100) - 16}px;
        padding: 4px 8px;
        box-sizing: border-box;
        white-space: pre-wrap;
        word-break: break-word;
        align-items: flex-start;
      `;
      measureEl.textContent = text;
      container.appendChild(measureEl);

      // 获取实际高度
      const neededHeight = measureEl.scrollHeight;

      if (neededHeight > maxHeight) {
        maxHeight = neededHeight;
      }

      measureEl.remove();
    }

    heights.set(rowIndex, maxHeight);
  }

  return heights;
}

/**
 * 设置双击回调（用于进入编辑模式）
 */
export function setExpandOverlayDblClickHandler(callback: (cell: HTMLElement) => void): void {
  onDblClickCallback = callback;
}

/**
 * 显示展开浮层（预览模式：悬浮窗形式，类似文件附件预览）
 */
export function showExpandOverlay(cell: HTMLElement, text: string): void {
  // 如果是同一个单元格，不重复显示
  if (currentExpandCell === cell && expandOverlay) {
    return;
  }
  
  hideExpandOverlay();
  
  // 如果没有文本，不显示
  if (!text || text.trim() === '') {
    return;
  }
  
  currentExpandCell = cell;
  
  // 创建悬浮窗（类似文件附件预览）
  expandOverlay = createElement('div', 'ss-cell-expand-overlay');
  
  // 继承表格的主题设置
  const sheetRoot = cell.closest('.ss-root');
  const theme = sheetRoot?.getAttribute('data-theme');
  if (theme) {
    expandOverlay.setAttribute('data-theme', theme);
  }
  
  // 内容区域（去掉标题，直接显示内容）
  const content = createElement('div', 'ss-expand-overlay-content');
  content.textContent = text;
  
  // 获取单元格的列配置，检查是否配置了换行
  const wrapText = cell.getAttribute('data-wrap-text');
  if (wrapText === 'wrap' || wrapText === 'true') {
    content.classList.add('ss-expand-overlay-multiline');
  }
  
  expandOverlay.appendChild(content);
  
  // 双击浮层时进入编辑模式
  expandOverlay.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (currentExpandCell && onDblClickCallback) {
      const cellToEdit = currentExpandCell;
      // 立即隐藏，避免动画闪烁
      hideExpandOverlay(true);
      onDblClickCallback(cellToEdit);
    }
  });
  
  // 点击浮层内部不关闭（阻止事件冒泡）
  expandOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  document.body.appendChild(expandOverlay);
  
  // 计算位置 - 与单元格对齐，宽度固定为单元格宽度
  const rect = cell.getBoundingClientRect();
  
  setStyles(expandOverlay, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
    width: `${Math.max(rect.width, 300)}px`,
    maxWidth: '500px',
    maxHeight: '400px',
    zIndex: '1000',
  });
  
  // 调整位置确保在视口内
  const overlayRect = expandOverlay.getBoundingClientRect();
  if (overlayRect.right > window.innerWidth) {
    expandOverlay.style.left = `${window.innerWidth - overlayRect.width - 8}px`;
  }
  if (overlayRect.bottom > window.innerHeight) {
    expandOverlay.style.top = `${rect.top - overlayRect.height - 4}px`;
  }
  
  // 添加全局点击事件监听器，点击外部时关闭预览
  setTimeout(() => {
    clickOutsideHandler = (e: MouseEvent) => {
      if (!expandOverlay || !currentExpandCell) return;
      
      const target = e.target as HTMLElement;
      
      // 如果点击的是预览浮层或其内部，不关闭
      if (expandOverlay.contains(target)) {
        return;
      }
      
      // 如果点击的是当前展开的单元格，不关闭（因为这是触发预览的单元格）
      if (currentExpandCell === target || currentExpandCell.contains(target)) {
        return;
      }
      
      // 检查是否点击在表格区域内
      const sheetRoot = currentExpandCell.closest('.ss-root');
      if (sheetRoot && sheetRoot.contains(target)) {
        // 点击了表格内的其他单元格，关闭预览
        hideExpandOverlay();
        return;
      }
      
      // 点击表格外部，关闭预览
      hideExpandOverlay();
    };
    
    // 使用捕获阶段，确保在其他点击处理之前执行
    document.addEventListener('mousedown', clickOutsideHandler, true);
  }, 100);
}

/**
 * 隐藏展开浮层
 * @param immediate 是否立即隐藏（无动画），用于双击进入编辑时避免闪烁
 */
export function hideExpandOverlay(immediate: boolean = false): void {
  if (expandOverlay) {
    if (immediate) {
      // 立即隐藏，禁用动画
      expandOverlay.style.animation = 'none';
      expandOverlay.style.opacity = '0';
    }
    expandOverlay.remove();
    expandOverlay = null;
  }
  currentExpandCell = null;
  
  // 移除全局点击事件监听器
  if (clickOutsideHandler) {
    document.removeEventListener('mousedown', clickOutsideHandler, true);
    clickOutsideHandler = null;
  }
}

/**
 * 获取当前展开的单元格
 */
export function getCurrentExpandCell(): HTMLElement | null {
  return currentExpandCell;
}

export class TextRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, _rowData: RowData, column: Column): void {
    const text = this.formatValue(value, column);
    const wrapMode = column.wrapText || false;
    
    // 清空单元格
    cell.innerHTML = '';
    cell.className = cell.className.replace(/\s*ss-wrap-\w+/g, '');
    cell.removeAttribute('data-full-text');
    
    // 始终存储完整文本，以便预览功能使用（即使没有设置 wrapText）
    // 只有当文本确实超出单元格宽度时才需要预览
    if (text && text.trim()) {
      cell.setAttribute('data-full-text', text);
    }
    
    // 如果 wrapMode 为 false，使用普通渲染
    if (wrapMode === false) {
      this.setText(cell, text.replace(/\n/g, ' '));
      cell.title = text;
      // 即使没有设置 wrapText，也存储完整文本以便预览
      // 但只在文本确实可能超出时才存储（避免不必要的存储）
      if (text && text.trim() && text.length > 20) {
        cell.setAttribute('data-full-text', text);
      }
      return;
    }
    
    // 检查是否包含换行符
    const hasNewlines = text.includes('\n');
    
    // 存储完整文本，供选中时展开使用（省略模式下，无论是否有换行符都需要）
    if (wrapMode === 'ellipsis') {
      cell.setAttribute('data-full-text', text);
    } else if (hasNewlines) {
      // wrap 模式下，只有多行文本才需要存储
      cell.setAttribute('data-full-text', text);
    }
    
    if (wrapMode === 'ellipsis') {
      // 省略模式：只显示第一行，超出部分用省略号（无论是否有换行符）
      this.renderEllipsisMode(cell, text);
    } else if (wrapMode === 'wrap' || wrapMode === 'fixed') {
      // 换行模式：文本自动换行，支持最大行数限制
      // 'fixed' 模式也会进入这里，但会在 renderWrapMode 中处理
      this.renderWrapMode(cell, text, column);
    }
  }
  
  /**
   * 计算文本是否超出容器宽度，如果超出则截断并添加省略号
   */
  private truncateTextWithEllipsis(textContainer: HTMLElement, text: string): string {
    // 先设置完整文本，测量实际宽度
    textContainer.textContent = text;
    const textWidth = textContainer.scrollWidth;
    
    // 获取容器的可用宽度（考虑 padding）
    const container = textContainer.parentElement;
    if (!container) return text;
    
    const containerStyle = window.getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const containerWidth = container.clientWidth - paddingLeft - paddingRight;
    
    // 如果文本宽度小于等于容器宽度，直接返回
    if (textWidth <= containerWidth) {
      return text;
    }
    
    // 如果超出，需要截断并添加省略号
    const ellipsis = '...';
    
    // 二分查找合适的截断位置
    let left = 0;
    let right = text.length;
    let result = text;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.substring(0, mid) + ellipsis;
      textContainer.textContent = truncated;
      const width = textContainer.scrollWidth;
      
      if (width <= containerWidth) {
        result = truncated;
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    // 确保结果不超过容器宽度
    textContainer.textContent = result;
    while (textContainer.scrollWidth > containerWidth && result.length > ellipsis.length) {
      result = result.substring(0, result.length - ellipsis.length - 1) + ellipsis;
      textContainer.textContent = result;
    }
    
    return result;
  }
  
  /**
   * 省略模式渲染 - 腾讯文档风格
   * 只显示第一行，超出部分用省略号
   */
  private renderEllipsisMode(cell: HTMLElement, text: string): void {
    const lines = text.split('\n');
    // 只取第一行
    const firstLine = lines[0];
    const hasMultipleLines = lines.length > 1;
    
    cell.classList.add('ss-wrap-ellipsis');
    
    // 创建一个文本容器来处理省略号（因为父元素是 flex，text-overflow 不工作）
    const textContainer = createElement('span', 'ss-cell-text-ellipsis');
    cell.innerHTML = '';
    cell.appendChild(textContainer);
    
    // 使用 requestAnimationFrame 确保单元格已经渲染，宽度可用
    requestAnimationFrame(() => {
      let displayText: string;
      
      if (hasMultipleLines) {
        // 如果有多行，需要确保末尾有省略号
        // 先尝试在第一行末尾添加省略号
        const firstLineWithEllipsis = firstLine + '...';
        textContainer.textContent = firstLineWithEllipsis;
        
        const container = textContainer.parentElement;
        if (container) {
          const containerStyle = window.getComputedStyle(container);
          const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
          const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
          const containerWidth = container.clientWidth - paddingLeft - paddingRight;
          
          // 如果添加省略号后超出，需要截断
          if (textContainer.scrollWidth > containerWidth) {
            displayText = this.truncateTextWithEllipsis(textContainer, firstLine);
          } else {
            displayText = firstLineWithEllipsis;
          }
        } else {
          displayText = firstLineWithEllipsis;
        }
      } else {
        // 单行文本，按正常逻辑处理
        displayText = this.truncateTextWithEllipsis(textContainer, firstLine);
      }
      
      textContainer.textContent = displayText;
    });
    
    cell.title = '点击查看完整内容';
  }
  
  /**
   * 自动换行模式渲染
   * 文本自动换行，行高自适应
   * 注意：高度计算由 Renderer 的分批预计算机制处理
   */
  private renderWrapMode(cell: HTMLElement, text: string, _column: Column): void {
    cell.classList.add('ss-wrap-text');

    // 创建多行文本容器
    const textContainer = createElement('div', 'ss-cell-multiline');
    cell.innerHTML = '';
    cell.appendChild(textContainer);

    // 始终存储完整文本供预览使用
    cell.setAttribute('data-full-text', text);

    // 直接显示文本
    textContainer.textContent = text;
    cell.title = text;

    // 设置默认行数
    cell.setAttribute('data-lines', '1');

    // 不在这里设置 data-needed-height，让 Renderer 的分批预计算机制来处理
    // 这样可以避免实时测量导致的滚动卡顿
  }
}
