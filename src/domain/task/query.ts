import type { Task } from './types';
import { priorityWeight } from './types';

/** Tab filter; the trash is never part of any tab (v4). */
export type TaskListFilter = 'all' | 'pending' | 'completed';

export interface TaskCounts {
  /** Non-deleted tasks (pending + completed). */
  total: number;
  pending: number;
  completed: number;
  /** Soft-deleted tasks kept in the trash. */
  trash: number;
}

/** Sort keys for "no due date / no due time" pushed to the end (v4). */
const NO_DATE = '9999-99-99';
const NO_TIME = '99:99';

/**
 * v4's `sortForDisplay`:
 *  - pending first: due date ASC (undated last), due time ASC (timeless last),
 *    priority weight ASC (urgent first), then newest created first;
 *  - completed after: newest completion first (falling back to updatedAt),
 *    then newest created first.
 * Pure: never mutates the input.
 */
export function compareTasks(a: Task, b: Task): number {
  const aRank = a.status === 'pending' ? 0 : 1;
  const bRank = b.status === 'pending' ? 0 : 1;
  if (aRank !== bRank) return aRank - bRank;

  if (a.status === 'pending') {
    const aDate = a.dueDate ?? NO_DATE;
    const bDate = b.dueDate ?? NO_DATE;
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;

    const aTime = a.dueTime ?? NO_TIME;
    const bTime = b.dueTime ?? NO_TIME;
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;

    const weight = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (weight !== 0) return weight;
  } else {
    const aDone = a.completedAt ?? a.updatedAt;
    const bDone = b.completedAt ?? b.updatedAt;
    if (aDone !== bDone) return aDone < bDone ? 1 : -1;
  }

  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Display order (pending section first, completed after). */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareTasks);
}

/** Trash order: newest change first (v4). */
export function sortTrash(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Case-insensitive match over title, description, notes and tracking (v4). */
export function matchesTaskSearch(task: Task, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [task.title, task.description, task.notes, task.tracking].some((field) =>
    (field ?? '').toLowerCase().includes(needle),
  );
}

/** Tab membership: soft-deleted tasks belong to no tab. */
export function matchesTaskFilter(task: Task, filter: TaskListFilter): boolean {
  if (task.status === 'deleted') return false;
  if (filter === 'all') return true;
  return task.status === filter;
}

/** The list a tab renders: filter -> search -> display order. */
export function visibleTasks(
  tasks: readonly Task[],
  filter: TaskListFilter,
  query: string,
): Task[] {
  return sortTasks(tasks.filter((task) => matchesTaskFilter(task, filter) && matchesTaskSearch(task, query)));
}

export function taskCounts(tasks: readonly Task[]): TaskCounts {
  let pending = 0;
  let completed = 0;
  let trash = 0;
  for (const task of tasks) {
    if (task.status === 'deleted') trash += 1;
    else if (task.status === 'completed') completed += 1;
    else pending += 1;
  }
  return { total: pending + completed, pending, completed, trash };
}
