import { useState } from 'react';
import { MemoItem } from '../types';
import { retroAudio } from '../utils/retroAudio';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileText } from 'lucide-react';

interface Props {
  memos: MemoItem[];
  onSelectMemo: (memo: MemoItem) => void;
}

export default function CalendarView({ memos, onSelectMemo }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayMemos, setSelectedDayMemos] = useState<MemoItem[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    retroAudio.playClick();
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayMemos(null);
  };

  const handleNextMonth = () => {
    retroAudio.playClick();
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayMemos(null);
  };

  const handleSelectDay = (day: number) => {
    retroAudio.playClick();
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const matched = memos.filter((m) => m.createdAt.startsWith(targetDateStr));
    setSelectedDayMemos(matched);
    setSelectedDateStr(`${year}년 ${month + 1}월 ${day}일`);
  };

  // Map memos count by day
  const memosByDay: { [day: number]: number } = {};
  memos.forEach((m) => {
    const d = new Date(m.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      memosByDay[dayNum] = (memosByDay[dayNum] || 0) + 1;
    }
  });

  return (
    <div className="flex flex-col h-full font-pixel text-xs">
      {/* Calendar Top Bar */}
      <div className="bg-[#f0f4f8] p-2.5 rounded-lg border border-[#cfd9e3] mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-[#2b84cb] text-sm">
          <CalendarIcon className="w-4 h-4" />
          <span>
            {year}년 {month + 1}월 다이어리 캘린더
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="cyworld-btn-light px-2 py-0.5 rounded flex items-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>이전달</span>
          </button>
          <button
            onClick={() => {
              retroAudio.playClick();
              setCurrentDate(new Date());
            }}
            className="cyworld-btn-light px-2 py-0.5 rounded"
          >
            오늘
          </button>
          <button
            onClick={handleNextMonth}
            className="cyworld-btn-light px-2 py-0.5 rounded flex items-center"
          >
            <span>다음달</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 overflow-hidden">
        {/* Month Grid */}
        <div className="lg:col-span-2 bg-white p-3 rounded-lg border border-[#cfd9e3] flex flex-col">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-500 mb-2 border-b pb-1">
            <span className="text-red-500">일</span>
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span className="text-blue-500">토</span>
          </div>

          <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50/50 rounded p-1" />
            ))}

            {/* Day cells */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const count = memosByDay[day] || 0;
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`p-1 rounded border text-left flex flex-col justify-between transition-colors min-h-[48px] ${
                    isToday
                      ? 'border-[#2b84cb] bg-[#e0f2fe]/60'
                      : count > 0
                      ? 'border-[#93c5fd] bg-blue-50/50 hover:bg-[#bae6fd]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold text-[11px] ${
                        isToday ? 'text-[#0369a1]' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-[#2b84cb] text-white px-1 rounded-full">
                        오늘
                      </span>
                    )}
                  </div>

                  {count > 0 && (
                    <div className="mt-1 flex items-center gap-0.5 text-[10px] text-[#0369a1] font-bold bg-white/80 px-1 rounded border border-[#7dd3fc]">
                      <FileText className="w-2.5 h-2.5" />
                      <span>{count}건</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Memo Detail Panel */}
        <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#cfd9e3] flex flex-col overflow-hidden">
          <div className="font-bold text-[#1f2937] text-xs pb-2 border-b border-gray-200 mb-2">
            {selectedDateStr ? `📅 ${selectedDateStr} 메모` : '날짜를 클릭해보세요'}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {!selectedDayMemos ? (
              <div className="h-full flex items-center justify-center text-center text-gray-400 text-xs p-4">
                왼쪽 달력에서 날짜를 선택하면
                <br />
                해당 날짜에 작성한 메모를 확인할 수 있습니다.
              </div>
            ) : selectedDayMemos.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-gray-400 text-xs p-4">
                이 날 작성된 메모가 없습니다.
              </div>
            ) : (
              selectedDayMemos.map((memo) => (
                <div
                  key={memo.id}
                  onClick={() => onSelectMemo(memo)}
                  className="bg-white p-2.5 rounded border border-[#cfd9e3] hover:border-[#2b84cb] cursor-pointer shadow-xs transition-colors"
                >
                  <div className="font-bold text-[#2b84cb] text-xs mb-1 truncate">
                    {memo.title}
                  </div>
                  <div className="text-gray-600 text-[11px] line-clamp-2 leading-relaxed">
                    {memo.content}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {memo.weather} {memo.mood}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
