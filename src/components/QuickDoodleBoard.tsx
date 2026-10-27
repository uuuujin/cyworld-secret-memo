import { useState } from 'react';
import { QuickNote } from '../types';
import { retroAudio } from '../utils/retroAudio';
import { Edit3, Send, Trash2, Heart } from 'lucide-react';

interface Props {
  notes: QuickNote[];
  onCreateNote: (content: string, mood?: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

const DOODLE_MOODS = ['💭 생각', '🐾 일상', '💡 번뜩', '💧 감성', '☕ 휴식', '🔥 열공'];

export default function QuickDoodleBoard({ notes, onCreateNote, onDeleteNote }: Props) {
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('💭 생각');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateNote(content.trim(), selectedMood);
      setContent('');
      retroAudio.playChime();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-pixel text-xs">
      <div className="bg-[#f0f4f8] p-3 rounded-lg border border-[#cfd9e3] mb-3">
        <div className="text-[#2b84cb] font-bold text-sm mb-1 flex items-center gap-1.5">
          <Edit3 className="w-4 h-4 text-[#2b84cb]" />
          <span>★ 나만의 한줄 낙서 & 생각 보관함 ★</span>
        </div>
        <p className="text-gray-500 text-[11px] mb-2">
          문득 떠오른 생각, 오늘 있었던 짧은 한마디를 부담 없이 끄적여보세요.
        </p>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#2b84cb]"
            >
              {DOODLE_MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="지금 머릿속에 떠오른 생각 한 줄... (엔터로 등록)"
            maxLength={150}
            className="grow px-3 py-1.5 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:border-[#2b84cb]"
          />

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="cyworld-btn px-4 py-1.5 rounded flex items-center gap-1 justify-center shrink-0 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>남기기</span>
          </button>
        </form>
      </div>

      {/* Notes Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {notes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white border border-dashed border-gray-300 rounded-lg">
            <div className="text-3xl mb-1">✏️</div>
            <div className="text-gray-500 text-xs">아직 남겨진 낙서가 없습니다.</div>
            <div className="text-gray-400 text-[10px] mt-0.5">
              상단 입력창에 오늘의 기분이나 짧은 생각을 남겨보세요!
            </div>
          </div>
        ) : (
          notes.map((note) => {
            const timeStr = new Date(note.createdAt).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={note.id}
                className="bg-white border border-[#cfd9e3] hover:border-[#2b84cb] p-2.5 rounded-lg flex items-start justify-between gap-2 shadow-xs transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs shrink-0 mt-0.5 px-1.5 py-0.5 bg-[#f0f4f8] text-[#2b84cb] border border-[#d1dce5] rounded">
                    {note.mood || '💭'}
                  </span>
                  <div>
                    <p className="text-gray-800 text-xs leading-relaxed break-all">
                      {note.content}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 inline-block">
                      {timeStr}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    retroAudio.playClick();
                    onDeleteNote(note.id);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                  title="낙서 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
