/**
 * 文件/图片渲染器
 * 支持显示图片预览和文件链接
 */

import { BaseRenderer } from './BaseRenderer';
import type { RowData, Column, FileUploadResult } from '../types';
import { createElement } from '../utils/dom';

interface FileValue {
  url: string;
  name?: string;
  size?: number;
  type?: string;
}

export class FileRenderer extends BaseRenderer {
  render(cell: HTMLElement, value: any, rowData: RowData, column: Column): void {
    cell.innerHTML = '';

    if (value === null || value === undefined || value === '') {
      return;
    }

    // 标准化为数组
    let files: FileValue[] = [];
    
    if (Array.isArray(value)) {
      files = value.map(v => this.normalizeFileValue(v));
    } else {
      files = [this.normalizeFileValue(value)];
    }
    
    if (files.length === 0) {
      return;
    }

    const container = createElement('div', 'ss-cell-files');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.url) continue;

      const isImage = this.isImageUrl(file.url, file.type);
      
      if (isImage) {
        // 图片预览
        const imgWrapper = createElement('div', 'ss-cell-file-img-wrapper');
        const img = createElement('img', 'ss-cell-file-img') as HTMLImageElement;
        img.src = file.url;
        img.alt = file.name || '图片';
        img.title = file.name || '点击查看大图';
        
        // 点击查看大图
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showImagePreview(file.url);
        });
        
        imgWrapper.appendChild(img);
        container.appendChild(imgWrapper);
      } else {
        // 文件链接
        const fileLink = createElement('a', 'ss-cell-file-link');
        fileLink.href = file.url;
        fileLink.target = '_blank';
        fileLink.rel = 'noopener noreferrer';
        fileLink.title = file.name || file.url;
        
        // 文件图标
        const icon = createElement('span', 'ss-cell-file-icon');
        icon.textContent = this.getFileIcon(file.type, file.name);
        fileLink.appendChild(icon);
        
        // 文件名
        const name = createElement('span', 'ss-cell-file-name');
        name.textContent = file.name || this.getFileName(file.url);
        fileLink.appendChild(name);
        
        // 阻止链接点击时触发单元格选择
        fileLink.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        container.appendChild(fileLink);
      }
    }

    // 如果有多个文件，显示数量标签
    if (files.length > 1) {
      const badge = createElement('span', 'ss-cell-multi-badge');
      badge.textContent = `${files.length}`;
      badge.title = files.map(f => f.name || f.url).join('\n');
      container.appendChild(badge);
    }

    cell.appendChild(container);
  }

  /**
   * 标准化文件值
   */
  private normalizeFileValue(value: any): FileValue {
    if (typeof value === 'object' && value !== null) {
      return {
        url: value.url || '',
        name: value.name,
        size: value.size,
        type: value.type,
      };
    }
    return {
      url: String(value || ''),
    };
  }

  /**
   * 判断是否为图片 URL
   */
  private isImageUrl(url: string, type?: string): boolean {
    if (type && type.startsWith('image/')) {
      return true;
    }
    
    // 检查 base64 图片
    if (url.startsWith('data:image/')) {
      return true;
    }
    
    // 检查文件扩展名
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  }

  /**
   * 获取文件图标
   */
  private getFileIcon(type?: string, name?: string): string {
    if (type) {
      if (type.includes('pdf')) return '📄';
      if (type.includes('word') || type.includes('document')) return '📝';
      if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
      if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
      if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return '📦';
      if (type.includes('video')) return '🎬';
      if (type.includes('audio')) return '🎵';
    }
    
    if (name) {
      const ext = name.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'pdf': return '📄';
        case 'doc':
        case 'docx': return '📝';
        case 'xls':
        case 'xlsx': return '📊';
        case 'ppt':
        case 'pptx': return '📽️';
        case 'zip':
        case 'rar':
        case '7z': return '📦';
        case 'mp4':
        case 'avi':
        case 'mov': return '🎬';
        case 'mp3':
        case 'wav': return '🎵';
      }
    }
    
    return '📎';
  }

  /**
   * 从 URL 获取文件名
   */
  private getFileName(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const segments = pathname.split('/');
      const fileName = segments[segments.length - 1];
      if (fileName) {
        return decodeURIComponent(fileName);
      }
    } catch {
      // URL 解析失败，尝试直接提取
      const segments = url.split('/');
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && !lastSegment.includes('?')) {
        return lastSegment;
      }
    }
    return '文件';
  }

  /**
   * 显示图片预览
   */
  private showImagePreview(url: string): void {
    // 创建预览层
    const overlay = createElement('div', 'ss-image-preview-overlay');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      cursor: zoom-out;
    `;

    const img = createElement('img') as HTMLImageElement;
    img.src = url;
    img.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    // 点击关闭
    overlay.addEventListener('click', () => {
      overlay.remove();
    });

    // ESC 关闭
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }
}

