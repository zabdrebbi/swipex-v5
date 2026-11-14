import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useTasks } from './TasksProvider';
import TaskCard from './TaskCard';
import TaskComposer from './TaskComposer';
import { useTaskUndo } from './useTaskUndo';
import ConfirmDialog from '@/components/ConfirmDialog';
import { sortTrash, visibleTasks, type TaskListFilter } from '@/domain/task/query';
import type { Task, TaskDraft } from '@/domain/task/types';

type ComposerState = { mode: 'add' } | { mode: 'edit'; task: Task } | null;

const FILTERS: readonly { key: TaskListFilter; labelKey: TranslationKey; countKey: 'total' | 'pending' | 'completed' }[] = [
  { key: 'all', labelKey: 'tasks.count_all', countKey: 'total' },
  { key: 'pending', labelKey: 'tasks.count_pending', countKey: 'pending' },
  { key: 'completed', labelKey: 'tasks.count_completed', countKey: 'completed' },
];

const chipClass = (active: boolean): string =>
  `flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
    active
      ? 'border-blue-600 bg-blue-600 text-white'
      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
  }`;

/** Tasks screen: summary, search, tab chips, lists, collapsible trash, FAB. */
export default function TasksPage() {
  const { t } = useI18n();
  const { status, tasks, counts, addTask, updateTask, toggleTask, softDelete, restoreFromTrash, restoreSnapshot, purge } =
    useTasks();
  const { offerUndo } = useTaskUndo();
  const [filter, setFilter] = useState<TaskListFilter>('all');
  const [query, setQuery] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(null);
  const [purging, setPurging] = useState<Task | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const pendingList = useMemo(() => visibleTasks(tasks, 'pending', query), [tasks, query]);
  const completedList = useMemo(() => visibleTasks(tasks, 'completed', query), [tasks, query]);
  const trashList = useMemo(() => sortTrash(tasks.filter((task) => task.status === 'deleted')), [tasks]);
  // A search must reveal completed matches even with the section collapsed.
  const showCompleted = completedOpen || query.trim() !== '';
  const mainList = filter === 'completed' ? completedList : pendingList;
  // Nothing at all in the active view (the completed section keeps "all" alive).
  const listEmpty =
    filter === 'all' ? pendingList.length === 0 && completedList.length === 0 : mainList.length === 0;
  const canClear = query !== '' || filter !== 'all';

  function handleToggle(task: Task) {
    if (task.status === 'pending') {
      offerUndo({
        snapshot: task,
        message: t('tasks.toast_completed'),
        undoLabel: t('common.undo'),
        onUndo: (snapshot) =>
          updateTask(snapshot.id, { status: 'pending', completedAt: undefined, updatedAt: new Date().toISOString() }),
      });
    }
    toggleTask(task.id);
  }

  function handleDelete(task: Task) {
    offerUndo({
      snapshot: task,
      message: t('tasks.toast_deleted'),
      undoLabel: t('common.undo'),
      onUndo: (snapshot) => restoreSnapshot(snapshot),
    });
    softDelete(task.id);
  }

  function handleSave(draft: TaskDraft) {
    if (composer?.mode === 'edit') updateTask(composer.task.id, draft);
    else addTask(draft);
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        <span className="text-sm font-bold">{t('tasks.loading')}</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="size-8 text-red-500" aria-hidden="true" />
        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('tasks.load_error')}</p>
      </div>
    );
  }

  const stats: { labelKey: TranslationKey; value: number }[] = [
    { labelKey: 'tasks.count_all', value: counts.total },
    { labelKey: 'tasks.count_pending', value: counts.pending },
    { labelKey: 'tasks.count_completed', value: counts.completed },
  ];

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-xl font-bold">{t('nav.tasks')}</h1>

      {counts.total === 0 && counts.trash === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
          <p className="font-bold text-gray-600 dark:text-gray-300">{t('tasks.empty_title')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.empty_body')}</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2" aria-label={t('nav.tasks')}>
            {stats.map(({ labelKey, value }) => (
              <div
                key={labelKey}
                className="rounded-2xl border border-gray-200 bg-white p-3 text-center dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="text-xl font-extrabold leading-none" dir="ltr">
                  {value}
                </p>
                <p className="mt-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">{t(labelKey)}</p>
              </div>
            ))}
          </section>

          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('tasks.search_placeholder')}
              aria-label={t('tasks.search_placeholder')}
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white ps-9 pe-11 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            {query !== '' && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('search.clear')}
                className="absolute inset-y-0 end-1.5 my-auto flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map(({ key, labelKey, countKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={chipClass(filter === key)}
              >
                {t(labelKey)}
                <span className="rounded-full bg-black/10 px-1.5 text-[11px] dark:bg-white/10">
                  {counts[countKey]}
                </span>
              </button>
            ))}
          </div>

          {listEmpty ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
              <p className="font-bold text-gray-600 dark:text-gray-300">{t('list.no_results')}</p>
              {canClear && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  className="flex min-h-11 items-center rounded-xl border border-gray-300 px-4 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {t('list.clear_filters')}
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {mainList.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    today={today}
                    onEdit={(selected) => setComposer({ mode: 'edit', task: selected })}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                </li>
              ))}
            </ul>
          )}

          {filter === 'all' && completedList.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setCompletedOpen((value) => !value)}
                aria-expanded={showCompleted}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                {t('tasks.completed_section', { count: completedList.length })}
                <ChevronDown
                  className={`size-4 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {showCompleted && (
                <ul className="mt-3 space-y-3">
                  {completedList.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        today={today}
                        onEdit={(selected) => setComposer({ mode: 'edit', task: selected })}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {counts.trash > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setTrashOpen((value) => !value)}
                aria-expanded={trashOpen}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t('tasks.trash_section', { count: counts.trash })}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${trashOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {trashOpen && (
                <ul className="mt-3 space-y-2">
                  {trashList.map((task) => (
                    <li
                      key={task.id}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-500 line-through dark:text-gray-400">
                        {task.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => restoreFromTrash(task.id)}
                        aria-label={t('tasks.restore')}
                        title={t('tasks.restore')}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurging(task)}
                        aria-label={t('tasks.purge')}
                        title={t('tasks.purge')}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setComposer({ mode: 'add' })}
        aria-label={t('tasks.add')}
        className="fixed bottom-20 end-4 z-40 flex size-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl hover:bg-gray-700 lg:bottom-6 dark:bg-gray-100 dark:text-gray-900"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      {composer !== null && (
        <TaskComposer
          task={composer.mode === 'edit' ? composer.task : undefined}
          onSave={handleSave}
          onClose={() => setComposer(null)}
        />
      )}

      {purging !== null && (
        <ConfirmDialog
          open
          danger
          title={t('tasks.purge_confirm_title')}
          description={
            <>
              <span className="font-bold">{purging.title}</span>
              <br />
              {t('tasks.purge_confirm_body')}
            </>
          }
          onConfirm={() => {
            purge([purging.id]);
            setPurging(null);
          }}
          onCancel={() => setPurging(null)}
        />
      )}
    </div>
  );
}
