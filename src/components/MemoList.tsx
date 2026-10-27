import { useState } from 'react';
import { MemoItem } from '../types';
import { retroAudio } from '../utils/retroAudio';
import {
  Pin,
  Lock,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface Props {
  memos: MemoItem[];
  currentFolder: string;
  onSelectFolder: (folder: string) => void;
  onOpenCreateModal: () => void;
  onEditMemo: (memo: MemoItem) => void;
  onDeleteMemo: (memoId: string) => void;
  onTogglePin: (memo: MemoItem) => void;
}

const FOLDER_FILTERS = [
  { id: 'all', label: '전체보기' },
  { id: 'diary', label: '📖 일상 다이어리' },
  { id: 'secret', label: '🔒 나만의 비밀' },
  { id: 'idea', label: '💡 아이디어' },
  { id: 'todo', label: '✅ 할 일' },
  { id: 'doodle', label: '✏️ 낙서장' },
];

export default function MemoList({
  memos,
  currentFolder,
  onSelectFolder,
  onOpenCreateModal,
  onEditMemo,
  onDeleteMemo,
  onTogglePin,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<{ [id: string]: boolean }>({});

  const toggleExpand = (memoId: string) => {
    retroAudio.playClick();
    setExpandedIds((prev) => ({ ...prev, [memoId]: !prev[memoId] }));
  };

  // Filter memos
  const filteredMemos = memos
    .filter((m) => {
      if (currentFolder !== 'all' && m.folder !== currentFolder) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = m.title.toLowerCase().includes(q);
      const inContent = m.content.toLowerCase().includes(q);
      const inTags = m.tags?.some((t) => t.toLowerCase().includes(q));
      return inTitle || inContent || inTags;
    })
    .sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCopyContent = (memo: MemoItem) => {
    retroAudio.playClick();
    navigator.clipboard.writeText(`${memo.title}\n\n${memo.content}`);
    setCopiedId(memo.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPaperClass = (bgPattern?: string) => {
    switch (bgPattern) {
      case 'grid':
        return 'paper-grid bg-white';
      case 'pink':
        return 'bg-[#fff1f2] border-[#fecdd3]';
      case 'blue':
        return 'bg-[#f0f9ff] border-[#bae6fd]';
      case 'yellow':
        return 'bg-[#fefce8] border-[#fef08a]';
      case 'lined':
      default:
        return 'paper-lined bg-white';
    }
  };

  return (
    <div className="flex flex-col h-full font-pixel text-xs">
      {/* 1. Header & Quick Controls */}
      <div className="bg-[#f8fafc] p-2.5 rounded-lg border border-[#cfd9e3] mb-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="메모 제목, 내용, 태그 검색..."
            className="w-full pl-7 pr-2 py-1 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:border-[#2b84cb]"
          />
        </div>

        {/* Sky Blue Create Memo Button */}
        <button
          onClick={() => {
            retroAudio.playClick();
            onOpenCreateModal();
          }}
          className="cyworld-btn px-3 py-1.5 rounded flex items-center gap-1.5 font-bold shadow-sm whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>새 메모 작성</span>
        </button>
      </div>

      {/* 2. Folder Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {FOLDER_FILTERS.map((f) => {
          const isActive = currentFolder === f.id;
          const count =
            f.id === 'all'
              ? memos.length
              : memos.filter((m) => m.folder === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => {
                retroAudio.playClick();
                onSelectFolder(f.id);
              }}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap border transition-colors ${
                isActive
                  ? 'bg-[#2b84cb] text-white border-[#10558a] font-bold'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-[#e0f2fe]'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`ml-1 text-[10px] px-1 rounded-full ${
                  isActive ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Memos Card Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredMemos.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-4xl mb-2">📜</div>
            <h4 className="font-bold text-gray-700 text-sm mb-1">
              작성된 메모가 없습니다.
            </h4>
            <p className="text-gray-500 text-xs mb-3">
              나만의 이야기나 기억하고 싶은 일들을 기록해보세요!
            </p>
            <button
              onClick={() => {
                retroAudio.playClick();
                onOpenCreateModal();
              }}
              className="cyworld-btn px-3 py-1 rounded"
            >
              첫 메모 남기기
            </button>
          </div>
        ) : (
          filteredMemos.map((memo) => {
            const paperClass = getPaperClass(memo.bgPattern);
            const dateStr = new Date(memo.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={memo.id}
                className={`border-2 border-[#b8c6d4] rounded-lg p-3.5 shadow-xs transition-shadow hover:shadow-md relative ${paperClass}`}
              >
                {/* Card Top Badges & Meta */}
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-gray-200/80 pb-2 mb-2 text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {memo.isPinned && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc] rounded font-bold">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                        고정됨
                      </span>
                    )}
                    {memo.isSecret && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded font-bold">
                        <Lock className="w-2.5 h-2.5" />
                        비밀글
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                      {FOLDER_FILTERS.find((f) => f.id === memo.folder)?.label || memo.folder}
                    </span>
                    {memo.weather && (
                      <span className="text-gray-600">{memo.weather}</span>
                    )}
                    {memo.mood && (
                      <span className="text-gray-600">| {memo.mood}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#1f2937] mb-2 flex items-center gap-1">
                  <span className="text-[#2b84cb]">▶</span>
                  <span>{memo.title}</span>
                </h3>

                {/* Content */}
                {(() => {
                  const isLong = memo.content.length > 500;
                  const isExpanded = !!expandedIds[memo.id];
                  const displayContent =
                    isLong && !isExpanded
                      ? memo.content.slice(0, 480) + '...'
                      : memo.content;

                  return (
                    <div className="mb-3">
                      <div className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed break-words">
                        {displayContent}
                      </div>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(memo.id)}
                          className="mt-1.5 text-[11px] font-bold text-[#2b84cb] hover:underline flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <span>▲ 내용 접기</span>
                          ) : (
                            <span>▼ 전체 내용 펼쳐보기 (총 {memo.content.length.toLocaleString()}자)</span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Tags */}
                {memo.tags && memo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3 pt-1 border-t border-dashed border-gray-200">
                    {memo.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] text-[#2b84cb] bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-[11px]">
                  <button
                    onClick={() => onTogglePin(memo)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                      memo.isPinned
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Pin className="w-2.5 h-2.5" />
                    <span>{memo.isPinned ? '고정해제' : '상단고정'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyContent(memo)}
                      className="cyworld-btn-light px-2 py-0.5 rounded flex items-center gap-1 text-[10px]"
                      title="내용 복사"
                    >
                      {copiedId === memo.id ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>복사완료</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>복사</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        retroAudio.playClick();
                        onEditMemo(memo);
                      }}
                      className="cyworld-btn-light px-2 py-0.5 rounded flex items-center gap-1 text-[10px]"
                      title="메모 수정"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>수정</span>
                    </button>

                    <button
                      onClick={() => {
                        retroAudio.playClick();
                        if (window.confirm('이 메모를 정말 삭제하시겠습니까?')) {
                          onDeleteMemo(memo.id);
                        }
                      }}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded flex items-center gap-1 text-[10px]"
                      title="메모 삭제"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
