/**
 * 图片查看器
 * 提供图片预览、缩放、旋转等功能
 */

import { createElement } from '../utils/dom';

export class ImageViewer {
  private overlay: HTMLElement | null = null;
  private scale = 1;
  private rotation = 0;
  private cleanup: (() => void) | null = null;

  /**
   * 显示图片预览
   */
  show(url: string, title?: string): void {
    // 如果已经有打开的预览，先关闭
    this.close();
    
    this.scale = 1;
    this.rotation = 0;
    
    // 创建预览层
    this.overlay = createElement('div', 'ss-image-viewer-overlay');
    
    // 工具栏
    const toolbar = createElement('div', 'ss-image-viewer-toolbar');

    const createBtn = (icon: string, btnTitle: string, onClick: () => void) => {
      const btn = createElement('button', 'ss-image-viewer-btn');
      btn.innerHTML = icon;
      btn.title = btnTitle;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      return btn;
    };

    const imgContainer = createElement('div', 'ss-image-viewer-container');

    const img = createElement('img', 'ss-image-viewer-img') as HTMLImageElement;
    img.src = url;
    img.alt = title || '图片预览';

    const updateTransform = () => {
      img.style.transform = `scale(${this.scale}) rotate(${this.rotation}deg)`;
    };

    // 放大
    toolbar.appendChild(createBtn('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg>', '放大 (+)', () => {
      this.scale = Math.min(this.scale + 0.25, 5);
      updateTransform();
    }));

    // 缩小
    toolbar.appendChild(createBtn('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/></svg>', '缩小 (-)', () => {
      this.scale = Math.max(this.scale - 0.25, 0.25);
      updateTransform();
    }));

    // 向左旋转
    toolbar.appendChild(createBtn('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>', '向左旋转 (L)', () => {
      this.rotation = (this.rotation - 90) % 360;
      updateTransform();
    }));

    // 向右旋转
    toolbar.appendChild(createBtn('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/></svg>', '向右旋转 (R)', () => {
      this.rotation = (this.rotation + 90) % 360;
      updateTransform();
    }));

    // 重置
    toolbar.appendChild(createBtn('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>', '重置 (0)', () => {
      this.scale = 1;
      this.rotation = 0;
      updateTransform();
    }));

    // 下载
    toolbar.appendChild(createBtn('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>', '下载', () => {
      const a = createElement('a') as HTMLAnchorElement;
      a.href = url;
      a.download = title || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }));

    // 关闭按钮（单独放右上角）
    const closeBtn = createElement('button', 'ss-image-viewer-close');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    closeBtn.title = '关闭 (ESC)';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    imgContainer.appendChild(img);
    this.overlay.appendChild(closeBtn);
    this.overlay.appendChild(imgContainer);
    this.overlay.appendChild(toolbar);
    document.body.appendChild(this.overlay);

    // 点击背景关闭
    imgContainer.addEventListener('click', (e) => {
      if (e.target === imgContainer) {
        this.close();
      }
    });

    // 鼠标滚轮缩放
    this.overlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.scale = Math.min(this.scale + 0.1, 5);
      } else {
        this.scale = Math.max(this.scale - 0.1, 0.25);
      }
      updateTransform();
    }, { passive: false });

    // 键盘快捷键
    const handleKeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case '+':
        case '=':
          this.scale = Math.min(this.scale + 0.25, 5);
          updateTransform();
          break;
        case '-':
          this.scale = Math.max(this.scale - 0.25, 0.25);
          updateTransform();
          break;
        case 'r':
        case 'R':
          this.rotation = (this.rotation + 90) % 360;
          updateTransform();
          break;
        case 'l':
        case 'L':
          this.rotation = (this.rotation - 90) % 360;
          updateTransform();
          break;
        case '0':
          this.scale = 1;
          this.rotation = 0;
          updateTransform();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    this.cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }

  /**
   * 关闭预览
   */
  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  /**
   * 是否正在显示
   */
  isVisible(): boolean {
    return this.overlay !== null;
  }
}

// 单例实例
let imageViewerInstance: ImageViewer | null = null;

/**
 * 获取图片查看器实例
 */
export function getImageViewer(): ImageViewer {
  if (!imageViewerInstance) {
    imageViewerInstance = new ImageViewer();
  }
  return imageViewerInstance;
}

/**
 * 显示图片预览
 */
export function showImagePreview(url: string, title?: string): void {
  getImageViewer().show(url, title);
}

/**
 * 关闭图片预览
 */
export function closeImagePreview(): void {
  getImageViewer().close();
}

