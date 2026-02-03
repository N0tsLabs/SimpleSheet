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
    
    // 添加文件类型标记，用于提示可粘贴
    cell.classList.add('ss-cell-file-type');

    if (value === null || value === undefined || value === '') {
      // 显示占位提示
      const placeholder = createElement('div', 'ss-cell-file-placeholder');
      placeholder.innerHTML = '<span class="ss-file-placeholder-icon">📎</span><span class="ss-file-placeholder-text">点击后可粘贴文件</span>';
      cell.appendChild(placeholder);
      return;
    }

    // 标准化为数组
    let files: FileValue[] = [];
    
    if (Array.isArray(value)) {
      files = value.map(v => this.normalizeFileValue(v));
    } else if (typeof value === 'string' && value.includes(',')) {
      // 支持逗号分隔的字符串（如 "url1,url2,url3"）
      files = value.split(',').map(url => this.normalizeFileValue(url.trim())).filter(f => f.url);
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
        // 存储图片URL到data属性，用于事件委托
        img.setAttribute('data-preview-url', file.url);
        
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
    
    const lowerUrl = url.toLowerCase();
    
    // 检查文件扩展名（支持带参数的 URL）
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
    
    // 尝试解析 URL 获取路径
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      
      // 检查路径中是否有图片扩展名
      if (imageExtensions.some(ext => pathname.endsWith('.' + ext))) {
        return true;
      }
      
      // 检查路径段是否包含图片格式（如 /svg?seed=1）
      if (imageExtensions.some(ext => pathname.includes('/' + ext) || pathname.includes('.' + ext))) {
        return true;
      }
    } catch {
      // URL 解析失败，使用简单匹配
    }
    
    // 简单匹配：检查是否包含图片扩展名
    if (imageExtensions.some(ext => 
      lowerUrl.includes('.' + ext) || 
      lowerUrl.includes('/' + ext + '?') ||
      lowerUrl.includes('/' + ext + '/')
    )) {
      return true;
    }
    
    // 检查常见图片服务域名
    const imageServices = [
      'dicebear.com',
      'gravatar.com', 
      'avatars.githubusercontent.com',
      'i.imgur.com',
      'images.unsplash.com',
      'picsum.photos',
      'placeholder.com',
      'placehold.co',
      'via.placeholder.com',
    ];
    
    if (imageServices.some(service => lowerUrl.includes(service))) {
      return true;
    }
    
    return false;
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

}

