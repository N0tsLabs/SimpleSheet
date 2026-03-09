/**
 * 文件上传弹窗组件
 * 支持选择文件、粘贴、拖拽三种上传方式
 */

import { createElement, setStyles } from '../utils/dom';
import type { FileUploadResult } from '../types';

export interface FileUploadDialogOptions {
  /** 允许的文件类型（MIME类型或扩展名） */
  accept?: string[];
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 最大文件数量 */
  maxFiles?: number;
  /** 自定义上传函数（如果不提供则使用默认上传） */
  onUpload?: (file: File) => Promise<FileUploadResult>;
  /** 上传成功回调 */
  onSuccess?: (results: FileUploadResult[]) => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 主题 */
  theme?: 'light' | 'dark';
}

interface UploadFileItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  result?: FileUploadResult;
  error?: string;
  progress?: number;
}

let currentDialog: HTMLElement | null = null;

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 获取文件图标
 */
function getFileIcon(file: File): string {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('pdf') || name.endsWith('.pdf')) return '📄';
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return '📝';
  if (type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return '📊';
  if (type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return '📽️';
  if (type.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar')) return '📦';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  return '📎';
}

/**
 * 验证文件类型
 */
function validateFileType(file: File, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;

  return accept.some(type => {
    // 处理通配符，如 image/*
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -1);
      return file.type.startsWith(prefix);
    }
    // 处理扩展名，如 .jpg
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    // 处理完整 MIME 类型
    return file.type === type;
  });
}

/**
 * 显示文件上传弹窗
 */
