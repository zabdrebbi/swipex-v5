import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Task, TaskDraft } from '@/domain/task/types';
import { taskCounts, type TaskCounts } from '@/domain/task/query';
import { deleteTasks, subscribeTasks, upsertTask } from '@/lib/firebase/tasksRepo';
import { useUser } from '@/features/auth/AuthProvider';

export type TasksStatus = 'loading' | 'ready' | 'error';

interface TasksContextValue {
  status: TasksStatus;
  /** Every task including the trash (unsorted; lists sort for display). */
  tasks: Task[];
  /** Bucket counts including the trash. */
  counts: TaskCounts;
  /** Creates the task (id + timestamps) and returns its id. */
  addTask: (draft: TaskDraft) => string;
  /** Partial update; stamps `updatedAt`. */
  updateTask: (id: string, patch: Partial<Task>) => void;
  /** pending <-> completed (stamps `completedAt` when completing). */
  toggleTask: (id: string) => void;
  /** Moves the task to the trash (soft delete). */
  softDelete: (id: string) => void;
  /** Trash restore button: always back to `pending` (v4). */
  restoreFromTrash: (id: string) => void;
  /** Undo after a delete: puts the exact snapshot status back. */
  restoreSnapshot: (snapshot: Task) => void;
  /** Permanent delete of trashed tasks. */
  purge: (ids: string[]) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/** Stamps `updatedAt` unless the caller already provided one. */
function stamp(patch: Partial<Task>): Partial<Task> {
  return { ...patch, updatedAt: patch.updatedAt ?? new Date().toISOString() };
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const uid = user.uid;
  const [status, setStatus] = useState<TasksStatus>('loading');
  const [tasks, setTasks] = useState<Task[]>([]);
  /**
   * Task ids whose LOCAL copy is authoritative until the cloud echoes it:
   * guards the optimistic state against a snapshot already in flight when the
   * write started. Released on echo, or on write failure so the next snapshot
   * restores the server truth (same guard as ParcelsProvider, minus its
   * debounced flush — a write here fires immediately).
   */
  const localOnly = useRef(new Set<string>());

  // The one and only realtime listener for tasks.
  useEffect(() => {
    const unsubscribe = subscribeTasks(
      uid,
      (load) => {
        if (load.status === 'loading') setStatus('loading');
        else if (load.status === 'ready') setStatus('ready');
        else setStatus('error');
      },
      (incoming) => {
        setTasks((current) => {
          const incomingById = new Map(incoming.map((t) => [t.id, t]));
          const currentById = new Map(current.map((t) => [t.id, t]));

          // Release local authority once the server confirms (or the task is
          // gone after a successful purge); before that our copy wins.
          for (const id of [...localOnly.current]) {
            const local = currentById.get(id);
            const remote = incomingById.get(id);
            if (local === undefined && remote === undefined) {
              localOnly.current.delete(id); // purge echoed
            } else if (local !== undefined && remote !== undefined && remote.updatedAt >= local.updatedAt) {
              localOnly.current.delete(id); // our write echoed
            }
          }

          const merged = new Map(incomingById);
          for (const id of localOnly.current) {
            const local = currentById.get(id);
            if (local !== undefined) merged.set(id, local);
            else merged.delete(id); // pending purge: keep hidden
          }
          return [...merged.values()];
        });
      },
      () => setStatus('error'),
    );
    return unsubscribe;
  }, [uid]);

  /**
   * Optimistic state change + immediate write. `touched` ids gain local
   * authority before the mutation (stale-snapshot guard) and lose it when the
   * write fails — the listener then restores the server truth.
   */
  const commit = useCallback(
    (mutate: (list: Task[]) => Task[], write: () => Promise<void>, touched: readonly string[]) => {
      for (const id of touched) localOnly.current.add(id);
      setTasks(mutate);
      void write().catch(() => {
        for (const id of touched) localOnly.current.delete(id);
      });
    },
    [],
  );

  const addTask = useCallback(
    (draft: TaskDraft): string => {
      const now = new Date().toISOString();
      const task: Task = {
        id: crypto.randomUUID(),
        ...draft,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      commit(
        (list) => [...list, task],
        () => upsertTask(uid, task),
        [task.id],
      );
      return task.id;
    },
    [commit, uid],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const current = tasks.find((item) => item.id === id);
      if (current === undefined) return;
      const next: Task = { ...current, ...stamp(patch) };
      commit(
        (list) => list.map((task) => (task.id === id ? next : task)),
        () => upsertTask(uid, next),
        [id],
      );
    },
    [commit, tasks, uid],
  );

  const toggleTask = useCallback(
    (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (task === undefined) return;
      const now = new Date().toISOString();
      const patch: Partial<Task> =
        task.status === 'pending'
          ? { status: 'completed', completedAt: now, updatedAt: now }
          : { status: 'pending', completedAt: undefined, updatedAt: now };
      updateTask(id, patch);
    },
    [tasks, updateTask],
  );

  const softDelete = useCallback((id: string) => updateTask(id, { status: 'deleted' }), [updateTask]);

  const restoreFromTrash = useCallback(
    (id: string) =>
      updateTask(id, { status: 'pending', completedAt: undefined, updatedAt: new Date().toISOString() }),
    [updateTask],
  );

  const restoreSnapshot = useCallback(
    (snapshot: Task) =>
      updateTask(snapshot.id, {
        status: snapshot.status,
        completedAt: snapshot.completedAt,
        updatedAt: new Date().toISOString(),
      }),
    [updateTask],
  );

  const purge = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      commit(
        (list) => list.filter((task) => !idSet.has(task.id)),
        () => deleteTasks(uid, ids),
        ids,
      );
    },
    [commit, uid],
  );

  const counts = useMemo(() => taskCounts(tasks), [tasks]);

  const value = useMemo<TasksContextValue>(
    () => ({
      status,
      tasks,
      counts,
      addTask,
      updateTask,
      toggleTask,
      softDelete,
      restoreFromTrash,
      restoreSnapshot,
      purge,
    }),
    [status, tasks, counts, addTask, updateTask, toggleTask, softDelete, restoreFromTrash, restoreSnapshot, purge],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>');
  return ctx;
}
