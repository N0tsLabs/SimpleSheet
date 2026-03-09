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
    
    // 只显示第一个文件，其他通过数量徽章显示
    const firstFile = files[0];
    const remainingCount = files.length - 1;

    if (firstFile && firstFile.url) {
      const isImage = this.isImageUrl(firstFile.url, firstFile.type);
      
      if (isImage) {
        // 图片预览 - 使用固定大小的缩略图
        const imgWrapper = createElement('div', 'ss-cell-file-img-wrapper');
        const img = createElement('img', 'ss-cell-file-img') as HTMLImageElement;
        img.src = firstFile.url;
        img.alt = firstFile.name || '图片';
        img.title = firstFile.name || '点击查看';
        // 不再直接预览，统一走悬浮窗
        img.style.pointerEvents = 'none';
        
        imgWrapper.appendChild(img);
        container.appendChild(imgWrapper);
      } else {
        // 非图片文件 - 只显示图标
        const fileIcon = createElement('div', 'ss-cell-file-icon-only');
        fileIcon.textContent = this.getFileIcon(firstFile.type, firstFile.name);
        fileIcon.title = firstFile.name || this.getFileName(firstFile.url);
        container.appendChild(fileIcon);
      }
    }

    // 如果有更多文件，显示数量徽章（点点样式）
    if (remainingCount > 0) {
      const moreBadge = createElement('span', 'ss-cell-file-count-badge');
      moreBadge.textContent = `•${remainingCount + 1}`;
      moreBadge.title = `共 ${remainingCount + 1} 个文件`;
      container.appendChild(moreBadge);
    } else if (files.length === 1 && !this.isImageUrl(firstFile.url, firstFile.type)) {
      // 单个非图片文件，显示文件名
      const nameLabel = createElement('span', 'ss-cell-file-name-label');
      nameLabel.textContent = firstFile.name || this.getFileName(firstFile.url);
      nameLabel.title = firstFile.name || firstFile.url;
      container.appendChild(nameLabel);
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

