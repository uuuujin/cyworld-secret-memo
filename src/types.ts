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

export interface QuickNote {
  id: string;
  userId: string;
  content: string;
  mood?: string;
  createdAt: string;
}

export type ActiveTab = 'diary' | 'secret' | 'doodle' | 'calendar' | 'settings';