export function showFileUploadDialog(options: FileUploadDialogOptions): void {
  // 关闭已存在的弹窗
  closeFileUploadDialog();

  const {
    accept,
    maxFileSize = 10 * 1024 * 1024, // 默认 10MB
    maxFiles = 10,
    onUpload,
    onSuccess,
    onCancel,
    theme = 'light',
  } = options;

  // 存储待上传的文件
  const pendingFiles: UploadFileItem[] = [];
  let isUploading = false;

  // 创建遮罩层
  const overlay = createElement('div', 'ss-file-upload-overlay');
  setStyles(overlay, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10000',
  });

  // 创建弹窗容器
  const dialog = createElement('div', `ss-file-upload-dialog ss-theme-${theme}`);
  setStyles(dialog, {
    backgroundColor: theme === 'dark' ? '#2a2a3e' : '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  });

  // 标题栏
  const header = createElement('div', 'ss-file-upload-header');
  setStyles(header, {
    padding: '16px 20px',
    borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8e8e8'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  });

  const title = createElement('h3', 'ss-file-upload-title');
  setStyles(title, {
    margin: '0',
    fontSize: '16px',
    fontWeight: '500',
    color: theme === 'dark' ? '#e0e0e0' : '#333333',
  });
  title.textContent = '上传文件';
  header.appendChild(title);

  const closeBtn = createElement('button', 'ss-file-upload-close');
  setStyles(closeBtn, {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: theme === 'dark' ? '#999' : '#666',
    padding: '0',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  });
  closeBtn.innerHTML = '×';
  closeBtn.title = '关闭';
  closeBtn.addEventListener('click', () => {
    if (!isUploading) {
      closeDialog();
      onCancel?.();
    }
  });
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // 内容区域
  const content = createElement('div', 'ss-file-upload-content');
  setStyles(content, {
    padding: '20px',
    flex: '1',
    overflowY: 'auto',
  });

  // 拖拽区域
  const dropZone = createElement('div', 'ss-file-upload-dropzone');
  setStyles(dropZone, {
    border: `2px dashed ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d9d9d9'}`,
    borderRadius: '8px',
    padding: '32px 20px',
    textAlign: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa',
    transition: 'all 0.2s',
    cursor: 'pointer',
  });

  const dropZoneIcon = createElement('div', 'ss-file-upload-icon');
  setStyles(dropZoneIcon, {
    fontSize: '48px',
    marginBottom: '12px',
  });
  dropZoneIcon.textContent = '📁';
  dropZone.appendChild(dropZoneIcon);

  const dropZoneText = createElement('div', 'ss-file-upload-text');
  setStyles(dropZoneText, {
    fontSize: '14px',
    color: theme === 'dark' ? '#aaa' : '#666',
    marginBottom: '8px',
  });
  dropZoneText.textContent = '点击选择文件、拖拽文件到此处，或粘贴文件';
  dropZone.appendChild(dropZoneText);

  const dropZoneHint = createElement('div', 'ss-file-upload-hint');
  setStyles(dropZoneHint, {
    fontSize: '12px',
    color: theme === 'dark' ? '#777' : '#999',
  });
  const acceptText = accept && accept.length > 0 ? `支持格式: ${accept.join(', ')}` : '支持任意文件';
  const sizeText = `单个文件最大 ${formatFileSize(maxFileSize)}`;
  dropZoneHint.textContent = `${acceptText} · ${sizeText}`;
  dropZone.appendChild(dropZoneHint);

  // 隐藏的文件输入框
  const fileInput = createElement('input', 'ss-file-upload-input') as HTMLInputElement;
  fileInput.type = 'file';
  fileInput.multiple = true;
  if (accept && accept.length > 0) {
    fileInput.accept = accept.join(',');
  }
  setStyles(fileInput, {
    position: 'absolute',
    opacity: '0',
    width: '0',
    height: '0',
  });
  dropZone.appendChild(fileInput);

  content.appendChild(dropZone);

  // 文件列表容器
  const fileListContainer = createElement('div', 'ss-file-upload-list');
  setStyles(fileListContainer, {
    marginTop: '16px',
    display: 'none',
  });
  content.appendChild(fileListContainer);

  dialog.appendChild(content);

  // 底部按钮栏
  const footer = createElement('div', 'ss-file-upload-footer');
  setStyles(footer, {
    padding: '16px 20px',
    borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8e8e8'}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  });

  const cancelBtn = createElement('button', 'ss-file-upload-btn ss-file-upload-btn-cancel');
  setStyles(cancelBtn, {
    padding: '8px 16px',
    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d9d9d9'}`,
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#e0e0e0' : '#333',
    cursor: 'pointer',
    fontSize: '14px',
  });
  cancelBtn.textContent = '取消';
  cancelBtn.addEventListener('click', () => {
    if (!isUploading) {
      closeDialog();
      onCancel?.();
    }
  });
  footer.appendChild(cancelBtn);

  const uploadBtn = createElement('button', 'ss-file-upload-btn ss-file-upload-btn-primary');
  setStyles(uploadBtn, {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#1890ff',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  });
  uploadBtn.textContent = '开始上传';
  uploadBtn.disabled = true;
  setStyles(uploadBtn, {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#1890ff',
    color: '#fff',
    cursor: 'not-allowed',
    fontSize: '14px',
    opacity: '0.6',
  });
  footer.appendChild(uploadBtn);

  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  currentDialog = overlay;

  // 更新上传按钮状态
  function updateUploadButton() {
    const hasPendingFiles = pendingFiles.some(f => f.status === 'pending');
    uploadBtn.disabled = !hasPendingFiles || isUploading;
    setStyles(uploadBtn, {
      opacity: hasPendingFiles && !isUploading ? '1' : '0.6',
      cursor: hasPendingFiles && !isUploading ? 'pointer' : 'not-allowed',
    });
    uploadBtn.textContent = isUploading ? '上传中...' : '开始上传';
  }

  // 渲染文件列表
  function renderFileList() {
    if (pendingFiles.length === 0) {
      fileListContainer.style.display = 'none';
      updateUploadButton();
      return;
    }

    fileListContainer.style.display = 'block';
    fileListContainer.innerHTML = '';

    pendingFiles.forEach((item, index) => {
      const fileItem = createElement('div', 'ss-file-upload-item');
      setStyles(fileItem, {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
        borderRadius: '6px',
        marginBottom: '8px',
        gap: '10px',
      });

      // 文件图标
      const icon = createElement('span', 'ss-file-upload-item-icon');
      setStyles(icon, {
        fontSize: '20px',
        flexShrink: '0',
      });
      icon.textContent = getFileIcon(item.file);
      fileItem.appendChild(icon);

      // 文件信息
      const info = createElement('div', 'ss-file-upload-item-info');
      setStyles(info, {
        flex: '1',
        minWidth: '0',
      });

      const name = createElement('div', 'ss-file-upload-item-name');
      setStyles(name, {
        fontSize: '13px',
        color: theme === 'dark' ? '#e0e0e0' : '#333',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      });
      name.textContent = item.file.name;
      name.title = item.file.name;
      info.appendChild(name);

      const size = createElement('div', 'ss-file-upload-item-size');
      setStyles(size, {
        fontSize: '11px',
        color: theme === 'dark' ? '#888' : '#999',
        marginTop: '2px',
      });
      size.textContent = formatFileSize(item.file.size);
      info.appendChild(size);

      // 进度条或状态
      if (item.status === 'uploading') {
        const progressContainer = createElement('div', 'ss-file-upload-progress');
        setStyles(progressContainer, {
          width: '80px',
          height: '4px',
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e8e8e8',
          borderRadius: '2px',
          overflow: 'hidden',
        });
        const progressBar = createElement('div', 'ss-file-upload-progress-bar');
        setStyles(progressBar, {
          width: `${item.progress || 0}%`,
          height: '100%',
          backgroundColor: '#1890ff',
          transition: 'width 0.3s',
        });
        progressContainer.appendChild(progressBar);
        info.appendChild(progressContainer);
      } else if (item.status === 'success') {
        const status = createElement('div', 'ss-file-upload-item-status');
        setStyles(status, {
          fontSize: '11px',
          color: '#52c41a',
          marginTop: '2px',
        });
        status.textContent = '✓ 上传成功';
        info.appendChild(status);
      } else if (item.status === 'error') {
        const status = createElement('div', 'ss-file-upload-item-status');
        setStyles(status, {
          fontSize: '11px',
          color: '#ff4d4f',
          marginTop: '2px',
        });
        status.textContent = `✗ ${item.error || '上传失败'}`;
        info.appendChild(status);
      }

      fileItem.appendChild(info);

      // 删除按钮
      if (item.status !== 'uploading') {
        const deleteBtn = createElement('button', 'ss-file-upload-item-delete');
        setStyles(deleteBtn, {
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          color: theme === 'dark' ? '#888' : '#999',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
        });
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '移除';
        deleteBtn.addEventListener('click', () => {
          if (!isUploading) {
            pendingFiles.splice(index, 1);
            renderFileList();
          }
        });
        fileItem.appendChild(deleteBtn);
      }

      fileListContainer.appendChild(fileItem);
    });

    updateUploadButton();
  }

  // 添加文件到列表
  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // 检查文件数量限制
      if (pendingFiles.length >= maxFiles) {
        return;
      }

      // 检查文件类型
      if (!validateFileType(file, accept)) {
        alert(`文件 "${file.name}" 类型不支持`);
        return;
      }

      // 检查文件大小
      if (file.size > maxFileSize) {
        alert(`文件 "${file.name}" 超过大小限制 (${formatFileSize(maxFileSize)})`);
        return;
      }

      // 检查重复文件
      const isDuplicate = pendingFiles.some(p => 
        p.file.name === file.name && p.file.size === file.size
      );
      if (isDuplicate) return;

      pendingFiles.push({
        file,
        id: generateId(),
        status: 'pending',
      });
    });

    renderFileList();
  }

  // 执行上传
  async function doUpload() {
    if (isUploading) return;

    isUploading = true;
    updateUploadButton();
    cancelBtn.disabled = true;
    setStyles(cancelBtn, {
      opacity: '0.6',
      cursor: 'not-allowed',
    });

    const results: FileUploadResult[] = [];

    for (const item of pendingFiles) {
      if (item.status !== 'pending') continue;

      item.status = 'uploading';
      item.progress = 0;
      renderFileList();

      try {
        let result: FileUploadResult;

        if (onUpload) {
          // 使用自定义上传函数
          result = await onUpload(item.file);
        } else {
          // 使用默认上传（base64/blob URL）
          result = await defaultUpload(item.file);
        }

        item.status = 'success';
        item.result = result;
        item.progress = 100;
        results.push(result);
      } catch (error) {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : '上传失败';
      }

      renderFileList();
    }

    isUploading = false;
    updateUploadButton();

    // 如果有成功上传的文件，触发回调并关闭弹窗
    if (results.length > 0) {
      onSuccess?.(results);
      setTimeout(() => {
        closeDialog();
      }, 500);
    }
  }

  // 默认上传函数
  async function defaultUpload(file: File): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
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

  // 关闭弹窗
  function closeDialog() {
    if (currentDialog) {
      currentDialog.remove();
      currentDialog = null;
    }
  }

  // 事件监听

  // 点击拖拽区域触发文件选择
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  // 文件选择变化
  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = ''; // 重置以便可以再次选择相同文件
  });

  // 拖拽事件
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStyles(dropZone, {
      borderColor: '#1890ff',
      backgroundColor: theme === 'dark' ? 'rgba(24,144,255,0.1)' : '#e6f7ff',
    });
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStyles(dropZone, {
      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d9d9d9',
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa',
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStyles(dropZone, {
      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#d9d9d9',
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa',
    });
    addFiles(e.dataTransfer?.files || null);
  });

  // 粘贴事件处理函数
  const handlePaste = (e: ClipboardEvent) => {
    console.log('[FileUploadDialog] Paste event triggered', e);
    
    // 检查剪贴板数据
    const clipboardData = e.clipboardData;
    if (!clipboardData) {
      console.log('[FileUploadDialog] No clipboard data');
      return;
    }

    const items = clipboardData.items;
    const files: File[] = [];
    
    console.log('[FileUploadDialog] Clipboard items:', items?.length);
    
    if (items) {
      for (let i = 0; i < items.length; i++) {
        console.log('[FileUploadDialog] Item kind:', items[i].kind, 'type:', items[i].type);
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            console.log('[FileUploadDialog] Got file:', file.name);
            files.push(file);
          }
        }
      }
    }

    // 也尝试从 files 属性获取（某些浏览器支持）
    if (files.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        files.push(clipboardData.files[i]);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[FileUploadDialog] Adding files:', files.length);
      const dataTransfer = new DataTransfer();
      files.forEach(f => dataTransfer.items.add(f));
      addFiles(dataTransfer.files);
    } else {
      console.log('[FileUploadDialog] No files found in clipboard');
    }
  };

  // 绑定粘贴事件到多个元素以确保捕获
  // 1. 绑定到 document（全局捕获）
  document.addEventListener('paste', handlePaste, true); // 使用捕获阶段
  
  // 2. 绑定到弹窗容器
  dialog.addEventListener('paste', handlePaste);
  
  // 3. 绑定到拖拽区域
  dropZone.addEventListener('paste', handlePaste);
  
  // 4. 让拖拽区域可以聚焦以接收键盘事件
  dropZone.setAttribute('tabindex', '0');
  
  // 自动聚焦到拖拽区域
  setTimeout(() => {
    dropZone.focus();
  }, 100);

  // 清理函数
  const cleanup = () => {
    document.removeEventListener('paste', handlePaste, true);
    dialog.removeEventListener('paste', handlePaste);
    dropZone.removeEventListener('paste', handlePaste);
  };

  // 点击遮罩层关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !isUploading) {
      closeDialog();
      cleanup();
      onCancel?.();
    }
  });

  // 上传按钮点击
  uploadBtn.addEventListener('click', () => {
    if (!uploadBtn.disabled) {
      doUpload();
    }
  });

  // ESC 键关闭
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isUploading) {
      closeDialog();
      cleanup();
      onCancel?.();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

/**
 * 关闭文件上传弹窗
 */
export function closeFileUploadDialog(): void {
  if (currentDialog) {
    currentDialog.remove();
    currentDialog = null;
  }
}
