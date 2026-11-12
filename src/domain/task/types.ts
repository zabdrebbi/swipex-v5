export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** `deleted` is a soft delete kept in the trash until it is purged. */
export type TaskStatus = 'pending' | 'completed' | 'deleted';

/** A reminder/task, optionally linked to a parcel by tracking number. */
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Due day, `YYYY-MM-DD`. */
  dueDate?: string;
  /** Due time, `HH:mm`. */
  dueTime?: string;
  notes?: string;
  /** Linked parcel tracking (may reference a parcel not in the current list). */
  tracking?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

/** Sort weight for display ordering (lower = more urgent = shown first). */
export function priorityWeight(priority: TaskPriority): number {
  switch (priority) {
    case 'urgent':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    case 'low':
      return 3;
  }
}

export function isOverdue(task: Task, today: string): boolean {
  return task.status === 'pending' && task.dueDate !== undefined && task.dueDate < today;
}

export function isDueToday(task: Task, today: string): boolean {
  return task.status === 'pending' && task.dueDate === today;
}
