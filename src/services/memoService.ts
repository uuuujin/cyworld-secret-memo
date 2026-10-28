import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MemoItem, QuickNote, UserProfile } from '../types';

/**
 * Fetch or initialize the user's minihompy profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Create or update user profile with initial Cyworld defaults
 */
export async function saveUserProfile(
  userId: string,
  profileData: Partial<UserProfile>
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(
      docRef,
      {
        ...profileData,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Increment visit counter (Today & Total)
 */
export async function incrementVisitCount(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const todayCount = (data.todayCount || 0) + 1;
      const totalCount = (data.totalCount || 0) + 1;
      await updateDoc(docRef, {
        todayCount,
        totalCount,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('Could not increment visit count:', error);
  }
}

/**
 * Subscribe to the user's memos in real-time
 */
export function subscribeMemos(
  userId: string,
  onUpdate: (memos: MemoItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/memos`;
  try {
    const memosRef = collection(db, 'users', userId, 'memos');

    const unsubscribe = onSnapshot(
      memosRef,
      (snapshot) => {
        const memos: MemoItem[] = [];
        snapshot.forEach((docSnap) => {
          memos.push(docSnap.data() as MemoItem);
        });
        memos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(memos);
      },
      (error) => {
        console.error('subscribeMemos error:', error);
        if (onError) {
          onError(error);
        } else {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Create a new private memo
 */
export async function createMemo(
  userId: string,
  memoData: {
    title: string;
    content: string;
    folder: string;
    mood?: string;
    weather?: string;
    isSecret?: boolean;
    isPinned?: boolean;
    bgPattern?: string;
    tags?: string[];
  }
): Promise<string> {
  const memoId = `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `users/${userId}/memos/${memoId}`;
  try {
    const now = new Date().toISOString();
    const newMemo: MemoItem = {
      id: memoId,
      userId,
      title: memoData.title.trim() || '제목 없는 메모',
      content: memoData.content,
      folder: memoData.folder || 'diary',
      mood: memoData.mood || '행복',
      weather: memoData.weather || '맑음',
      isSecret: memoData.isSecret ?? false,
      isPinned: memoData.isPinned ?? false,
      bgPattern: memoData.bgPattern || 'lined',
      tags: memoData.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(db, 'users', userId, 'memos', memoId);
    await setDoc(docRef, newMemo);
    return memoId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update an existing memo
 */
export async function updateMemo(
  userId: string,
  memoId: string,
  updates: Partial<MemoItem>
): Promise<void> {
  const path = `users/${userId}/memos/${memoId}`;
  try {
    const docRef = doc(db, 'users', userId, 'memos', memoId);
    await setDoc(
      docRef,
      {
        ...updates,
        id: memoId,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a memo
 */
export async function deleteMemo(userId: string, memoId: string): Promise<void> {
  const path = `users/${userId}/memos/${memoId}`;
  try {
    const docRef = doc(db, 'users', userId, 'memos', memoId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to Quick Notes / 한줄 낙서
 * By default, fetches only the past 7 days (1 week) to optimize network bandwidth and rendering speed for large datasets.
 */
export function subscribeQuickNotes(
  userId: string,
  onUpdate: (notes: QuickNote[]) => void,
  options?: {
    days?: number; // default: 7 days
    fetchAll?: boolean;
  },
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/quickNotes`;
  try {
    const notesRef = collection(db, 'users', userId, 'quickNotes');

    let notesQuery;
    if (options?.fetchAll) {
      notesQuery = query(notesRef);
    } else {
      const days = options?.days ?? 7;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      notesQuery = query(notesRef, where('createdAt', '>=', cutoffDate));
    }

    return onSnapshot(
      notesQuery,
      (snapshot) => {
        const notes: QuickNote[] = [];
        snapshot.forEach((docSnap) => {
          notes.push(docSnap.data() as QuickNote);
        });
        notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(notes);
      },
      (error) => {
        console.error('subscribeQuickNotes error:', error);
        if (onError) {
          onError(error);
        } else {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Create a quick note
 */
export async function createQuickNote(
  userId: string,
  content: string,
  mood: string = '감성'
): Promise<void> {
  const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const path = `users/${userId}/quickNotes/${noteId}`;
  try {
    const newNote: QuickNote = {
      id: noteId,
      userId,
      content,
      mood,
      createdAt: new Date().toISOString(),
    };
    const docRef = doc(db, 'users', userId, 'quickNotes', noteId);
    await setDoc(docRef, newNote);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete a quick note
 */
export async function deleteQuickNote(userId: string, noteId: string): Promise<void> {
  const path = `users/${userId}/quickNotes/${noteId}`;
  try {
    const docRef = doc(db, 'users', userId, 'quickNotes', noteId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
