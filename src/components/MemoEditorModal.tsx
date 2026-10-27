import { useState } from 'react';
import { MemoItem } from '../types';
import { retroAudio } from '../utils/retroAudio';
import CyworldSpecialSymbols from './CyworldSpecialSymbols';
import { X, Lock, Pin, Sparkles, Tag, Smile, CloudSun } from 'lucide-react';

interface Props {
  initialMemo?: MemoItem | null;
  onSave: (memoData: {
    title: string;
    content: string;
    folder: string;
    mood?: string;
    weather?: string;
    isSecret?: boolean;
    isPinned?: boolean;
    bgPattern?: string;
    tags?: string[];
  }) => Promise<void>;
  onClose: () => void;
  defaultFolder?: string;
}

const FOLDERS = [
  { id: 'diary', label: '📖 일상 다이어리' },
  { id: 'secret', label: '🔒 나만의 비밀' },
  { id: 'idea', label: '💡 번뜩이는 생각' },
  { id: 'todo', label: '✅ 할 일 메모' },
  { id: 'doodle', label: '✏️ 낙서장' },
];

const WEATHERS = ['☀️ 맑음', '⛅ 구름', '🌧️ 비', '❄️ 눈', '⚡ 번개', '💨 바람'];
const MOODS = ['😊 행복', '😭 슬픔/감성', '💖 두근두근', '☕ 평온', '🤯 멘붕', '🔥 열공'];

const PAPERS = [
  { id: 'lined', name: '클래식 줄노트', class: 'paper-lined bg-white' },
  { id: 'grid', name: '모눈 격자', class: 'paper-grid' },
  { id: 'blue', name: '파스텔 하늘', class: 'bg-[#f0f9ff]' },
  { id: 'pink', name: '체리 핑크', class: 'bg-[#fff1f2]' },
  { id: 'yellow', name: '레트로 옐로우', class: 'bg-[#fefce8]' },
];

export default function MemoEditorModal({
  initialMemo,
  onSave,
  onClose,
  defaultFolder = 'diary',
}: Props) {
  const [title, setTitle] = useState(initialMemo?.title || '');
  const [content, setContent] = useState(initialMemo?.content || '');
  const [folder, setFolder] = useState(initialMemo?.folder || defaultFolder);
  const [mood, setMood] = useState(initialMemo?.mood || '😊 행복');
  const [weather, setWeather] = useState(initialMemo?.weather || '☀️ 맑음');
  const [isSecret, setIsSecret] = useState(initialMemo?.isSecret ?? (defaultFolder === 'secret'));
  const [isPinned, setIsPinned] = useState(initialMemo?.isPinned ?? false);
  const [bgPattern, setBgPattern] = useState(initialMemo?.bgPattern || 'lined');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialMemo?.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      retroAudio.playClick();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    retroAudio.playClick();
  };

  const handleInsertSymbol = (symbol: string) => {
    retroAudio.playClick();
    setContent((prev) => prev + symbol);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave({
        title: title || '제목 없음',
        content,
        folder,
        mood,
        weather,
        isSecret,
        isPinned,
        bgPattern,
        tags,
      });
      retroAudio.playChime();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePaper = PAPERS.find((p) => p.id === bgPattern) || PAPERS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 font-pixel">
      <div className="bg-[#f0f4f8] border-3 border-[#2b84cb] rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Window Header */}
        <div className="bg-[#2b84cb] text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{initialMemo ? '★ 메모 수정하기 ★' : '★ 새로운 비밀 메모 쓰기 ★'}</span>
          </div>
          <button
            onClick={() => {
              retroAudio.playClick();
              onClose();
            }}
            className="hover:bg-[#10558a] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
          {/* 1. Folder & Privacy Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded border border-[#cfd9e3]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">폴더:</span>
              <select
                value={folder}
                onChange={(e) => {
                  retroAudio.playClick();
                  setFolder(e.target.value);
                  if (e.target.value === 'secret') setIsSecret(true);
                }}
                className="bg-[#f8fafc] border border-gray-300 rounded px-2 py-1 text-xs focus:border-[#2b84cb] focus:outline-none"
              >
                {FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 cursor-pointer select-none text-rose-600 font-bold">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => {
                    retroAudio.playClick();
                    setIsSecret(e.target.checked);
                  }}
                  className="rounded text-[#2b84cb] focus:ring-0"
                />
                <Lock className="w-3 h-3" />
                <span>나만보기 (비밀)</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer select-none text-[#2b84cb] font-bold">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => {
                    retroAudio.playClick();
                    setIsPinned(e.target.checked);
                  }}
                  className="rounded text-[#2b84cb] focus:ring-0"
                />
                <Pin className="w-3 h-3" />
                <span>상단 고정</span>
              </label>
            </div>
          </div>

          {/* 2. Weather & Mood & Paper selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded border border-[#cfd9e3]">
            {/* Weather */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                <CloudSun className="w-3 h-3 text-amber-500" />
                <span>날씨</span>
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="bg-[#f8fafc] border border-gray-300 rounded p-1 text-xs"
              >
                {WEATHERS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Mood */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                <Smile className="w-3 h-3 text-[#2b84cb]" />
                <span>오늘의 기분</span>
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="bg-[#f8fafc] border border-gray-300 rounded p-1 text-xs"
              >
                {MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Paper Theme */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-600">속지 디자인</label>
              <select
                value={bgPattern}
                onChange={(e) => {
                  retroAudio.playClick();
                  setBgPattern(e.target.value);
                }}
                className="bg-[#f8fafc] border border-gray-300 rounded p-1 text-xs"
              >
                {PAPERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Title Input */}
          <div className="bg-white p-2 rounded border border-[#cfd9e3]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="메모 제목을 적어주세요... (예: 오늘 있었던 특별한 일)"
              maxLength={500}
              className="w-full font-bold text-sm text-[#333] focus:outline-none px-1"
            />
          </div>

          {/* 4. Special Cyworld Character Tray */}
          <CyworldSpecialSymbols onInsert={handleInsertSymbol} />

          {/* 5. Content Area with styled paper texture */}
          <div
            className={`border-2 border-[#b8c6d4] rounded p-3 min-h-[220px] shadow-inner transition-colors flex flex-col ${activePaper.class}`}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="아주 긴 글, 소설, 공부 노트도 넉넉하게 저장됩니다."
              rows={11}
              required
              className="w-full bg-transparent resize-y focus:outline-none text-xs leading-relaxed text-[#222] flex-1"
            />
            <div className="text-[10px] text-gray-500 pt-1 text-right border-t border-gray-200/50 flex items-center justify-between">
              <span className="text-[#2b84cb]">★ 대용량 저장 지원 (최대 50만 자)</span>
              <span>현재 글자 수: <strong className="text-gray-800">{content.length.toLocaleString()}</strong>자</span>
            </div>
          </div>

          {/* 6. Tags */}
          <div className="bg-white p-2 rounded border border-[#cfd9e3] flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-[#2b84cb]" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="#태그 입력 후 엔터 (예: 비밀, 다이어리, 추억)"
                maxLength={20}
                className="grow text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="cyworld-btn-light px-2 py-0.5 rounded text-[11px]"
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] rounded text-[10px]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cfd9e3]">
            <button
              type="button"
              onClick={() => {
                retroAudio.playClick();
                onClose();
              }}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-pixel"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cyworld-btn px-4 py-1.5 rounded font-bold text-xs disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '★ 메모 남기기 (저장) ★'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
