import { useState, useRef, useEffect } from 'react';
import { QuickNote } from '../types';
import { retroAudio } from '../utils/retroAudio';
import {
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Keyboard,
  Clock,
  MessageCircle,
} from 'lucide-react';

interface Props {
  notes: QuickNote[];
  onCreateNote: (content: string, mood?: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export default function InstantChatMemo({ notes, onCreateNote, onDeleteNote }: Props) {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [bubbleTheme, setBubbleTheme] = useState<'kakao' | 'cyworld'>('kakao');
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [expandedNoteIds, setExpandedNoteIds] = useState<{ [id: string]: boolean }>({});
  const [textareaRows, setTextareaRows] = useState(3);

  const toggleNoteExpand = (noteId: string) => {
    retroAudio.playClick();
    setExpandedNoteIds((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sort notes oldest first (top to bottom like PC KakaoTalk)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Auto-scroll to bottom on new message or tab load
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [notes.length]);

  // Keep focus on textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      retroAudio.playClick();
      await onCreateNote(trimmed, '💬');
      // Refocus textarea immediately
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(true);
      }, 50);
    } catch (err) {
      console.error('Failed to send memo:', err);
      // Restore input if error
      setInputText(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. User specifically requested: "tab 버튼 누르면 글 바로 저장되게"
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSend();
      return;
    }

    // 2. Also support Enter to send (Shift+Enter for newline) if enabled
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
  sortedNotes.forEach((note) => {
    const d = new Date(note.createdAt);
    const dateKey = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (!groupedNotes[dateKey]) {
      groupedNotes[dateKey] = [];
    }
    groupedNotes[dateKey].push(note);
  });

  return (
    <div className="flex flex-col h-full font-pixel text-xs bg-[#b2c7d9] rounded-lg border-2 border-[#8ba3b8] overflow-hidden select-text">
      {/* 1. PC Kakao-style Room Header */}
      <div className="bg-[#9bbad0] border-b border-[#84a5be] px-3 py-2 flex items-center justify-between text-xs font-bold text-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#fee500] text-[#3c1e1e] rounded-full flex items-center justify-center font-bold text-[11px] shadow-xs">
            💬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#1f2937]">아무낙서 (나와의 채팅 메모)</span>
              <span className="px-1.5 py-0.2 bg-white/70 text-gray-600 rounded-full text-[10px] font-normal">
                {notes.length}개
              </span>
            </div>
            <div className="text-[10px] text-gray-600 font-normal">
              🔒 나만 보는 실시간 메모방 · Tab 누르면 즉시 저장
            </div>
          </div>
        </div>

        {/* Style toggles */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => {
              retroAudio.playClick();
              setBubbleTheme((prev) => (prev === 'kakao' ? 'cyworld' : 'kakao'));
            }}
            className="px-2 py-0.5 bg-white/80 hover:bg-white text-gray-700 rounded border border-gray-300 text-[10px]"
            title="말풍선 테마 변경"
          >
            {bubbleTheme === 'kakao' ? '💛 카톡 옐로우' : '💙 싸이월드 블루'}
          </button>
        </div>
      </div>

      {/* 2. Messages Chat Stream (Middle Area) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {notes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 p-6 space-y-2">
            <div className="w-12 h-12 bg-white/60 rounded-full flex items-center justify-center text-2xl shadow-inner">
              📝
            </div>
            <div className="font-bold text-sm text-gray-800">
              첫 번째 아무낙서를 남겨보세요!
            </div>
            <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
              하단 입력창에 생각을 적고 <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-400 font-bold text-[#2b84cb]">Tab</kbd> 키를 누르면 PC 카톡처럼 바로바로 대화창에 기록됩니다.
            </p>
          </div>
        ) : (
          Object.entries(groupedNotes).map(([dateLabel, dateNotes]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date divider */}
              <div className="flex items-center justify-center my-2">
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

                const isKakao = bubbleTheme === 'kakao';
                const bubbleBg = isKakao
                  ? 'bg-[#fee500] text-[#1f2937] border-[#eed500]'
                  : 'bg-white text-[#1f2937] border-[#b8c6d4]';

                return (
                  <div
                    key={note.id}
                    className="flex items-end justify-end gap-1.5 group pr-1"
                  >
                    {/* Hover action buttons (Copy / Delete) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pb-1">
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

                    {/* Speech Bubble */}
                    {(() => {
                      const isLong = note.content.length > 400;
                      const isExpanded = !!expandedNoteIds[note.id];
                      const displayContent =
                        isLong && !isExpanded
                          ? note.content.slice(0, 380) + '...'
                          : note.content;

                      return (
                        <div
                          className={`relative max-w-[85%] sm:max-w-[78%] p-2.5 rounded-2xl rounded-tr-xs border shadow-xs leading-relaxed break-words text-xs ${bubbleBg}`}
                        >
                          <div className="whitespace-pre-wrap max-h-[420px] overflow-y-auto pr-1">
                            {displayContent}
                          </div>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggleNoteExpand(note.id)}
                              className="mt-1 text-[10px] font-bold text-[#2b84cb] hover:underline block pt-1 border-t border-black/10"
                            >
                              {isExpanded
                                ? '▲ 접기'
                                : `▼ 전체 펼치기 (총 ${note.content.length.toLocaleString()}자)`}
                            </button>
                          )}
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

      {/* 3. Bottom Fixed Textarea Box (무조건 하단 고정) */}
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
    </div>
  );
}
