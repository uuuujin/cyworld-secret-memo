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
import { Lock, Sparkles, Plus, AlertTriangle, X } from 'lucide-react';

const MINIME_EMOJIS: { [key: string]: string } = {
  swim: '🏊‍♀️',
  meat: '🥩',
  cloud: '⛅',
  heart: '💘',
  fog: '😶‍🌫️',
  yawn: '🥱',
  sweat: '😰',
  anger: '🤬',
};

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
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [isQuickNotesOneWeekOnly, setIsQuickNotesOneWeekOnly] = useState<boolean>(true);

  // Secret Lock state
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [showSecretPinModal, setShowSecretPinModal] = useState(false);

  // Memo Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [editorDefaultFolder, setEditorDefaultFolder] = useState<string>('diary');
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // 1. Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(false);

      if (user) {
        // Check token validity / refresh state
        try {
          await user.getIdToken();
        } catch (tokenErr) {
          console.warn('Firebase token refresh failed / session expired:', tokenErr);
          await logoutUser().catch(() => {});
          setCurrentUser(null);
          setProfile(null);
          setSessionNotice('로그인 세션이 만료되었습니다. 다시 구글 로그인해 주세요.');
          return;
        }

        setCurrentUser(user);

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
              minime: 'swim',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveUserProfile(user.uid, userProf);
          } else {
            // Count today visitor
            await incrementVisitCount(user.uid);
          }
          setProfile(userProf);
        } catch (err: any) {
          console.error('Failed to load profile:', err);
          const msg = err?.message || '';
          if (msg.includes('permission') || msg.includes('unauthenticated')) {
            await logoutUser().catch(() => {});
            setCurrentUser(null);
            setSessionNotice('로그인 권한이 만료되었습니다. 다시 로그인해 주세요.');
          }
        }
      } else {
        setCurrentUser(null);
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

    const unsubMemos = subscribeMemos(
      currentUser.uid,
      (data) => {
        setMemos(data);
      },
      (err) => {
        console.warn('subscribeMemos error:', err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('permission') || errMsg.includes('unauthenticated')) {
          logoutUser().catch(() => {});
          setCurrentUser(null);
          setSessionNotice('인증 세션이 만료되었습니다. 다시 로그인해 주세요.');
        }
      }
    );

    const unsubNotes = subscribeQuickNotes(
      currentUser.uid,
      (data) => {
        setQuickNotes(data);
      },
      {
        days: 7,
        fetchAll: !isQuickNotesOneWeekOnly,
      },
      (err) => {
        console.warn('subscribeQuickNotes error:', err);
      }
    );

    return () => {
      unsubMemos();
      unsubNotes();
    };
  }, [currentUser, isQuickNotesOneWeekOnly]);

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
    return (
      <AuthScreen
        noticeMessage={sessionNotice}
        onLoginSuccess={() => {
          setSessionNotice(null);
          retroAudio.playChime();
        }}
      />
    );
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
    minime: 'swim',
  };

  const secretMemos = memos.filter((m) => m.isSecret || m.folder === 'secret');

  return (
    <div className="h-screen h-[100dvh] w-full overflow-hidden p-0 sm:p-1.5 md:p-2 lg:p-3 flex flex-col items-center justify-start select-none font-pixel bg-[#89939e]">
      {/* Outer Retro Minihompy Window Frame */}
      <div className="w-full max-w-6xl h-full max-h-full my-auto bg-[#c5ced8] border-0 md:border-4 border-[#e2e8f0] shadow-2xl rounded-none md:rounded-2xl p-0.5 sm:p-1 md:p-2 relative flex flex-col overflow-hidden">
        {/* Subtle 3D Bevel Rim */}
        <div className="border-0 md:border-2 border-[#94a3b8] rounded-none md:rounded-xl bg-[#f8fafc] flex flex-col h-full grow overflow-hidden shadow-inner">
          {/* Header Bar */}
          <HeaderBar
            title={defaultProf.hompyTitle || '★~나만의 비밀 미니홈피~★'}
            userEmail={currentUser.email || ''}
            onLogout={logoutUser}
            dotoriCount={dotoriCount}
            onChargeDotori={handleChargeDotori}
            minimeEmoji={MINIME_EMOJIS[defaultProf.minime || 'swim'] || '🏊‍♀️'}
            onOpenMobileProfile={() => setIsMobileProfileOpen(true)}
          />

          {/* Mobile Horizontal Tabs (< md screen width) */}
          <div className="block md:hidden shrink-0">
            <TabsNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
              secretCount={secretMemos.length}
              layout="horizontal"
            />
          </div>

          {/* Book / Notepad Layout Container */}
          <div className="flex-1 p-1 sm:p-2 md:p-3 flex flex-row gap-0 md:gap-3 bg-[#e2e8f0] overflow-hidden relative min-h-0">
            {/* Left Page (Profile & Minime & BGM) - HIDDEN on mobile (< md), visible on md+ */}
            <div className="hidden md:flex shrink-0 max-h-full min-h-0">
              <LeftProfile
                profile={defaultProf}
                onUpdateProfile={handleUpdateProfile}
                onSelectTab={handleTabChange}
              />
            </div>

            {/* Vintage Silver Spiral Binder Rings between left and right pages - HIDDEN on mobile */}
            <div className="hidden md:flex flex-col justify-around py-6 -mx-2.5 z-20 pointer-events-none shrink-0">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-3 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-400 rounded-full border border-gray-400 shadow-sm transform -rotate-12"
                />
              ))}
            </div>

            {/* Right Page (Content Paper Notebook Area) - Takes 100% width on mobile */}
            <main
              className={`flex-1 bg-white border border-[#b8c6d4] md:border-2 rounded-lg shadow-sm flex flex-col overflow-hidden relative min-w-0 min-h-0 ${
                activeTab === 'doodle' ? 'p-1 sm:p-1.5 md:p-2' : 'p-2 sm:p-3 md:p-4'
              }`}
            >
              {/* Tab Content Header Bar - Omitted on doodle tab so chat UI fills 100% height */}
              {activeTab !== 'doodle' && (
                <div className="flex items-center justify-between pb-1.5 md:pb-2 mb-2 md:mb-3 border-b-2 border-[#2b84cb]/30 text-xs shrink-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[#2b84cb] font-bold text-xs sm:text-sm tracking-wide truncate">
                      {activeTab === 'diary' && '📖 다이어리 & 전체 메모'}
                      {activeTab === 'secret' && '🔒 나만의 비밀 금고'}
                      {activeTab === 'calendar' && '📅 다이어리 달력보기'}
                      {activeTab === 'settings' && '⚙️ 미니홈피 관리 및 설정'}
                    </span>
                    {activeTab === 'secret' && (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 border border-rose-300 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                        <Lock className="w-2.5 h-2.5" />
                        잠금해제
                      </span>
                    )}
                  </div>

                  {/* Quick Add button on top */}
                  {activeTab !== 'settings' && (
                    <button
                      onClick={() => {
                        retroAudio.playClick();
                        setEditingMemo(null);
                        setEditorDefaultFolder(activeTab === 'secret' ? 'secret' : 'diary');
                        setIsEditorOpen(true);
                      }}
                      className="cyworld-btn px-2 py-0.5 sm:px-2.5 sm:py-1 rounded flex items-center gap-1 text-[10px] sm:text-[11px] shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>글쓰기</span>
                    </button>
                  )}
                </div>
              )}

              {/* Tab Views */}
              <div className="flex-1 overflow-hidden min-h-0 h-full flex flex-col">
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
                    isOneWeekOnly={isQuickNotesOneWeekOnly}
                    onToggleOneWeekFilter={() => setIsQuickNotesOneWeekOnly((prev) => !prev)}
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
                    quickNotes={quickNotes}
                    onUpdateProfile={handleUpdateProfile}
                  />
                )}
              </div>
            </main>

            {/* Desktop Vertical Right-edge tabs (visible on md+, hidden on mobile) */}
            <TabsNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
              secretCount={secretMemos.length}
              layout="vertical"
            />
          </div>
        </div>
      </div>

      {/* Mobile Profile Modal Popup */}
      {isMobileProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:hidden overflow-y-auto">
          <div className="bg-[#edf2f7] border-3 border-[#2b84cb] rounded-xl shadow-2xl w-full max-w-sm max-h-[88vh] my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#2b84cb] text-white px-3 py-2 flex items-center justify-between font-bold text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <span>★ 프로필 & 미니미 설정 ★</span>
              </div>
              <button
                onClick={() => setIsMobileProfileOpen(false)}
                className="hover:bg-[#10558a] p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2.5 overflow-y-auto flex-1">
              <LeftProfile
                profile={defaultProf}
                onUpdateProfile={handleUpdateProfile}
                onSelectTab={(tab) => {
                  handleTabChange(tab);
                  setIsMobileProfileOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

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
