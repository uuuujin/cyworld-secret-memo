import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  MemoItem,
  PendingUploadFile,
  QuickNote,
  QuickNoteAttachment,
  QuickNoteFile,
  UserProfile,
} from '../types';

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

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Increment visit counter (Today resets to 1 on a new local calendar date, Total increments persistently)
 */
export async function incrementVisitCount(
  userId: string
): Promise<{ todayCount: number; totalCount: number; lastVisitDate: string } | null> {
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const todayKey = getLocalDateKey();
      const isSameDay = data.lastVisitDate === todayKey;
      const todayCount = isSameDay ? (data.todayCount || 0) + 1 : 1;
      const totalCount = (data.totalCount || 0) + 1;
      await updateDoc(docRef, {
        todayCount,
        totalCount,
        lastVisitDate: todayKey,
        updatedAt: new Date().toISOString(),
      });
      return { todayCount, totalCount, lastVisitDate: todayKey };
    }
    return null;
  } catch (error) {
    console.warn('Could not increment visit count:', error);
    return null;
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
 * Create a quick note with optional bundled file attachments (.html, .txt, .png, .jpg)
 */
export async function createQuickNote(
  userId: string,
  content: string,
  mood: string = '감성',
  files: PendingUploadFile[] = []
): Promise<void> {
  const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const path = `users/${userId}/quickNotes/${noteId}`;
  try {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const attachments: QuickNoteAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fileId = `qfile_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const fileDocRef = doc(db, 'users', userId, 'quickNoteFiles', fileId);

      const filePayload: QuickNoteFile = {
        id: fileId,
        userId,
        noteId,
        name: f.name,
        ext: f.ext,
        mimeType: f.mimeType,
        kind: f.kind,
        size: f.size,
        createdAt: now,
      };
      if (typeof f.dataUrl === 'string') {
        filePayload.dataUrl = f.dataUrl;
      }
      if (typeof f.textContent === 'string') {
        filePayload.textContent = f.textContent;
      }

      batch.set(fileDocRef, filePayload);

      const meta: QuickNoteAttachment = {
        fileId,
        name: f.name,
        ext: f.ext,
        mimeType: f.mimeType,
        kind: f.kind,
        size: f.size,
      };
      if (typeof f.thumbnailUrl === 'string') {
        meta.thumbnailUrl = f.thumbnailUrl;
      }
      if (typeof f.textSnippet === 'string') {
        meta.textSnippet = f.textSnippet;
      }
      attachments.push(meta);
    }

    const newNote: QuickNote = {
      id: noteId,
      userId,
      content,
      mood,
      createdAt: now,
    };
    if (attachments.length > 0) {
      newNote.attachments = attachments;
    }

    const noteDocRef = doc(db, 'users', userId, 'quickNotes', noteId);
    batch.set(noteDocRef, newNote);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Fetch an uploaded QuickNoteFile payload by fileId for full view / download
 */
export async function getQuickNoteFile(
  userId: string,
  fileId: string
): Promise<QuickNoteFile | null> {
  const path = `users/${userId}/quickNoteFiles/${fileId}`;
  try {
    const fileDocRef = doc(db, 'users', userId, 'quickNoteFiles', fileId);
    const snap = await getDoc(fileDocRef);
    if (snap.exists()) {
      return snap.data() as QuickNoteFile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Delete a quick note and any attached files
 */
export async function deleteQuickNote(
  userId: string,
  noteId: string,
  attachmentFileIds: string[] = []
): Promise<void> {
  const path = `users/${userId}/quickNotes/${noteId}`;
  try {
    if (attachmentFileIds.length > 0) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', userId, 'quickNotes', noteId));
      for (const fileId of attachmentFileIds) {
        batch.delete(doc(db, 'users', userId, 'quickNoteFiles', fileId));
      }
      await batch.commit();
    } else {
      const docRef = doc(db, 'users', userId, 'quickNotes', noteId);
      await deleteDoc(docRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
