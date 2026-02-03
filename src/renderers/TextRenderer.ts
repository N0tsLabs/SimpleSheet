/**
 * 文本渲染器 - 支持多行文本显示
 * 腾讯文档风格：默认省略，选中时展开
 */

import { BaseRenderer } from './BaseRenderer';
import { createElement, setStyles } from '../utils/dom';
import type { RowData, Column } from '../types';

// 展开浮层单例
let expandOverlay: HTMLElement | null = null;
let currentExpandCell: HTMLElement | null = null;
let onDblClickCallback: ((cell: HTMLElement) => void) | null = null;
let clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

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
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
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
    } else if (wrapMode === 'wrap') {
      // 换行模式：文本自动换行，支持最大行数限制
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
   * 文本自动换行，支持最大行数限制和行高自适应
   */
  private renderWrapMode(cell: HTMLElement, text: string, column: Column): void {
    cell.classList.add('ss-wrap-text');
    
    const maxLines = column.maxLines;
    const hasMaxLines = maxLines !== undefined && maxLines > 0;
    
    // 创建多行文本容器
    const textContainer = createElement('div', 'ss-cell-multiline');
    cell.innerHTML = '';
    cell.appendChild(textContainer);
    
    // 始终存储完整文本供预览使用
    cell.setAttribute('data-full-text', text);
    
    // 使用 requestAnimationFrame 确保单元格已经渲染，可以测量高度
    requestAnimationFrame(() => {
      // 先设置完整文本，让浏览器自动换行
      textContainer.textContent = text;
      
      const cellWidth = cell.clientWidth;
      const cellPadding = parseFloat(window.getComputedStyle(cell).paddingLeft) + 
                         parseFloat(window.getComputedStyle(cell).paddingRight);
      const availableWidth = cellWidth - cellPadding;
      
      // 获取字体大小和紧凑的行高
      const textFontSize = parseFloat(window.getComputedStyle(textContainer).fontSize) || 13;
      const compactLineHeight = textFontSize * 1.2; // 使用紧凑的行高 1.2
      const textHeight = textContainer.scrollHeight;
      let actualLines = Math.ceil(textHeight / compactLineHeight);
      
      // 如果设置了最大行数，需要截断
      if (hasMaxLines && actualLines > maxLines) {
        // 计算每行的文本，只保留前 maxLines 行
        const lines = text.split('\n');
        let displayLines: string[] = [];
        let currentLineCount = 0;
        
        for (const line of lines) {
          if (currentLineCount >= maxLines) break;
          
          // 测量单行文本宽度
          textContainer.textContent = line;
          const lineWidth = textContainer.scrollWidth;
          
          // 如果单行超出宽度，需要换行
          if (lineWidth > availableWidth) {
            const words = line.split(/\s+/);
            let currentLine = '';
            for (const word of words) {
              if (currentLineCount >= maxLines) break;
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              textContainer.textContent = testLine;
              if (textContainer.scrollWidth > availableWidth) {
                if (currentLine) {
                  displayLines.push(currentLine);
                  currentLineCount++;
                  currentLine = word;
                } else {
                  // 单个单词就超出，强制换行
                  displayLines.push(word);
                  currentLineCount++;
                  currentLine = '';
                }
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine && currentLineCount < maxLines) {
              displayLines.push(currentLine);
              currentLineCount++;
            }
          } else {
            displayLines.push(line);
            currentLineCount++;
          }
        }
        
        // 如果超过最大行数，添加省略号
        const displayText = displayLines.join('\n') + '...';
        textContainer.textContent = displayText;
        cell.title = '点击查看完整内容';
        actualLines = maxLines;
      } else {
        cell.title = text;
      }
      
      // 计算实际需要的行高（使用更紧凑的行高 1.2）
      const cellPaddingTop = parseFloat(window.getComputedStyle(cell).paddingTop);
      const cellPaddingBottom = parseFloat(window.getComputedStyle(cell).paddingBottom);
      // 使用紧凑的行高计算（已经在上面计算过了）
      const neededHeight = Math.ceil(actualLines * compactLineHeight + cellPaddingTop + cellPaddingBottom);
      
      // 设置 data-lines 和 data-needed-height 属性，供行高计算使用
      cell.setAttribute('data-lines', String(actualLines));
      cell.setAttribute('data-needed-height', String(neededHeight));
    });
  }
}
