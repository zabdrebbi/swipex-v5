import { useEffect, useState } from 'react';
import { Calendar, Check, Clock, Package, StickyNote, Trash2 } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { isDueToday, isOverdue, type Task, type TaskPriority } from '@/domain/task/types';
import SwipeableCard from '@/components/swipe/SwipeableCard';

/** Swipe distance that triggers an action on a task card (v4 tasks). */
const TASK_SWIPE_PX = 72;
/** How long the armed delete bar waits for confirmation before disarming. */
const ARM_MS = 6000;

const PRIORITY_KEY: Record<TaskPriority, TranslationKey> = {
  low: 'task_priority.low',
  medium: 'task_priority.medium',
  high: 'task_priority.high',
  urgent: 'task_priority.urgent',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-600',
};

interface TaskCardProps {
  task: Task;
  /** Local `YYYY-MM-DD` used for the overdue / today badges. */
  today: string;
  /** Opens the composer (card body click). */
  onEdit: (task: Task) => void;
  /** Checkbox + right swipe: pending -> completed (undo toast lives in the page). */
  onToggle: (task: Task) => void;
  /** Confirmed delete from the armed bar (undo toast lives in the page). */
  onDelete: (task: Task) => void;
}

/**
 * One task row: completion circle, title/description/notes, priority and due
 * badges, linked-tracking chip. Gestures (v4): swipe right = complete with a
 * green pulse, swipe left = ARM a 6-second delete bar (never deletes
 * immediately); tapping the body opens the editor.
 */
export default function TaskCard({ task, today, onEdit, onToggle, onDelete }: TaskCardProps) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [progress, setProgress] = useState(100);
  const completed = task.status === 'completed';
  const overdue = isOverdue(task, today);
  const dueToday = isDueToday(task, today);

  // The armed bar auto-disarms after its window.
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), ARM_MS);
    return () => window.clearTimeout(id);
  }, [armed]);

  // Countdown line: start full, then shrink over the whole window.
  useEffect(() => {
    if (!armed) {
      setProgress(100);
      return;
    }
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setProgress(0));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [armed]);

  function completeWithPulse() {
    if (completed) {
      onToggle(task);
      return;
    }
    setPulse(true);
    window.setTimeout(() => setPulse(false), 600);
    onToggle(task);
  }

  const meta: TranslationKey[] = [];
  if (overdue) meta.push('tasks.badge_overdue');
  else if (dueToday) meta.push('tasks.badge_today');

  return (
    <SwipeableCard
      threshold={TASK_SWIPE_PX}
      onSwipeRight={completeWithPulse}
      onSwipeLeft={() => setArmed(true)}
      leftReveal={
        <>
          <Check className="size-5" />
          <span>{t('tasks.reveal_complete')}</span>
        </>
      }
      rightReveal={
        <>
          <Trash2 className="size-5" />
          <span>{t('parcels.card.delete')}</span>
        </>
      }
    >
      <article
        onClick={() => onEdit(task)}
        className={`relative overflow-hidden rounded-2xl border bg-white p-4 dark:bg-gray-900 ${
          overdue ? 'border-red-300 dark:border-red-900' : 'border-gray-200 dark:border-gray-800'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              completeWithPulse();
            }}
            aria-pressed={completed}
            aria-label={completed ? t('tasks.uncomplete') : t('tasks.reveal_complete')}
            className={`relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${
              completed
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-gray-300 text-transparent hover:border-gray-400 dark:border-gray-600'
            }`}
          >
            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
            {pulse && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-emerald-400 animate-ping"
              />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2
                className={`text-sm font-bold leading-snug ${completed ? 'text-gray-400 line-through dark:text-gray-500' : ''}`}
              >
                {task.title}
              </h2>
              <span
                className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                title={t('tasks.priority_label')}
              >
                <span className={`size-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
                {t(PRIORITY_KEY[task.priority])}
              </span>
            </div>

            {task.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
            )}
            {task.notes && (
              <p className="mt-0.5 flex items-center gap-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                <StickyNote className="size-3 shrink-0" aria-hidden="true" />
                {task.notes}
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold">
              {meta.map((key) => (
                <span
                  key={key}
                  className={`rounded-full px-2 py-0.5 text-white ${
                    key === 'tasks.badge_overdue' ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                >
                  {t(key)}
                </span>
              ))}
              {task.dueDate && (
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400" dir="ltr">
                  <Calendar className="size-3" aria-hidden="true" />
                  {task.dueDate}
                  {task.dueTime && (
                    <>
                      <Clock className="ms-1 size-3" aria-hidden="true" />
                      {task.dueTime}
                    </>
                  )}
                </span>
              )}
              {task.tracking && (
                <span
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  dir="ltr"
                  title={t('tasks.linked')}
                >
                  <Package className="size-3" aria-hidden="true" />
                  {task.tracking}
                </span>
              )}
            </div>
          </div>
        </div>

        {armed && (
          <div
            role="alertdialog"
            aria-label={t('tasks.delete_armed')}
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-0 z-10 flex flex-col justify-center gap-2 bg-red-600 p-4 text-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{t('tasks.delete_armed')}</p>
                <p className="text-[11px] font-medium text-red-100">{t('tasks.delete_hint')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setArmed(false)}
                  className="min-h-9 rounded-lg bg-white/15 px-3 text-xs font-bold hover:bg-white/25"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArmed(false);
                    onDelete(task);
                  }}
                  className="min-h-9 rounded-lg bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/30" aria-hidden="true">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${progress}%`, transition: `width ${ARM_MS}ms linear` }}
              />
            </div>
          </div>
        )}
      </article>
    </SwipeableCard>
  );
}
