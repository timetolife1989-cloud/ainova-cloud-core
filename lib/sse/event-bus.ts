/**
 * Server-Sent Events — Event Bus
 * In-memory pub/sub for real-time dashboard updates.
 */

type Listener = (event: SseEvent) => void;

export interface SseEvent {
  type: string;
  moduleId?: string;
  data: unknown;
  timestamp?: string;
}

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(channel: string, listener: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);

    return () => {
      this.listeners.get(channel)?.delete(listener);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, event: SseEvent): void {
    event.timestamp = event.timestamp ?? new Date().toISOString();
    this.listeners.get(channel)?.forEach(fn => fn(event));
    // Also publish to wildcard channel
    this.listeners.get('*')?.forEach(fn => fn(event));
  }

  getChannelCount(): number {
    return this.listeners.size;
  }

  getListenerCount(channel: string): number {
    return this.listeners.get(channel)?.size ?? 0;
  }
}

// Singleton
let _bus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!_bus) _bus = new EventBus();
  return _bus;
}

/**
 * Emit a module data change event.
 */
export function emitModuleEvent(moduleId: string, type: 'created' | 'updated' | 'deleted', data: unknown): void {
  getEventBus().publish(`module:${moduleId}`, {
    type: `${moduleId}.${type}`,
    moduleId,
    data,
  });
}
