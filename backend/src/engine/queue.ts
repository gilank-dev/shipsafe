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
   * Run a task respecting the concurrency limit.
   * If a slot is available (< 3), runs immediately.
   * Otherwise waits in the FIFO queue until a slot frees up.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
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
        `Server antrean penuh (${this.maxConcurrent} proses aktif, ${this.queue.length} menunggu). Silakan coba sesaat lagi.`
      );
      err.code = 'QUEUE_FULL';
      err.statusCode = 429;
      throw err;
    }

    // Enqueue the request
    return new Promise<T>((resolve, reject) => {
      const id = `Q-${Math.random().toString(36).substring(2, 9)}`;
      
      const timeoutTimer = setTimeout(() => {
        // Remove from queue if timeout expires before getting a slot
        const idx = this.queue.findIndex(item => item.id === id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          const timeoutErr: any = new Error(
            'Batas waktu antrean terlampaui (60s). Server sedang memproses audit pengguna lain.'
          );
          timeoutErr.code = 'QUEUE_TIMEOUT';
          timeoutErr.statusCode = 504;
          reject(timeoutErr);
        }
      }, this.queueTimeoutMs);

      this.queue.push({
        id,
        task,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        timeoutTimer
      });

      console.log(`[ShipSafe Queue] Request masuk antrean [${id}]. Posisi antrean: ${this.queue.length}. Pekerja aktif: ${this.activeCount}/${this.maxConcurrent}`);
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

    console.log(`[ShipSafe Queue] Menjalankan antrean [${nextItem.id}]. Pekerja aktif: ${this.activeCount}/${this.maxConcurrent}. Sisa antrean: ${this.queue.length}`);

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
