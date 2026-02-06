/**
 * 渲染器导出
 */

export { BaseRenderer } from './BaseRenderer';
export { TextRenderer } from './TextRenderer';
export { NumberRenderer } from './NumberRenderer';
export { DateRenderer } from './DateRenderer';
export { LinkRenderer } from './LinkRenderer';
export { ImageRenderer } from './ImageRenderer';
export { TagRenderer } from './TagRenderer';
export { ProgressRenderer } from './ProgressRenderer';
export { RatingRenderer } from './RatingRenderer';
export { CheckboxRenderer } from './CheckboxRenderer';
export { SelectRenderer } from './SelectRenderer';
export { ButtonRenderer } from './ButtonRenderer';

// 新增渲染器
export { EmailRenderer } from './EmailRenderer';
export { PhoneRenderer } from './PhoneRenderer';
export { MultiLinkRenderer } from './MultiLinkRenderer';
export { FileRenderer } from './FileRenderer';

// 导出 wrapText 高度预计算相关函数
export {
  precalculateRowHeights,
  cleanupMeasurementContainer,
  setPrecalculateMode,
  isPrecalculateMode,
} from './TextRenderer';

