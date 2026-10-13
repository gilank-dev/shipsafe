import { describe, it, expect, vi } from 'vitest';
import { AuditQueue } from './queue';

describe('AuditQueue Concurrency Limiter', () => {
  it('allows up to 3 concurrent tasks to execute simultaneously', async () => {
    const queue = new AuditQueue(3, 10, 5000);
    let running = 0;
    let maxObservedRunning = 0;

    const createTask = (delayMs: number) => () =>
      queue.run(async () => {
        running++;
        if (running > maxObservedRunning) {
          maxObservedRunning = running;
        }
        await new Promise((res) => setTimeout(res, delayMs));
        running--;
        return 'done';
      });

    // Launch 6 tasks simultaneously
    const tasks = [
      createTask(50)(),
      createTask(50)(),
      createTask(50)(),
      createTask(50)(),
      createTask(50)(),
      createTask(50)(),
    ];

    const results = await Promise.all(tasks);
    expect(results).toHaveLength(6);
    expect(maxObservedRunning).toBe(3); // Never exceeded concurrency limit of 3!
  });

  it('reports correct live queue stats', () => {
    const queue = new AuditQueue(3, 25, 60000);
    const stats = queue.stats;
    expect(stats.maxConcurrency).toBe(3);
    expect(stats.activeWorkers).toBe(0);
    expect(stats.waitingInQueue).toBe(0);
    expect(stats.capacity).toBe(25);
    expect(stats.isAccepting).toBe(true);
  });

  it('rejects with 429 QUEUE_FULL when capacity is saturated', async () => {
    // 1 concurrent worker, 1 queue capacity
    const queue = new AuditQueue(1, 1, 5000);
    let releaseBlocker: () => void = () => {};
    const blockerPromise = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });

    // Task 1: occupies the 1 active worker slot
    const task1 = queue.run(() => blockerPromise);
    // Task 2: occupies the 1 waiting slot in queue
    const task2 = queue.run(() => blockerPromise);

    // Task 3: queue is full, must throw immediately with 429
    await expect(queue.run(async () => 'overflow')).rejects.toMatchObject({
      code: 'QUEUE_FULL',
      statusCode: 429,
    });

    releaseBlocker();
    await Promise.allSettled([task1, task2]);
  });
});
