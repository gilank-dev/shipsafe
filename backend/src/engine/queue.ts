/**
 * Concurrency Queue Limiter
 * Ensures at most MAX_CONCURRENT (3) audits run at any given moment.
 * If more requests arrive, they are placed in a FIFO queue so the VPS server does not overload.
 */

export interface QueueStatus {
  activeWorkers: number;
  maxConcurrency: number;
  waitingInQueue: number;
  capacity: number;
  isAccepting: boolean;
}

interface QueuedItem<T> {
  id: string;
  task: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  priority: number;
  enqueuedAt: number;
  timeoutTimer: NodeJS.Timeout;
}

export class AuditQueue {
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly maxQueueLength: number;
  private readonly queueTimeoutMs: number;
  private queue: QueuedItem<any>[] = [];

  constructor(
    maxConcurrent: number = 3,
    maxQueueLength: number = 25,
    queueTimeoutMs: number = 60000 // 60 seconds max wait in queue
  ) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueLength = maxQueueLength;
    this.queueTimeoutMs = queueTimeoutMs;
  }

  get stats(): QueueStatus {
    return {
      activeWorkers: this.activeCount,
      maxConcurrency: this.maxConcurrent,
      waitingInQueue: this.queue.length,
      capacity: this.maxQueueLength,
      isAccepting: this.queue.length < this.maxQueueLength
    };
  }

  /**
   * Run a task respecting concurrency and tier priority.
   * Higher priority weight (Enterprise=3, Pro=2, Free=1) dequeues first while preserving FIFO order within same priority.
   */
  async run<T>(task: () => Promise<T>, priority: number = 1): Promise<T> {
    // If we have an available worker slot, execute immediately!
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      try {
        return await task();
      } finally {
        this.activeCount--;
        this.dispatchNext();
      }
    }

    // Check if the waiting queue is saturated
    if (this.queue.length >= this.maxQueueLength) {
      const err: any = new Error(
        `Server queue is full (${this.maxConcurrent} active tasks, ${this.queue.length} waiting). Please try again shortly.`
      );
      err.code = 'QUEUE_FULL';
      err.statusCode = 429;
      throw err;
    }

    // Enqueue the request based on priority (higher priority inserted ahead of lower priority, FIFO for same priority)
    return new Promise<T>((resolve, reject) => {
      const id = `Q-${Math.random().toString(36).substring(2, 9)}`;
      
      const timeoutTimer = setTimeout(() => {
        // Remove from queue if timeout expires before getting a slot
        const idx = this.queue.findIndex(item => item.id === id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          const timeoutErr: any = new Error(
            'Queue timeout exceeded (60s). The server is currently processing audits for other users.'
          );
          timeoutErr.code = 'QUEUE_TIMEOUT';
          timeoutErr.statusCode = 504;
          reject(timeoutErr);
        }
      }, this.queueTimeoutMs);

      const newItem: QueuedItem<T> = {
        id,
        task,
        resolve,
        reject,
        priority,
        enqueuedAt: Date.now(),
        timeoutTimer
      };

      const insertIdx = this.queue.findIndex(item => item.priority < priority);
      if (insertIdx === -1) {
        this.queue.push(newItem);
      } else {
        this.queue.splice(insertIdx, 0, newItem);
      }

      console.log(`[ShipSafe Queue] Request enqueued [${id}] (Priority: ${priority}). Queue position: ${this.queue.length}. Active workers: ${this.activeCount}/${this.maxConcurrent}`);
    });
  }

  private dispatchNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    clearTimeout(nextItem.timeoutTimer);
    this.activeCount++;

    console.log(`[ShipSafe Queue] Executing queued task [${nextItem.id}]. Active workers: ${this.activeCount}/${this.maxConcurrent}. Remaining in queue: ${this.queue.length}`);

    nextItem.task()
      .then(res => nextItem.resolve(res))
      .catch(err => nextItem.reject(err))
      .finally(() => {
        this.activeCount--;
        this.dispatchNext();
      });
  }
}

// Global Singleton Queue for audit processing: Max 3 concurrent audits
export const globalAuditQueue = new AuditQueue(3, 25, 60000);
