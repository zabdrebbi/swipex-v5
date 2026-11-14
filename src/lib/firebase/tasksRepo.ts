import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebase } from './index';
import { tasksCollection } from '@/domain/firestore/paths';
import { taskFromDoc, taskToDoc } from '@/domain/firestore/convertTask';
import type { Task } from '@/domain/task/types';

/**
 * Full-document write: replaces the document, so optional fields omitted
 * (undefined) are CLEARED server-side — the only way to clear a field with
 * the sanitiser dropping `undefined`.
 */
export async function upsertTask(uid: string, task: Task): Promise<void> {
  const { db } = getFirebase();
  await setDoc(doc(db, tasksCollection(uid), task.id), taskToDoc(task));
}

/** Permanent delete (purge from the trash): one batch per call. */
export async function deleteTasks(uid: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { db } = getFirebase();
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.delete(doc(db, tasksCollection(uid), id));
  }
  await batch.commit();
}

export type TasksLoad = { status: 'loading' } | { status: 'ready' } | { status: 'error' };

/**
 * The single realtime listener over `users/{uid}/tasks`. Emits `loading` first,
 * then the full state on every local/remote change; the persistent IndexedDB
 * cache makes the first emit work offline (same pattern as parcels).
 */
export function subscribeTasks(
  uid: string,
  onLoad: (load: TasksLoad) => void,
  onTasks: (tasks: Task[]) => void,
  onError: () => void,
): Unsubscribe {
  const { db } = getFirebase();
  const now = new Date().toISOString();
  onLoad({ status: 'loading' });
  return onSnapshot(
    collection(db, tasksCollection(uid)),
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => taskFromDoc(d.id, d.data(), now));
      onTasks(tasks);
      onLoad({ status: 'ready' });
    },
    () => onError(),
  );
}
