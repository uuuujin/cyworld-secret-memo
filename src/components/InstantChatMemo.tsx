import { useState, useRef, useEffect } from 'react';
import { QuickNote } from '../types';
import { retroAudio } from '../utils/retroAudio';
import {
  Send,
  Trash2,
  Copy,
  Check,
  Keyboard,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Filter,
  Calendar,
  History,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Props {
  notes: QuickNote[];
  isOneWeekOnly?: boolean;
  onToggleOneWeekFilter?: () => void;
  onCreateNote: (content: string, mood?: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export type BubbleWidth = 'normal' | 'wide' | 'full';

export default function InstantChatMemo({
  notes,
  isOneWeekOnly = true,
  onToggleOneWeekFilter,
  onCreateNote,
  onDeleteNote,
}: Props) {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [bubbleTheme, setBubbleTheme] = useState<'kakao' | 'cyworld'>('kakao');
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [expandedNoteIds, setExpandedNoteIds] = useState<{ [id: string]: boolean }>({});
  const [textareaRows, setTextareaRows] = useState(3);

  // Bubble Width Setting (Saved to localStorage: normal: 78% right-aligned, wide: 90% wide card, full: 100% full-width)
  const [bubbleWidth, setBubbleWidth] = useState<BubbleWidth>(() => {
    try {
      const saved = localStorage.getItem('chat_bubble_width');
      if (saved === 'normal' || saved === 'wide' || saved === 'full') return saved;
    } catch {}
    return 'wide'; // default to wider layout for comfortable reading
  });

  const changeBubbleWidth = (width: BubbleWidth) => {
    retroAudio.playClick();
    setBubbleWidth(width);
    try {
      localStorage.setItem('chat_bubble_width', width);
    } catch {}
  };

  const toggleBubbleWidth = () => {
    const next: BubbleWidth =
      bubbleWidth === 'normal' ? 'wide' : bubbleWidth === 'wide' ? 'full' : 'normal';
    changeBubbleWidth(next);
  };

  // Fullscreen Modal for Note (전체 펼치기 -> 전체 화면 모달)
  const [fullscreenNote, setFullscreenNote] = useState<QuickNote | null>(null);
  const [fullscreenFontSize, setFullscreenFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Fullscreen Window Mode for InstantChatMemo container
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlyMatches, setFilterOnlyMatches] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const matchedNoteRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const toggleNoteExpand = (noteId: string) => {
    retroAudio.playClick();
    setExpandedNoteIds((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  // Sort notes oldest first (top to bottom like PC KakaoTalk)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Filtered or matched notes based on search query
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchedNotes = trimmedQuery
    ? sortedNotes.filter((n) => n.content.toLowerCase().includes(trimmedQuery))
    : [];

  const displayNotes =
    trimmedQuery && filterOnlyMatches
      ? sortedNotes.filter((n) => n.content.toLowerCase().includes(trimmedQuery))
      : sortedNotes;

  // Auto-scroll to bottom on new message or tab load (only when not searching)
  const scrollToBottom = (smooth = true) => {
    if (isSearchOpen && searchQuery.trim()) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [notes.length]);

  // Keep focus on textarea by default
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // When search bar opens, focus search input
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    } else {
      setSearchQuery('');
      setFilterOnlyMatches(false);
      textareaRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Jump to matched note
  const jumpToMatch = (index: number) => {
    if (matchedNotes.length === 0) return;
    const target = matchedNotes[index];
    if (target && matchedNoteRefs.current[target.id]) {
      matchedNoteRefs.current[target.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handleNextMatch = () => {
    if (matchedNotes.length === 0) return;
    retroAudio.playClick();
    const nextIndex = (activeMatchIndex + 1) % matchedNotes.length;
    setActiveMatchIndex(nextIndex);
    jumpToMatch(nextIndex);
  };

  const handlePrevMatch = () => {
    if (matchedNotes.length === 0) return;
    retroAudio.playClick();
    const prevIndex = (activeMatchIndex - 1 + matchedNotes.length) % matchedNotes.length;
    setActiveMatchIndex(prevIndex);
    jumpToMatch(prevIndex);
  };

  // Fullscreen Note navigation helpers
  const currentFullscreenIndex = fullscreenNote
    ? sortedNotes.findIndex((n) => n.id === fullscreenNote.id)
    : -1;

  const handlePrevFullscreenNote = () => {
    if (currentFullscreenIndex > 0) {
      retroAudio.playClick();
      setFullscreenNote(sortedNotes[currentFullscreenIndex - 1]);
    }
  };

  const handleNextFullscreenNote = () => {
    if (currentFullscreenIndex >= 0 && currentFullscreenIndex < sortedNotes.length - 1) {
      retroAudio.playClick();
      setFullscreenNote(sortedNotes[currentFullscreenIndex + 1]);
    }
  };

  // Global Ctrl+F / Cmd+F and ESC / Arrow navigation handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. If Fullscreen Note modal is open
      if (fullscreenNote) {
        if (e.key === 'Escape') {
          e.preventDefault();
          retroAudio.playClick();
          setFullscreenNote(null);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevFullscreenNote();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextFullscreenNote();
        }
        return;
      }

      // 2. Search shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        retroAudio.playClick();
        return;
      }

      // 3. Escape key handling
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          retroAudio.playClick();
        } else if (isWindowFullscreen) {
          setIsWindowFullscreen(false);
          retroAudio.playClick();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [fullscreenNote, currentFullscreenIndex, isSearchOpen, isWindowFullscreen, sortedNotes]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      retroAudio.playClick();
      await onCreateNote(trimmed, '💬');
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(true);
      }, 50);
    } catch (err) {
      console.error('Failed to send memo:', err);
      setInputText(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSend();
      return;
    }

    if (sendOnEnter && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
  };

  const handleCopy = (note: QuickNote) => {
    retroAudio.playClick();
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group notes by date (YYYY-MM-DD)
  const groupedNotes: { [dateStr: string]: QuickNote[] } = {};
  displayNotes.forEach((note) => {
    const d = new Date(note.createdAt);
    const dateKey = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (!groupedNotes[dateKey]) {
      groupedNotes[dateKey] = [];
    }
    groupedNotes[dateKey].push(note);
  });

  // Highlight search matches in text
  const renderHighlightedContent = (text: string, isCurrentMatchTarget: boolean) => {
    if (!trimmedQuery) return text;

    const regex = new RegExp(`(${trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === trimmedQuery ? (
        <mark
          key={i}
          className={`px-0.5 rounded font-bold transition-all ${
            isCurrentMatchTarget
              ? 'bg-[#ff5252] text-white ring-2 ring-[#ff5252]'
              : 'bg-amber-300 text-black'
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={
        isWindowFullscreen
          ? 'fixed inset-0 z-50 w-full h-full h-[100dvh] max-h-[100dvh] bg-[#b2c7d9] flex flex-col font-pixel text-xs overflow-hidden select-text shadow-2xl animate-in fade-in duration-100'
          : 'flex flex-col h-full max-h-full min-h-0 font-pixel text-xs bg-[#b2c7d9] rounded-lg border-2 border-[#8ba3b8] overflow-hidden select-text relative'
      }
    >
      {/* 1. PC Kakao-style Room Header */}
      <div className="bg-[#9bbad0] border-b border-[#84a5be] px-2.5 sm:px-3 py-2 flex items-center justify-between text-xs font-bold text-gray-800 shrink-0 select-none">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#fee500] text-[#3c1e1e] rounded-full flex items-center justify-center font-bold text-[10px] sm:text-[11px] shadow-xs shrink-0">
            💬
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[#1f2937] truncate text-xs">아무낙서</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${
                  isOneWeekOnly
                    ? 'bg-blue-100 text-[#0369a1] border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isOneWeekOnly ? '최근 7일' : '전체'} {notes.length}개
              </span>
              {isWindowFullscreen && (
                <span className="hidden sm:inline-flex items-center gap-1 bg-[#10558a] text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs">
                  ⛶ 전체 화면 모드 (ESC: 원래 크기)
                </span>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-600 font-normal truncate hidden xs:block">
              🔒 나만 보는 실시간 메모방 · Tab 누르면 즉시 저장
            </div>
          </div>
        </div>

        {/* Header Right Tools: 1-Week Toggle, Search Button, Width Control, Fullscreen & Theme */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Bubble Width Segmented Control (모든 노란 박스 너비 조절) */}
          <div className="flex items-center bg-white/90 rounded border border-gray-300 p-0.5 text-[10px] sm:text-[11px] shadow-xs">
            <span className="text-[10px] text-gray-500 font-bold px-1 hidden md:inline">너비:</span>
            <button
              type="button"
              onClick={() => changeBubbleWidth('normal')}
              className={`px-1.5 sm:px-2 py-0.5 rounded transition-all font-medium ${
                bubbleWidth === 'normal'
                  ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              title="기본: 글자 길이에 맞춰 작아지는 카카오톡 말풍선 (최대 62% 우측 정렬)"
            >
              기본
            </button>
            <button
              type="button"
              onClick={() => changeBubbleWidth('wide')}
              className={`px-1.5 sm:px-2 py-0.5 rounded transition-all font-medium ${
                bubbleWidth === 'wide'
                  ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              title="넓게: 가로 폭의 75%를 차지하는 넉넉한 와이드 카드 (우측 정렬 및 여백 유지)"
            >
              넓게<span className="hidden lg:inline text-[9px] opacity-80">(75%)</span>
            </button>
            <button
              type="button"
              onClick={() => changeBubbleWidth('full')}
              className={`px-1.5 sm:px-2 py-0.5 rounded transition-all font-medium ${
                bubbleWidth === 'full'
                  ? 'bg-[#2b84cb] text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
              title="꽉차게: 화면 좌우 끝까지 100% 꽉 채우는 전폭 메모장 모드"
            >
              꽉차게<span className="hidden lg:inline text-[9px] opacity-80">(100%)</span>
            </button>
          </div>

          {/* Window Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={() => {
              retroAudio.playClick();
              setIsWindowFullscreen((prev) => !prev);
            }}
            className={`px-1.5 sm:px-2 py-1 rounded border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
              isWindowFullscreen
                ? 'bg-[#10558a] text-white border-[#0c3e66] shadow-inner ring-1 ring-white/50'
                : 'bg-white/85 hover:bg-white text-gray-700 border-gray-300 shadow-xs'
            }`}
            title={isWindowFullscreen ? '원래 창 크기로 축소 (ESC)' : '아무낙서 전체 화면으로 크게 보기'}
          >
            {isWindowFullscreen ? (
              <>
                <Minimize2 className="w-3 h-3 text-amber-300" />
                <span className="hidden sm:inline">창 축소</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-[#2b84cb]" />
                <span className="hidden sm:inline">전체 화면</span>
              </>
            )}
          </button>

          {/* 1-Week / All Filter Toggle */}
          {onToggleOneWeekFilter && (
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                onToggleOneWeekFilter();
              }}
              className={`px-2 py-1 rounded border flex items-center gap-1 text-[11px] font-medium transition-all ${
                isOneWeekOnly
                  ? 'bg-white/85 hover:bg-white text-gray-700 border-gray-300 shadow-xs'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold shadow-xs'
              }`}
              title={
                isOneWeekOnly
                  ? '과거 1주일 이전 낙서까지 전체 불러오기'
                  : '최근 7일치 낙서만 보기로 전환 (속도 최적화)'
              }
            >
              <History className="w-3 h-3 text-[#2b84cb]" />
              <span className="hidden md:inline">
                {isOneWeekOnly ? '최근 7일' : '전체'}
              </span>
            </button>
          )}

          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              retroAudio.playClick();
              setIsSearchOpen((prev) => !prev);
            }}
            className={`px-2 py-1 rounded border flex items-center gap-1 text-[11px] font-bold transition-all ${
              isSearchOpen
                ? 'bg-[#2b84cb] text-white border-[#10558a] shadow-inner'
                : 'bg-white/85 hover:bg-white text-gray-700 border-gray-300 shadow-xs'
            }`}
            title="아무낙서 검색 (단축키: Ctrl + F)"
          >
            <Search className="w-3 h-3" />
            <span className="hidden sm:inline">검색</span>
          </button>

          {/* Theme button */}
          <button
            type="button"
            onClick={() => {
              retroAudio.playClick();
              setBubbleTheme((prev) => (prev === 'kakao' ? 'cyworld' : 'kakao'));
            }}
            className="px-1.5 sm:px-2 py-1 bg-white/85 hover:bg-white text-gray-700 rounded border border-gray-300 text-[10px] hidden xs:block"
            title="말풍선 테마 변경"
          >
            {bubbleTheme === 'kakao' ? '💛' : '💙'}
          </button>
        </div>
      </div>

      {/* 2. PC Kakao-style Retro Search Bar Tray (when open) */}
      {isSearchOpen && (
        <div className="bg-[#f0f4f8] border-b-2 border-[#2b84cb] p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 shadow-md animate-in slide-in-from-top-2 duration-150 shrink-0 select-none">
          <div className="flex items-center gap-1.5 flex-1 bg-white border border-[#2b84cb] rounded-md px-2 py-1 shadow-inner">
            <Search className="w-3.5 h-3.5 text-[#2b84cb] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                }
              }}
              placeholder="검색어를 입력하세요... (Enter: 다음 일치)"
              className="w-full text-xs text-[#222] focus:outline-none bg-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Result Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 text-[11px]">
            {trimmedQuery ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.5 rounded border border-[#bae6fd]">
                  {matchedNotes.length > 0
                    ? `${activeMatchIndex + 1} / ${matchedNotes.length}건 일치`
                    : '일치 없음'}
                </span>

                {/* Match Jump Buttons */}
                {matchedNotes.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      className="p-1 bg-white hover:bg-gray-100 rounded border border-gray-300 text-gray-700"
                      title="이전 일치 결과 (Shift + Enter)"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className="p-1 bg-white hover:bg-gray-100 rounded border border-gray-300 text-gray-700"
                      title="다음 일치 결과 (Enter)"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Filter Only Matches Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.playClick();
                    setFilterOnlyMatches((prev) => !prev);
                  }}
                  className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-0.5 ${
                    filterOnlyMatches
                      ? 'bg-[#2b84cb] text-white border-[#10558a]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="일치하는 낙서만 모아보기"
                >
                  <Filter className="w-2.5 h-2.5" />
                  <span>{filterOnlyMatches ? '모아보기 켬' : '모아보기'}</span>
                </button>

                {/* 1-week search expansion hint */}
                {isOneWeekOnly && onToggleOneWeekFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      onToggleOneWeekFilter();
                    }}
                    className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#0369a1] bg-[#e0f2fe] hover:bg-[#bae6fd] px-1.5 py-0.5 rounded border border-[#bae6fd] transition-colors"
                    title="1주일 이전의 모든 과거 낙서까지 검색 범위 확장"
                  >
                    <History className="w-2.5 h-2.5" />
                    <span>과거 낙서까지 검색</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-gray-500">ESC: 닫기</span>
            )}

            {/* Close Search Tray */}
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                setIsSearchOpen(false);
              }}
              className="p-1 hover:bg-gray-200 text-gray-600 rounded"
              title="검색 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Messages Chat Stream (Middle Area) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2.5 sm:p-3 space-y-3 sm:space-y-4">
        {/* Top 1-Week Filter Banner / Load Older History */}
        {isOneWeekOnly ? (
          <div className="bg-white/75 backdrop-blur-xs border border-[#8ba3b8] rounded-xl p-2.5 text-center shadow-xs flex flex-col items-center justify-center gap-1 text-gray-700 select-none">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#10558a]">
              <Calendar className="w-3.5 h-3.5 text-[#2b84cb]" />
              <span>최근 1주일(7일)간의 낙서만 실시간 표시 중입니다</span>
              <span className="px-1.5 py-0.2 bg-[#2b84cb] text-white rounded-full text-[9px] font-bold">
                {notes.length}개
              </span>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight max-w-sm">
              빠른 로딩과 대용량 데이터 최적화를 위해 최근 7일치 낙서만 DB에서 실시간으로 가져옵니다.
            </p>
            {onToggleOneWeekFilter && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  onToggleOneWeekFilter();
                }}
                className="mt-0.5 px-3 py-1 bg-white hover:bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc] rounded-lg text-[11px] font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                title="1주일 이전의 모든 과거 낙서 불러오기"
              >
                <History className="w-3 h-3 text-[#0369a1]" />
                <span>이전 과거 낙서 전체 불러오기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[#fef3c7] border border-[#fde68a] rounded-xl p-2 shadow-xs flex items-center justify-between text-amber-900 select-none px-3">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span>📂 과거를 포함한 전체 낙서가 표시 중입니다 ({notes.length}개)</span>
            </div>
            {onToggleOneWeekFilter && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  onToggleOneWeekFilter();
                }}
                className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold transition-all shadow-2xs"
              >
                ⚡ 최근 7일치만 보기
              </button>
            )}
          </div>
        )}
        {displayNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 p-6 space-y-2 select-none">
            <div className="w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-2xl shadow-inner">
              {trimmedQuery ? '🔍' : '📝'}
            </div>
            <div className="font-bold text-sm text-gray-800">
              {trimmedQuery
                ? `"${searchQuery}" 검색 결과가 없습니다.`
                : '첫 번째 아무낙서를 남겨보세요!'}
            </div>
            <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
              {trimmedQuery ? (
                <span>다른 검색어를 입력하시거나 검색창을 닫아주세요.</span>
              ) : (
                <span>
                  하단 입력창에 생각을 적고 <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-[#2b84cb]">Tab</kbd> 키를 누르면 PC 카톡처럼 바로바로 대화창에 기록됩니다.
                </span>
              )}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotes).map(([dateLabel, dateNotes]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date divider */}
              <div className="flex items-center justify-center my-2 select-none">
                <span className="bg-[#000000]/15 text-white px-3 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                  {dateLabel}
                </span>
              </div>

              {/* Chat bubbles */}
              {dateNotes.map((note) => {
                const dateObj = new Date(note.createdAt);
                const timeStr = dateObj.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                const isCurrentMatchTarget =
                  matchedNotes.length > 0 &&
                  matchedNotes[activeMatchIndex]?.id === note.id;

                const isKakao = bubbleTheme === 'kakao';
                const bubbleBg = isKakao
                  ? 'bg-[#fee500] text-[#1f2937] border-[#eed500]'
                  : 'bg-white text-[#1f2937] border-[#b8c6d4]';

                // Responsive width styling:
                // normal: 내용 길이에 맞춘 컴팩트 카톡 말풍선 (최대 62%)
                // wide: 가로 75%의 널찍한 우측 카드형 (왼쪽에 약 25% 여백 유지)
                // full: 화면 좌우 여백 없이 100% 꽉 채우는 전폭 메모장 모드
                const isFull = bubbleWidth === 'full';
                const currentWidthClass =
                  bubbleWidth === 'normal'
                    ? 'max-w-[70%] sm:max-w-[62%]'
                    : bubbleWidth === 'wide'
                    ? 'w-[84%] sm:w-[75%]'
                    : 'w-full min-w-full';

                return (
                  <div
                    key={note.id}
                    ref={(el) => {
                      matchedNoteRefs.current[note.id] = el;
                    }}
                    className={`w-full transition-all group pr-1 ${
                      isFull
                        ? 'flex flex-col gap-1'
                        : 'flex items-end justify-end gap-1.5'
                    } ${
                      isCurrentMatchTarget
                        ? 'p-1 rounded-xl bg-blue-400/20 ring-2 ring-[#2b84cb]'
                        : ''
                    }`}
                  >
                    {/* If full mode, show top metadata bar */}
                    {isFull ? (
                      <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 select-none">
                        <span className="font-semibold text-gray-600 flex items-center gap-1">
                          <span>🕒</span>
                          <span>{timeStr}</span>
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              setFullscreenNote(note);
                            }}
                            className="p-1 bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-300 shadow-2xs"
                            title="전체 펼치기"
                          >
                            <Maximize2 className="w-2.5 h-2.5 text-[#2b84cb]" />
                          </button>
                          <button
                            onClick={() => handleCopy(note)}
                            className="p-1 bg-white hover:bg-gray-100 text-gray-600 rounded border border-gray-300 shadow-2xs"
                            title="내용 복사"
                          >
                            {copiedId === note.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              onDeleteNote(note.id);
                            }}
                            className="p-1 bg-white hover:bg-rose-50 text-rose-600 rounded border border-gray-300 shadow-2xs"
                            title="삭제"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Hover action buttons (Copy / Delete / Fullscreen / Width) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pb-1 shrink-0">
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              setFullscreenNote(note);
                            }}
                            className="p-1 bg-white/90 hover:bg-white text-gray-700 rounded border border-gray-300 shadow-xs"
                            title="전체 펼치기 (전체 화면으로 크게 보기)"
                          >
                            <Maximize2 className="w-2.5 h-2.5 text-[#2b84cb]" />
                          </button>
                          <button
                            onClick={toggleBubbleWidth}
                            className={`p-1 rounded border shadow-xs transition-colors ${
                              bubbleWidth !== 'normal'
                                ? 'bg-[#2b84cb] text-white border-[#10558a]'
                                : 'bg-white/90 hover:bg-white text-gray-700 border-gray-300'
                            }`}
                            title={
                              bubbleWidth === 'normal'
                                ? '넓게 늘리기 (75%)'
                                : bubbleWidth === 'wide'
                                ? '100% 꽉차게 늘리기'
                                : '기본 말풍선으로 축소'
                            }
                          >
                            <MoveHorizontal className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => handleCopy(note)}
                            className="p-1 bg-white/90 hover:bg-white text-gray-600 rounded border border-gray-300 shadow-xs"
                            title="내용 복사"
                          >
                            {copiedId === note.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              retroAudio.playClick();
                              onDeleteNote(note.id);
                            }}
                            className="p-1 bg-white/90 hover:bg-rose-50 text-rose-600 rounded border border-gray-300 shadow-xs"
                            title="삭제"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Timestamp */}
                        <div className="text-[10px] text-gray-600 pb-0.5 select-none shrink-0">
                          {timeStr}
                        </div>
                      </>
                    )}

                    {/* Speech Bubble */}
                    {(() => {
                      const isLong = note.content.length > 300;
                      const isExpanded = !!expandedNoteIds[note.id];
                      const displayContent =
                        isLong && !isExpanded
                          ? note.content.slice(0, 280) + '...'
                          : note.content;

                      return (
                        <div
                          className={`relative ${currentWidthClass} p-2.5 sm:p-3 rounded-2xl rounded-tr-xs border shadow-xs leading-relaxed break-words text-xs ${bubbleBg} transition-all duration-150`}
                        >
                          <div className="whitespace-pre-wrap max-h-[420px] overflow-y-auto pr-1">
                            {renderHighlightedContent(displayContent, isCurrentMatchTarget)}
                          </div>

                          {/* Bubble bottom action bar */}
                          <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-between gap-1 flex-wrap">
                            {/* "전체 펼치기" 누르면 아예 전체 화면으로 크게 나오게 */}
                            <button
                              type="button"
                              onClick={() => {
                                retroAudio.playClick();
                                setFullscreenNote(note);
                              }}
                              className="px-2 py-0.5 bg-[#2b84cb] hover:bg-[#10558a] text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                              title="이 메모를 전체 화면으로 시원하게 크게 펼쳐보기"
                            >
                              <Maximize2 className="w-2.5 h-2.5" />
                              <span>전체 펼치기 (전체 화면)</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {/* 노란색 박스 너비 조절 버튼 (전체 노란 박스 동시 적용) */}
                              <button
                                type="button"
                                onClick={toggleBubbleWidth}
                                className="text-[10px] text-gray-700 hover:text-black font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-black/5"
                                title="모든 노란색 박스의 너비를 순환 변경합니다 (기본 → 넓게 → 꽉차게)"
                              >
                                <MoveHorizontal className="w-2.5 h-2.5 text-[#2b84cb]" />
                                <span>
                                  {bubbleWidth === 'normal'
                                    ? '넓게 늘리기 (75%)'
                                    : bubbleWidth === 'wide'
                                    ? '100% 꽉차게'
                                    : '기본 말풍선으로'}
                                </span>
                              </button>

                              {/* 긴 글 인라인 펼치기/접기 */}
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() => toggleNoteExpand(note.id)}
                                  className="text-[10px] font-bold text-[#2b84cb] hover:underline ml-1"
                                >
                                  {isExpanded ? '▲ 접기' : `▼ 더보기`}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Bottom Fixed Textarea Box (무조건 하단 고정) */}
      <div className="bg-white border-t border-[#8ba3b8] p-2 flex flex-col gap-1.5 shrink-0">
        {/* Shortcut guide & options */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 select-none flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] rounded font-bold">
              <Keyboard className="w-2.5 h-2.5" />
              Tab : 즉시 저장
            </span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sendOnEnter}
                onChange={(e) => setSendOnEnter(e.target.checked)}
                className="rounded text-[#2b84cb] focus:ring-0 w-3 h-3"
              />
              <span>Enter 전송 (Shift+Enter 줄바꿈)</span>
            </label>
            <button
              type="button"
              onClick={() => setTextareaRows((r) => (r === 3 ? 7 : 3))}
              className="text-[#2b84cb] hover:underline"
            >
              [{textareaRows === 3 ? '창 크게 (7줄)' : '창 작게 (3줄)'}]
            </button>
          </div>
          <span className="text-gray-400">
            {inputText.length > 0 ? (
              <span className="text-[#2b84cb] font-bold">
                {inputText.length.toLocaleString()}자 작성 중 (대용량 지원)
              </span>
            ) : (
              '최대 50만 자 대용량 지원'
            )}
          </span>
        </div>

        {/* Textarea & Send Button */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={textareaRows}
            placeholder="아주 긴 글이나 소설, 논문, 코드, 일기도 마음껏 끄적여보세요... [Tab 키를 누르면 바로 저장됩니다!]"
            className="flex-1 p-2 bg-[#f8fafc] border border-gray-300 focus:border-[#2b84cb] rounded-lg text-xs leading-relaxed resize-y focus:outline-none focus:bg-white transition-colors"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !inputText.trim()}
            className="cyworld-btn px-4 py-3 rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs font-bold shrink-0 disabled:opacity-40 transition-transform active:scale-95 shadow-sm"
            title="Tab 키를 눌러도 바로 전송됩니다"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="text-[11px]">전송</span>
            <span className="text-[9px] opacity-80">(Tab)</span>
          </button>
        </div>
      </div>

      {/* 5. Fullscreen Note Reader Modal (전체 펼치기 클릭 시 아예 전체 화면으로 크게 표시) */}
      {fullscreenNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150 select-text overflow-y-auto"
        >
          <div className="w-full max-w-4xl h-full max-h-[96vh] sm:max-h-[90vh] my-auto bg-[#fffdf0] border-3 sm:border-4 border-[#eab308] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-pixel">
            {/* Modal Header */}
            <div className="bg-[#fef08a] border-b-2 border-[#eab308] px-3 sm:px-5 py-3 flex items-center justify-between text-gray-800 select-none shrink-0 gap-2">
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#fee500] text-[#3c1e1e] rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 border border-[#ca8a04]">
                  💬
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-gray-900 truncate">
                      아무낙서 전체 펼치기 (전체 화면)
                    </span>
                    {currentFullscreenIndex >= 0 && (
                      <span className="text-[10px] sm:text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold shrink-0">
                        {currentFullscreenIndex + 1} / {sortedNotes.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
                    <span>{new Date(fullscreenNote.createdAt).toLocaleString('ko-KR')}</span>
                    <span>·</span>
                    <span className="font-bold text-[#10558a]">
                      {fullscreenNote.content.length.toLocaleString()}자
                    </span>
                    <span>·</span>
                    <span>{fullscreenNote.content.split('\n').length}줄</span>
                  </div>
                </div>
              </div>

              {/* Modal Controls */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Prev / Next Note navigation */}
                <div className="flex items-center gap-0.5 bg-amber-100 rounded-lg p-0.5 border border-amber-300">
                  <button
                    type="button"
                    disabled={currentFullscreenIndex <= 0}
                    onClick={handlePrevFullscreenNote}
                    className="p-1 hover:bg-amber-200 disabled:opacity-30 rounded text-gray-700 transition-colors"
                    title="이전 낙서 (← 키)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentFullscreenIndex >= sortedNotes.length - 1}
                    onClick={handleNextFullscreenNote}
                    className="p-1 hover:bg-amber-200 disabled:opacity-30 rounded text-gray-700 transition-colors"
                    title="다음 낙서 (→ 키)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Font Size Adjust */}
                <div className="hidden sm:flex items-center gap-0.5 bg-amber-100 rounded-lg p-0.5 border border-amber-300 text-[10px] font-bold text-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('sm');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'sm' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 작게"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('base');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'base' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 보통"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('lg');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'lg' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 크게"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.playClick();
                      setFullscreenFontSize('xl');
                    }}
                    className={`px-1.5 py-0.5 rounded ${fullscreenFontSize === 'xl' ? 'bg-[#2b84cb] text-white' : 'hover:bg-amber-200'}`}
                    title="글자 아주 크게"
                  >
                    A++
                  </button>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(fullscreenNote)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-gray-800 rounded-lg border border-amber-300 font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                  title="본문 전체 복사"
                >
                  {copiedId === fullscreenNote.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">복사</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.playClick();
                    setFullscreenNote(null);
                  }}
                  className="p-1 sm:p-1.5 hover:bg-rose-100 text-gray-700 hover:text-rose-600 rounded-lg border border-amber-300 transition-colors"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Large, Beautiful Yellow Post-It / Notepad Paper */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#fffbeb] selection:bg-amber-200">
              <div
                className={`whitespace-pre-wrap break-words leading-relaxed text-gray-900 ${
                  fullscreenFontSize === 'sm'
                    ? 'text-xs sm:text-sm'
                    : fullscreenFontSize === 'base'
                    ? 'text-sm sm:text-base'
                    : fullscreenFontSize === 'lg'
                    ? 'text-base sm:text-lg'
                    : 'text-lg sm:text-xl'
                }`}
              >
                {renderHighlightedContent(fullscreenNote.content, false)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#fef08a]/90 border-t border-[#eab308] px-4 py-2 flex items-center justify-between text-[11px] text-gray-600 select-none shrink-0">
              <div className="flex items-center gap-2">
                <span>단축키: <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-black">ESC</kbd> 닫기</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline"><kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-black">←</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-black">→</kbd> 이전/다음 낙서</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  retroAudio.playClick();
                  setFullscreenNote(null);
                }}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 rounded-lg border border-gray-300 font-bold shadow-xs active:scale-95"
              >
                창 닫기 (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
