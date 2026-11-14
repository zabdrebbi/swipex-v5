import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import type { Task, TaskDraft, TaskPriority } from '@/domain/task/types';
import TaskParcelLink from './TaskParcelLink';

interface TaskComposerProps {
  /** Edit mode when provided; otherwise a new task. */
  task?: Task;
  /** Receives the built draft (undefined fields = cleared by a full write). */
  onSave: (draft: TaskDraft) => void;
  onClose: () => void;
}

const PRIORITY_KEY: Record<TaskPriority, TranslationKey> = {
  low: 'task_priority.low',
  medium: 'task_priority.medium',
  high: 'task_priority.high',
  urgent: 'task_priority.urgent',
};

/** Most urgent first (v4 order). */
const PRIORITY_ORDER: readonly TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

const PRIORITY_ACTIVE: Record<TaskPriority, string> = {
  low: 'border-gray-400 bg-gray-400',
  medium: 'border-blue-500 bg-blue-500',
  high: 'border-orange-500 bg-orange-500',
  urgent: 'border-red-600 bg-red-600',
};

const PRIORITY_INACTIVE: Record<TaskPriority, string> = {
  low: 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300',
  medium: 'border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300',
  high: 'border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300',
  urgent: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-300',
};

const fieldClass =
  'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950';

/**
 * Add/edit task modal. The ONLY validation is a non-empty title; dates and
 * times are the native pickers; the parcel link lives in TaskParcelLink.
 */
export default function TaskComposer({ task, onSave, onClose }: TaskComposerProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [tracking, setTracking] = useState<string | undefined>(task?.tracking);
  const [titleError, setTitleError] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (clean === '') {
      setTitleError(true);
      return;
    }
    // Empty fields are passed as `undefined` on purpose: the edit path writes
    // the WHOLE document, so an absent optional field is cleared server-side.
    onSave({
      title: clean,
      priority,
      description: description.trim() !== '' ? description.trim() : undefined,
      dueDate: dueDate !== '' ? dueDate : undefined,
      dueTime: dueTime !== '' ? dueTime : undefined,
      notes: notes.trim() !== '' ? notes.trim() : undefined,
      tracking: tracking ?? undefined,
    });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={task ? t('task_composer.edit_title') : t('task_composer.add_title')}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {task ? t('task_composer.edit_title') : t('task_composer.add_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('task_composer.title')} *
          </span>
          <input
            autoFocus
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleError(false);
            }}
            aria-invalid={titleError}
            className={`${fieldClass} ${titleError ? 'border-red-400' : ''}`}
          />
          {titleError && (
            <span role="alert" className="block text-xs font-bold text-red-600 dark:text-red-400">
              {t('task_composer.title_required')}
            </span>
          )}
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('task_composer.description')}
          </span>
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          />
        </label>

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('tasks.priority_label')}
          </legend>
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITY_ORDER.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setPriority(level)}
                aria-pressed={priority === level}
                className={`min-h-10 rounded-xl border px-1 text-xs font-bold transition-colors ${
                  priority === level
                    ? `${PRIORITY_ACTIVE[level]} text-white`
                    : `bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-800 ${PRIORITY_INACTIVE[level]}`
                }`}
              >
                {t(PRIORITY_KEY[level])}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('tasks.due_date')}
            </span>
            <input
              type="date"
              dir="ltr"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('tasks.due_time')}
            </span>
            <input
              type="time"
              dir="ltr"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('parcels.field.notes')}
          </span>
          <textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          />
        </label>

        <fieldset className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <legend className="px-1 text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('task_composer.parcel_section')}
          </legend>
          <TaskParcelLink
            tracking={tracking}
            onLink={setTracking}
            onUnlink={() => setTracking(undefined)}
          />
        </fieldset>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-gray-300 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
