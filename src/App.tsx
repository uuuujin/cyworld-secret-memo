import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { auth, logoutUser } from './firebase';
import { ActiveTab, MemoItem, QuickNote, UserProfile } from './types';
import {
  createMemo,
  createQuickNote,
  deleteMemo,
  deleteQuickNote,
  getUserProfile,
  incrementVisitCount,
  saveUserProfile,
  subscribeMemos,
  subscribeQuickNotes,
  updateMemo,
} from './services/memoService';
import { retroAudio } from './utils/retroAudio';
import HeaderBar from './components/HeaderBar';
import LeftProfile from './components/LeftProfile';
import TabsNavigation from './components/TabsNavigation';
import MemoList from './components/MemoList';
import InstantChatMemo from './components/InstantChatMemo';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import MemoEditorModal from './components/MemoEditorModal';
import SecretLockModal from './components/SecretLockModal';
import AuthScreen from './components/AuthScreen';
import { Lock, Sparkles, Plus, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Minihompy State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('diary');
  const [currentFolder, setCurrentFolder] = useState<string>('all');
  const [dotoriCount, setDotoriCount] = useState<number>(77);

  // Secret Lock state
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [showSecretPinModal, setShowSecretPinModal] = useState(false);

  // Memo Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [editorDefaultFolder, setEditorDefaultFolder] = useState<string>('diary');

  // 1. Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Load or initialize user profile
        try {
          let userProf = await getUserProfile(user.uid);
          if (!userProf) {
            userProf = {
              userId: user.uid,
              email: user.email || '',
              displayName: user.displayName || '주인장',
              hompyTitle: `★~${user.displayName || '나'}의 비밀 미니홈피~★`,
              statusMessage: 'ㄴr는 ㄱr끔 눈물을 흘린ㄷr...☆',
              todayMood: '행복',
              bgmTitle: '프리스타일 - Y (Please Tell Me Why)',
              todayCount: 1,
              totalCount: 1420,
              passcode: '1234',
              isLockEnabled: true,
              minime: '....',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveUserProfile(user.uid, userProf);
          } else {
            // Count today visitor
            await incrementVisitCount(user.uid);
          }
          setProfile(userProf);
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      } else {
        setProfile(null);
        setMemos([]);
        setQuickNotes([]);
        setIsSecretUnlocked(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time subscriptions when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    const unsubMemos = subscribeMemos(currentUser.uid, (data) => {
      setMemos(data);
    });

    const unsubNotes = subscribeQuickNotes(currentUser.uid, (data) => {
      setQuickNotes(data);
    });

    return () => {
      unsubMemos();
      unsubNotes();
    };
  }, [currentUser]);

  // Tab change handler with PIN lock check for 'secret' tab
  const handleTabChange = (newTab: ActiveTab) => {
    if (newTab === 'secret') {
      const lockActive = profile?.isLockEnabled ?? true;
      if (lockActive && !isSecretUnlocked) {
        setShowSecretPinModal(true);
        return;
      }
    }
    setActiveTab(newTab);
    if (newTab === 'diary') {
      setCurrentFolder('all');
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      await saveUserProfile(currentUser.uid, updates);
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleChargeDotori = () => {
    setDotoriCount((prev) => prev + 10);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#2b84cb', '#7dd3fc', '#f59e0b', '#fbbf24'],
    });
  };

  const handleSaveMemo = async (memoData: any) => {
    if (!currentUser) return;
    if (editingMemo) {
      await updateMemo(currentUser.uid, editingMemo.id, memoData);
    } else {
      await createMemo(currentUser.uid, memoData);
    }
    setEditingMemo(null);
  };

  const handleDeleteMemo = async (memoId: string) => {
    if (!currentUser) return;
    await deleteMemo(currentUser.uid, memoId);
    retroAudio.playClick();
  };

  const handleTogglePin = async (memo: MemoItem) => {
    if (!currentUser) return;
    retroAudio.playClick();
    await updateMemo(currentUser.uid, memo.id, { isPinned: !memo.isPinned });
  };

  const handleCreateQuickNote = async (content: string, mood?: string) => {
    if (!currentUser) return;
    await createQuickNote(currentUser.uid, content, mood);
  };

  const handleDeleteQuickNote = async (noteId: string) => {
    if (!currentUser) return;
    await deleteQuickNote(currentUser.uid, noteId);
    retroAudio.playClick();
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-pixel p-4 text-[#333]">
        <div className="bg-[#f0f4f8] border-3 border-[#2b84cb] p-6 rounded-xl shadow-2xl text-center max-w-sm">
          <div className="text-4xl animate-bounce mb-3">🌰</div>
          <h2 className="text-sm font-bold text-[#2b84cb] mb-1">
            싸이월드 미니홈피 로딩중...
          </h2>
          <p className="text-xs text-gray-500">도토리를 세는 중입니다... 잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  // Not Logged In Screen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={() => retroAudio.playChime()} />;
  }

  const defaultProf: UserProfile = profile || {
    userId: currentUser.uid,
    email: currentUser.email || '',
    displayName: currentUser.displayName || '주인장',
    hompyTitle: '★~나만의 비밀 미니홈피~★',
    statusMessage: 'ㄴr는 ㄱr끔 눈물을 흘린ㄷr...☆',
    todayMood: '행복',
    bgmTitle: '프리스타일 - Y',
    todayCount: 42,
    totalCount: 1420,
    passcode: '1234',
    isLockEnabled: true,
    minime: '....',
  };

  const secretMemos = memos.filter((m) => m.isSecret || m.folder === 'secret');

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 flex items-center justify-center select-none font-pixel">
      {/* Outer Retro Minihompy Window Frame */}
      <div className="w-full max-w-6xl bg-[#c5ced8] border-4 border-[#e2e8f0] shadow-2xl rounded-2xl p-2 sm:p-3 relative flex flex-col min-h-[640px] md:min-h-[720px]">
        {/* Subtle 3D Bevel Rim */}
        <div className="border-2 border-[#94a3b8] rounded-xl bg-[#f8fafc] flex flex-col h-full grow overflow-hidden shadow-inner">
          {/* Header Bar */}
          <HeaderBar
            title={defaultProf.hompyTitle || '★~나만의 비밀 미니홈피~★'}
            userEmail={currentUser.email || ''}
            onLogout={logoutUser}
            dotoriCount={dotoriCount}
            onChargeDotori={handleChargeDotori}
          />

          {/* Book / Notepad Layout Container */}
          <div className="flex-1 p-2 sm:p-3 flex flex-col lg:flex-row gap-2 sm:gap-3 bg-[#e2e8f0] overflow-hidden relative">
            {/* Left Page (Profile & Minime & BGM) */}
            <LeftProfile
              profile={defaultProf}
              onUpdateProfile={handleUpdateProfile}
              onSelectTab={handleTabChange}
            />

            {/* Vintage Silver Spiral Binder Rings between left and right pages */}
            <div className="hidden lg:flex flex-col justify-around py-6 -mx-2.5 z-20 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-3 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-400 rounded-full border border-gray-400 shadow-sm transform -rotate-12"
                />
              ))}
            </div>

            {/* Right Page (Content Paper Notebook Area) */}
            <main className="flex-1 bg-white border-2 border-[#b8c6d4] rounded-lg p-3 sm:p-4 shadow-sm flex flex-col overflow-hidden relative">
              {/* Tab Content Header Bar */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#2b84cb]/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[#2b84cb] font-bold text-sm tracking-wide">
                    {activeTab === 'diary' && '📖 다이어리 & 전체 메모'}
                    {activeTab === 'secret' && '🔒 나만의 비밀 금고 (Secret Memos)'}
                    {activeTab === 'doodle' && '💬 아무낙서 (PC 카톡 실시간 메모)'}
                    {activeTab === 'calendar' && '📅 다이어리 달력보기 (Calendar)'}
                    {activeTab === 'settings' && '⚙️ 미니홈피 관리 및 보안 설정'}
                  </span>
                  {activeTab === 'secret' && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      잠금 해제됨
                    </span>
                  )}
                </div>

                {/* Quick Add button on top */}
                {activeTab !== 'settings' && activeTab !== 'doodle' && (
                  <button
                    onClick={() => {
                      retroAudio.playClick();
                      setEditingMemo(null);
                      setEditorDefaultFolder(activeTab === 'secret' ? 'secret' : 'diary');
                      setIsEditorOpen(true);
                    }}
                    className="cyworld-btn px-2.5 py-1 rounded flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>글쓰기</span>
                  </button>
                )}
              </div>

              {/* Tab Views */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'diary' && (
                  <MemoList
                    memos={memos}
                    currentFolder={currentFolder}
                    onSelectFolder={setCurrentFolder}
                    onOpenCreateModal={() => {
                      setEditingMemo(null);
                      setEditorDefaultFolder(currentFolder === 'all' ? 'diary' : currentFolder);
                      setIsEditorOpen(true);
                    }}
                    onEditMemo={(memo) => {
                      setEditingMemo(memo);
                      setIsEditorOpen(true);
                    }}
                    onDeleteMemo={handleDeleteMemo}
                    onTogglePin={handleTogglePin}
                  />
                )}

                {activeTab === 'secret' && (
                  <MemoList
                    memos={secretMemos}
                    currentFolder="secret"
                    onSelectFolder={() => {}}
                    onOpenCreateModal={() => {
                      setEditingMemo(null);
                      setEditorDefaultFolder('secret');
                      setIsEditorOpen(true);
                    }}
                    onEditMemo={(memo) => {
                      setEditingMemo(memo);
                      setIsEditorOpen(true);
                    }}
                    onDeleteMemo={handleDeleteMemo}
                    onTogglePin={handleTogglePin}
                  />
                )}

                {activeTab === 'doodle' && (
                  <InstantChatMemo
                    notes={quickNotes}
                    onCreateNote={handleCreateQuickNote}
                    onDeleteNote={handleDeleteQuickNote}
                  />
                )}

                {activeTab === 'calendar' && (
                  <CalendarView
                    memos={memos}
                    onSelectMemo={(memo) => {
                      setEditingMemo(memo);
                      setIsEditorOpen(true);
                    }}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsView
                    profile={defaultProf}
                    memos={memos}
                    onUpdateProfile={handleUpdateProfile}
                  />
                )}
              </div>
            </main>

            {/* Right Tabs Navigation (Cyworld Classic Sky Blue Tabs) */}
            <TabsNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
              secretCount={secretMemos.length}
            />
          </div>
        </div>
      </div>

      {/* Memo Editor Modal */}
      {isEditorOpen && (
        <MemoEditorModal
          initialMemo={editingMemo}
          defaultFolder={editorDefaultFolder}
          onSave={handleSaveMemo}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingMemo(null);
          }}
        />
      )}

      {/* Secret PIN Pad Modal */}
      {showSecretPinModal && (
        <SecretLockModal
          correctPin={defaultProf.passcode || '1234'}
          onSuccess={() => {
            setIsSecretUnlocked(true);
            setShowSecretPinModal(false);
            setActiveTab('secret');
          }}
          onClose={() => setShowSecretPinModal(false)}
        />
      )}
    </div>
  );
}
