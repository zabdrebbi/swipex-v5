import { describe, expect, it } from 'vitest';
import { isDueToday, isOverdue, priorityWeight } from '../task/types';
import { taskFromDoc, taskToDoc } from './convertTask';

const NOW = '2026-11-12T10:00:00.000Z';

describe('task converters', () => {
  it('round-trips a task', () => {
    const task = taskFromDoc('t1', {
      title: 'Call customer',
      description: 'ask about address',
      priority: 'urgent',
      status: 'pending',
      dueDate: '2026-11-13',
      dueTime: '09:30',
      notes: 'after 9am',
      tracking: 'YAL123',
      createdAt: NOW,
      updatedAt: NOW,
    }, NOW);
    expect(taskToDoc(task)).toEqual(task);
  });

  it('falls back to safe defaults for malformed input', () => {
    const task = taskFromDoc('t2', {
      title: 'x',
      priority: 'critical',
      status: 'archived',
      dueDate: '13/11/2026',
      dueTime: '9h30',
      createdAt: 'bad',
    }, NOW);
    expect(task.priority).toBe('medium');
    expect(task.status).toBe('pending');
    expect(task.dueDate).toBeUndefined();
    expect(task.dueTime).toBeUndefined();
    expect(task.createdAt).toBe(NOW);
  });

  it('drops completedAt unless the task is completed', () => {
    const pending = taskFromDoc('t3', { title: 'x', completedAt: NOW }, NOW);
    expect(pending.completedAt).toBeUndefined();
    const done = taskFromDoc('t4', { title: 'x', status: 'completed', completedAt: NOW }, NOW);
    expect(done.completedAt).toBe(NOW);
  });
});

describe('task helpers', () => {
  const base = { id: '1', title: 'x', priority: 'medium' as const, status: 'pending' as const, createdAt: NOW, updatedAt: NOW };

  it('orders priorities from urgent to low', () => {
    expect(priorityWeight('urgent')).toBeLessThan(priorityWeight('high'));
    expect(priorityWeight('high')).toBeLessThan(priorityWeight('medium'));
    expect(priorityWeight('medium')).toBeLessThan(priorityWeight('low'));
  });

  it('detects overdue and due-today only for pending tasks', () => {
    const overdue = { ...base, dueDate: '2026-11-11' };
    expect(isOverdue(overdue, '2026-11-12')).toBe(true);
    expect(isOverdue({ ...overdue, status: 'completed' }, '2026-11-12')).toBe(false);
    expect(isDueToday({ ...base, dueDate: '2026-11-12' }, '2026-11-12')).toBe(true);
    expect(isDueToday({ ...base }, '2026-11-12')).toBe(false);
  });
});
