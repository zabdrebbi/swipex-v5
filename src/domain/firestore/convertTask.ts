import type { Task, TaskPriority, TaskStatus } from '../task/types';
import { TASK_PRIORITIES } from '../task/types';
import { sanitizeRecord } from './serialize';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function isoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value === '') return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'completed', 'deleted'];

function normalizePriority(value: unknown): TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : 'medium';
}

function normalizeStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : 'pending';
}

/** `YYYY-MM-DD` (or undefined); anything else is dropped. */
function dayOrNull(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return value;
}

/** `HH:mm` (or undefined); anything else is dropped. */
function timeOrNull(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return undefined;
  return value;
}

export function taskFromDoc(id: string, data: Record<string, unknown>, now: string): Task {
  const task: Task = {
    id,
    title: str(data.title),
    priority: normalizePriority(data.priority),
    status: normalizeStatus(data.status),
    createdAt: isoDate(data.createdAt, now),
    updatedAt: isoDate(data.updatedAt, now),
  };
  const description = optStr(data.description);
  const notes = optStr(data.notes);
  const tracking = optStr(data.tracking);
  const dueDate = dayOrNull(data.dueDate);
  const dueTime = timeOrNull(data.dueTime);
  const completedAt = isoDate(data.completedAt, '') || undefined;
  if (description !== undefined) task.description = description;
  if (notes !== undefined) task.notes = notes;
  if (tracking !== undefined) task.tracking = tracking;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (dueTime !== undefined) task.dueTime = dueTime;
  if (task.status === 'completed' && completedAt !== undefined) task.completedAt = completedAt;
  return task;
}

export function taskToDoc(task: Task): Record<string, unknown> {
  return sanitizeRecord(task as unknown as Record<string, unknown>) as Record<string, unknown>;
}
