export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  hompyTitle?: string;
  statusMessage?: string;
  todayMood?: string;
  bgmTitle?: string;
  todayCount?: number;
  totalCount?: number;
  lastVisitDate?: string;
  passcode?: string;
  isLockEnabled?: boolean;
  minime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MemoFolder = 'diary' | 'secret' | 'doodle' | 'idea' | 'todo';

export interface MemoItem {
  id: string;
  userId: string;
  folder: string;
  title: string;
  content: string;
  mood?: string;
  weather?: string;
  isSecret?: boolean;
  isPinned?: boolean;
  bgPattern?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AttachmentKind = 'image' | 'html' | 'txt';

export interface QuickNoteAttachment {
  fileId: string;
  name: string;
  ext: 'html' | 'txt' | 'png' | 'jpg' | 'jpeg';
  mimeType: string;
  kind: AttachmentKind;
  size: number;
  thumbnailUrl?: string;
  textSnippet?: string;
}

export interface QuickNoteFile {
  id: string;
  userId: string;
  noteId: string;
  name: string;
  ext: 'html' | 'txt' | 'png' | 'jpg' | 'jpeg';
  mimeType: string;
  kind: AttachmentKind;
  size: number;
  dataUrl?: string;
  textContent?: string;
  createdAt: string;
}

export interface PendingUploadFile {
  localId: string;
  name: string;
  ext: 'html' | 'txt' | 'png' | 'jpg' | 'jpeg';
  mimeType: string;
  kind: AttachmentKind;
  size: number;
  dataUrl?: string;
  thumbnailUrl?: string;
  textContent?: string;
  textSnippet?: string;
}

export interface QuickNote {
  id: string;
  userId: string;
  content: string;
  mood?: string;
  attachments?: QuickNoteAttachment[];
  createdAt: string;
}

export type ActiveTab = 'diary' | 'secret' | 'doodle' | 'calendar' | 'settings';
