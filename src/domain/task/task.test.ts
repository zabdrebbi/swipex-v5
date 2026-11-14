import { describe, expect, it } from 'vitest';
import type { Task, TaskPriority, TaskStatus } from './types';
import {
  compareTasks,
  matchesTaskFilter,
  matchesTaskSearch,
  sortTasks,
  sortTrash,
  taskCounts,
  visibleTasks,
} from './query';

let seq = 0;
function task(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `id-${seq}`,
    title: 'Call the client',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const ids = (tasks: readonly Task[]) => tasks.map((t) => t.id);

describe('sortTasks', () => {
  it('places pending tasks before completed ones', () => {
    const done = task({ id: 'done', status: 'completed', completedAt: '2026-01-05T00:00:00.000Z' });
    const pending = task({ id: 'pending', dueDate: '2026-12-31' });
    expect(ids(sortTasks([done, pending]))).toEqual(['pending', 'done']);
  });

  it('orders pending by due date, undated tasks last', () => {
    const none = task({ id: 'none' });
    const late = task({ id: 'late', dueDate: '2026-03-01' });
    const early = task({ id: 'early', dueDate: '2026-02-01' });
    expect(ids(sortTasks([none, late, early]))).toEqual(['early', 'late', 'none']);
  });

  it('breaks same-day ties by due time, timeless tasks last', () => {
    const timeless = task({ id: 'timeless', dueDate: '2026-02-01' });
    const evening = task({ id: 'evening', dueDate: '2026-02-01', dueTime: '18:00' });
    const morning = task({ id: 'morning', dueDate: '2026-02-01', dueTime: '08:00' });
    expect(ids(sortTasks([timeless, evening, morning]))).toEqual(['morning', 'evening', 'timeless']);
  });

  it('breaks remaining ties by priority (urgent first), then newest created', () => {
    const low = task({ id: 'low', dueDate: '2026-02-01', priority: 'low', createdAt: '2026-01-09T00:00:00.000Z' });
    const urgent = task({
      id: 'urgent',
      dueDate: '2026-02-01',
      priority: 'urgent',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const newer = task({
      id: 'newer',
      dueDate: '2026-02-01',
      priority: 'low',
      createdAt: '2026-01-10T00:00:00.000Z',
    });
    expect(ids(sortTasks([low, urgent, newer]))).toEqual(['urgent', 'newer', 'low']);
  });

  it('orders completed by completion time, newest first, updatedAt as fallback', () => {
    const older = task({
      id: 'older',
      status: 'completed',
      completedAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-08T00:00:00.000Z',
    });
    const newer = task({ id: 'newer', status: 'completed', completedAt: '2026-01-03T00:00:00.000Z' });
    const noStamp = task({
      id: 'noStamp',
      status: 'completed',
      updatedAt: '2026-01-04T00:00:00.000Z',
    });
    // Newest stamp first: noStamp (04 via updatedAt) > newer (03) > older (02).
    expect(ids(sortTasks([older, newer, noStamp]))).toEqual(['noStamp', 'newer', 'older']);
  });
});

describe('matchesTaskSearch', () => {
  it('matches title, description, notes and tracking case-insensitively', () => {
    expect(matchesTaskSearch(task({ title: 'Buy boxes' }), 'BOX')).toBe(true);
    expect(matchesTaskSearch(task({ description: 'From the depot' }), 'depot')).toBe(true);
    expect(matchesTaskSearch(task({ notes: 'Urgent delivery' }), 'urgent')).toBe(true);
    expect(matchesTaskSearch(task({ tracking: 'TRK-42' }), 'trk-42')).toBe(true);
    expect(matchesTaskSearch(task({ title: 'Buy boxes' }), 'parcel')).toBe(false);
  });

  it('treats a blank query as a match', () => {
    expect(matchesTaskSearch(task(), '   ')).toBe(true);
  });
});

describe('filters and counts', () => {
  const tasks = [
    task({ id: 'p1', status: 'pending' }),
    task({ id: 'p2', status: 'pending', title: 'Ship the parcel' }),
    task({ id: 'c1', status: 'completed', completedAt: '2026-01-02T00:00:00.000Z' }),
    task({ id: 'd1', status: 'deleted' }),
  ];

  it('keeps soft-deleted tasks out of every tab', () => {
    expect(matchesTaskFilter(tasks[3], 'all')).toBe(false);
    expect(matchesTaskFilter(tasks[3], 'pending')).toBe(false);
    expect(matchesTaskFilter(tasks[3], 'completed')).toBe(false);
  });

  it('counts each bucket including the trash', () => {
    expect(taskCounts(tasks)).toEqual({ total: 3, pending: 2, completed: 1, trash: 1 });
  });

  it('applies filter and search together in visibleTasks', () => {
    expect(ids(visibleTasks(tasks, 'all', ''))).toEqual(['p1', 'p2', 'c1']);
    expect(ids(visibleTasks(tasks, 'pending', 'parcel'))).toEqual(['p2']);
    expect(ids(visibleTasks(tasks, 'completed', ''))).toEqual(['c1']);
  });
});

describe('sortTrash', () => {
  it('sorts deleted tasks by newest updatedAt first', () => {
    const older = task({ id: 'older', status: 'deleted', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = task({ id: 'newer', status: 'deleted', updatedAt: '2026-01-07T00:00:00.000Z' });
    expect(ids(sortTrash([older, newer]))).toEqual(['newer', 'older']);
  });
});

describe('compareTasks purity', () => {
  it('does not mutate the input array', () => {
    const list = [task({ id: 'b' }), task({ id: 'a' })];
    const before = ids(list);
    sortTasks(list);
    expect(ids(list)).toEqual(before);
    expect(typeof compareTasks(list[0], list[1])).toBe('number');
  });
});
