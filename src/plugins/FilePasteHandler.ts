/**
 * 文件粘贴处理器
 * 支持粘贴图片和文件到单元格
 */

import { EventEmitter } from '../core/EventEmitter';
import { addEvent } from '../utils/dom';
import type { FileUploader, FileUploadResult, ColumnType } from '../types';

interface FilePasteEvents {
  'paste:start': { files: File[]; row: number; col: number };
  'paste:progress': { file: File; progress: number };
  'paste:complete': { file: File; result: FileUploadResult; row: number; col: number };
  'paste:error': { file: File; error: Error };
}

interface FilePasteHandlerOptions {
  /** 自定义文件上传器 */
  uploader?: FileUploader;
  /** 获取当前选中的单元格 */
  getActiveCell: () => { row: number; col: number } | null;
  /** 获取列类型 */
  getColumnType: (col: number) => ColumnType | undefined;
  /** 设置单元格值 */
  setCellValue: (row: number, col: number, value: any) => void;
  /** 获取单元格值 */
  getCellValue: (row: number, col: number) => any;
  /** 允许的文件类型 */
  acceptedTypes?: string[];
  /** 最大文件大小（字节） */
  maxFileSize?: number;
}

/**
 * 默认上传器 - 使用 base64 或 blob URL
 */
class DefaultUploader implements FileUploader {
  async upload(file: File): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      // 对于图片使用 base64，其他文件使用 blob URL
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            url: reader.result as string,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      } else {
        // 使用 blob URL（注意：页面刷新后会失效）
        const url = URL.createObjectURL(file);
        resolve({
          url,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    });
  }
}

export class FilePasteHandler extends EventEmitter<FilePasteEvents> {
  private container: HTMLElement | null = null;
  private options: FilePasteHandlerOptions;
  private uploader: FileUploader;
  private cleanupFns: Array<() => void> = [];

  constructor(options: FilePasteHandlerOptions) {
    super();
    this.options = {
      acceptedTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      ...options,
    };
    this.uploader = options.uploader || new DefaultUploader();
  }

  /**
   * 设置自定义上传器
   */
  setUploader(uploader: FileUploader): void {
    this.uploader = uploader;
  }

  /**
   * 挂载到容器
   */
  mount(container: HTMLElement): void {
    this.container = container;

    // 监听粘贴事件
    this.cleanupFns.push(
      addEvent(container, 'paste', ((e: Event) => this.handlePaste(e as ClipboardEvent)) as EventListener)
    );

    // 监听拖放事件
    this.cleanupFns.push(
      addEvent(container, 'dragover', ((e: Event) => this.handleDragOver(e as DragEvent)) as EventListener),
      addEvent(container, 'drop', ((e: Event) => this.handleDrop(e as DragEvent)) as EventListener)
    );
  }

  /**
   * 卸载
   */
  unmount(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.container = null;
  }

  /**
   * 处理粘贴事件
   */
  private async handlePaste(e: ClipboardEvent): Promise<void> {
    const activeCell = this.options.getActiveCell();
    if (!activeCell) return;

    const { row, col } = activeCell;
    const columnType = this.options.getColumnType(col);

    // 只处理文件类型列，或者粘贴的是文件
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 检查是否是文件
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    // 如果没有文件，让默认处理继续
    if (files.length === 0) return;

    // 如果列类型不是 file 且不是 link，并且文件不是图片，不处理
    if (columnType !== 'file' && columnType !== 'link') {
      // 只有图片类型才可以粘贴到非文件列
      const hasNonImage = files.some(f => !f.type.startsWith('image/'));
      if (hasNonImage) return;
    }

    // 阻止默认粘贴行为
    e.preventDefault();
    e.stopPropagation();

    // 处理文件
    await this.processFiles(files, row, col);
  }

  /**
   * 处理拖放悬停
   */
  private handleDragOver(e: DragEvent): void {
    const activeCell = this.options.getActiveCell();
    if (!activeCell) return;

    // 检查是否有文件
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * 处理拖放
   */
  private async handleDrop(e: DragEvent): Promise<void> {
    const activeCell = this.options.getActiveCell();
    if (!activeCell) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    const { row, col } = activeCell;
    await this.processFiles(Array.from(files), row, col);
  }

  /**
   * 处理文件
   */
  private async processFiles(files: File[], row: number, col: number): Promise<void> {
    if (files.length === 0) return;

    this.emit('paste:start', { files, row, col });

    const columnType = this.options.getColumnType(col);
    const currentValue = this.options.getCellValue(row, col);

    for (const file of files) {
      try {
        // 验证文件大小
        if (this.options.maxFileSize && file.size > this.options.maxFileSize) {
          throw new Error(`文件大小超过限制 (${this.formatFileSize(this.options.maxFileSize)})`);
        }

        // 上传文件
        const result = await this.uploader.upload(file);
        
        this.emit('paste:complete', { file, result, row, col });

        // 根据列类型决定如何存储
        if (columnType === 'file') {
          // 文件类型：存储为对象或数组
          let newValue: any;
          
          if (Array.isArray(currentValue)) {
            // 追加到现有数组
            newValue = [...currentValue, result];
          } else if (currentValue && typeof currentValue === 'object' && currentValue.url) {
            // 将单个对象转为数组
            newValue = [currentValue, result];
          } else {
            // 新建
            newValue = result;
          }
          
          this.options.setCellValue(row, col, newValue);
        } else if (columnType === 'link') {
          // 链接类型：存储 URL
          let newValue: any;
          
          if (Array.isArray(currentValue)) {
            newValue = [...currentValue, result.url];
          } else if (currentValue) {
            newValue = [currentValue, result.url];
          } else {
            newValue = result.url;
          }
          
          this.options.setCellValue(row, col, newValue);
        } else {
          // 其他类型：只存储 URL
          this.options.setCellValue(row, col, result.url);
        }

      } catch (error) {
        this.emit('paste:error', { file, error: error as Error });
        console.error('文件上传失败:', error);
      }
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.unmount();
  }
}

