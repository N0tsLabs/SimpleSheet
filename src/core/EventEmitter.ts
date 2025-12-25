/**
 * 事件发射器基类
 * 提供事件订阅、发布、取消订阅功能
 */

type EventHandler<T = any> = (data: T) => void;

export class EventEmitter<EventMap extends Record<string, any> = Record<string, any>> {
  private events: Map<keyof EventMap, Set<EventHandler>> = new Map();

  /**
   * 订阅事件
   */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 一次性订阅事件
   */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const onceHandler: EventHandler<EventMap[K]> = (data) => {
      this.off(event, onceHandler);
      handler(data);
    };
    return this.on(event, onceHandler);
  }

  /**
   * 取消订阅事件
   */
  off<K extends keyof EventMap>(event: K, handler?: EventHandler<EventMap[K]>): void {
    if (!handler) {
      // 移除该事件的所有处理器
      this.events.delete(event);
    } else {
      this.events.get(event)?.delete(handler);
    }
  }

  /**
   * 发布事件
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      });
    }
  }

  /**
   * 检查是否有事件监听器
   */
  hasListeners<K extends keyof EventMap>(event: K): boolean {
    const handlers = this.events.get(event);
    return handlers ? handlers.size > 0 : false;
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.events.get(event)?.size ?? 0;
  }

  /**
   * 清除所有事件监听器
   */
  removeAllListeners(): void {
    this.events.clear();
  }
}

