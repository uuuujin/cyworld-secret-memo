import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { retroAudio } from '../utils/retroAudio';
import { Edit2, Music, Play, Square, SkipForward, ShieldCheck } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSelectTab: (tab: any) => void;
}

const MINIME_LIST = [
  { id: 'cat', name: '도트 고양이', emoji: '🐱', desc: '도트 낭만 냥이' },
  { id: 'boy', name: '도토리 소년', emoji: '🧢', desc: '싸이월드 감성 소년' },
  { id: 'girl', name: '리본 소녀', emoji: '🎀', desc: '추억의 도트 소녀' },
  { id: 'bear', name: '도트 곰돌이', emoji: '🧸', desc: '포근한 미니미' },
];

const MOOD_OPTIONS = [
  { id: '행복', label: '행복', emoji: '☀️' },
  { id: '슬픔', label: '눈물', emoji: '💧' },
  { id: '열정', label: '열공', emoji: '🔥' },
  { id: '사랑', label: '두근', emoji: '💖' },
  { id: '피곤', label: '졸림', emoji: '💤' },
  { id: '멘붕', label: '멍함', emoji: '🌀' },
];

export default function LeftProfile({ profile, onUpdateProfile, onSelectTab }: Props) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusText, setStatusText] = useState(profile.statusMessage || 'ㄴr는 ㄱr끔 눈물을 흘린ㄷr...☆');
  const [selectedMinime, setSelectedMinime] = useState('cat');
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(retroAudio.getCurrentTrackTitle());

  useEffect(() => {
    setStatusText(profile.statusMessage || 'ㄴr는 ㄱr끔 눈물을 흘린ㄷr...☆');
  }, [profile.statusMessage]);

  const handleSaveStatus = () => {
    retroAudio.playClick();
    onUpdateProfile({ statusMessage: statusText });
    setIsEditingStatus(false);
  };

  const handleToggleBgm = () => {
    retroAudio.playClick();
    const playing = retroAudio.toggleBgm((title, isPlaying) => {
      setCurrentTrack(title);
      setIsPlayingBgm(isPlaying);
    });
    setIsPlayingBgm(playing);
  };

  const handleNextTrack = () => {
    retroAudio.playClick();
    const next = retroAudio.nextTrack((title, isPlaying) => {
      setCurrentTrack(title);
      setIsPlayingBgm(isPlaying);
    });
    setCurrentTrack(next);
  };

  const handleMoodChange = (moodId: string) => {
    retroAudio.playClick();
    onUpdateProfile({ todayMood: moodId });
  };

  return (
    <aside className="w-full lg:w-72 bg-[#edf2f7] p-3 border-2 border-[#b8c6d4] rounded-lg flex flex-col gap-3 font-pixel">
      {/* 1. Today & Total Visitors (The Cyworld classic) */}
      <div className="flex items-center justify-between text-xs px-2 py-1 bg-white border border-[#cfd9e3] rounded shadow-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[#333]">TODAY</span>
          <span className="text-[#e11d48] font-bold text-sm">
            {profile.todayCount ?? 42}
          </span>
        </div>
        <div className="text-gray-400">|</div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 font-bold">TOTAL</span>
          <span className="text-gray-700 font-bold">
            {profile.totalCount ?? 2108}
          </span>
        </div>
      </div>

      {/* 2. Minime & Today IS Section */}
      <div className="bg-white border-2 border-[#cfd9e3] p-3 rounded flex flex-col items-center">
        {/* Today is mood bar */}
        <div className="w-full text-center pb-2 border-b border-dashed border-gray-300 mb-2">
          <div className="text-[11px] font-bold text-[#2b84cb] mb-1">
            ★ TODAY IS... {profile.todayMood || '행복'} ★
          </div>
          <div className="flex justify-center gap-1 flex-wrap">
            {MOOD_OPTIONS.map((m) => {
              const active = (profile.todayMood || '행복') === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleMoodChange(m.id)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    active
                      ? 'bg-[#2b84cb] text-white border-[#10558a]'
                      : 'bg-[#f8fafc] text-gray-700 border-[#e2e8f0] hover:bg-[#e0f2fe]'
                  }`}
                  title={m.label}
                >
                  <span>{m.emoji}</span>
                  <span className="ml-0.5">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Minime Avatar Canvas */}
        <div className="relative w-36 h-36 bg-[#f0f8ff] border-2 border-[#2b84cb] rounded-lg p-2 flex flex-col items-center justify-center my-1 overflow-hidden shadow-inner">
          {/* Retro Room Wallpaper Effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#2b84cb_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Minime Character */}
          <div className="text-5xl animate-bounce duration-1000 z-10 filter drop-shadow">
            {MINIME_LIST.find((m) => m.id === selectedMinime)?.emoji || '🐱'}
          </div>
          <div className="z-10 text-[10px] text-[#2b84cb] font-bold mt-1 bg-white/90 px-1.5 py-0.5 rounded border border-[#bae6fd]">
            {MINIME_LIST.find((m) => m.id === selectedMinime)?.name}
          </div>

          {/* Floor Shadow */}
          <div className="w-16 h-3 bg-gray-400/30 rounded-full mt-1 blur-xs" />
        </div>

        {/* Change Minime */}
        <div className="w-full flex items-center justify-between text-[10px] text-gray-500 mt-2 px-1">
          <span>미니미 변경:</span>
          <div className="flex gap-1">
            {MINIME_LIST.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  retroAudio.playClick();
                  setSelectedMinime(m.id);
                }}
                className={`px-1 rounded border text-xs ${
                  selectedMinime === m.id
                    ? 'bg-[#2b84cb] text-white border-[#10558a]'
                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                }`}
                title={m.desc}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Status Quote / 상태글 */}
        <div className="w-full mt-3 pt-2 border-t border-dashed border-gray-300 text-xs">
          {isEditingStatus ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                maxLength={100}
                rows={2}
                className="w-full text-xs p-1.5 border border-[#2b84cb] rounded bg-[#f8fafc] resize-none focus:outline-none"
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsEditingStatus(false)}
                  className="px-2 py-0.5 text-[10px] bg-gray-200 rounded"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveStatus}
                  className="cyworld-btn px-2 py-0.5 text-[10px] rounded"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
              <p className="text-gray-700 italic text-[11px] leading-relaxed break-all">
                "{profile.statusMessage || 'ㄴr는 ㄱr끔 눈물을 흘린ㄷr...☆'}"
              </p>
              <button
                onClick={() => {
                  retroAudio.playClick();
                  setIsEditingStatus(true);
                }}
                className="absolute top-1 right-1 text-gray-400 hover:text-[#2b84cb] p-1"
                title="상태 메시지 수정"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Owner Privacy Badge */}
      <div className="bg-[#e0f2fe] border border-[#7dd3fc] p-2 rounded text-[11px] flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#0369a1] shrink-0" />
        <div className="truncate">
          <div className="font-bold text-[#0369a1]">
            주인장: {profile.displayName || '나'}
          </div>
          <div className="text-[10px] text-gray-600 truncate">{profile.email}</div>
        </div>
      </div>

      {/* 5. Retro BGM Player Widget */}
      <div className="bg-[#24292e] text-white p-2.5 rounded border-2 border-[#4b5563] shadow-md">
        <div className="flex items-center justify-between text-[11px] text-[#38bdf8] mb-1 font-bold">
          <div className="flex items-center gap-1 truncate">
            <Music className="w-3 h-3 text-[#38bdf8] shrink-0" />
            <span className="truncate">BGM : {currentTrack}</span>
          </div>
          {/* Animated Equalizer bars */}
          <div className="flex items-end gap-0.5 h-3 shrink-0">
            <span
              className={`w-1 bg-[#22c55e] rounded-t-xs transition-all ${
                isPlayingBgm ? 'animate-pulse h-3' : 'h-1'
              }`}
            />
            <span
              className={`w-1 bg-[#38bdf8] rounded-t-xs transition-all ${
                isPlayingBgm ? 'animate-bounce h-3' : 'h-1.5'
              }`}
            />
            <span
              className={`w-1 bg-[#eab308] rounded-t-xs transition-all ${
                isPlayingBgm ? 'animate-pulse h-2.5' : 'h-1'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 mt-2">
          <button
            onClick={handleToggleBgm}
            className="cyworld-btn text-[10px] px-2 py-1 rounded flex items-center gap-1 grow justify-center"
          >
            {isPlayingBgm ? (
              <>
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>정지</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>재생</span>
              </>
            )}
          </button>
          <button
            onClick={handleNextTrack}
            className="cyworld-btn-light text-[10px] px-2 py-1 rounded flex items-center gap-1 shrink-0"
            title="다음 BGM 곡"
          >
            <SkipForward className="w-2.5 h-2.5" />
            <span>다음곡</span>
          </button>
        </div>
      </div>

      {/* 6. 일촌 파도타기 Wave Surfing Dropdown */}
      <div className="bg-white border border-[#cfd9e3] p-2 rounded text-xs">
        <div className="text-[11px] text-gray-500 mb-1 font-bold">
          🌊 일촌 파도타기 & 빠른 메뉴
        </div>
        <select
          onChange={(e) => {
            retroAudio.playClick();
            if (e.target.value) {
              onSelectTab(e.target.value);
            }
          }}
          className="w-full text-xs p-1 bg-[#f8fafc] border border-gray-300 rounded focus:outline-none focus:border-[#2b84cb]"
        >
          <option value="">이동할 페이지 선택 ▼</option>
          <option value="diary">📖 내 다이어리 & 메모</option>
          <option value="secret">🔒 비밀 금고 (Passcode)</option>
          <option value="doodle">✏️ 한줄 낙서장</option>
          <option value="calendar">📅 달력으로 보기</option>
          <option value="settings">⚙️ 미니홈피 설정</option>
        </select>
      </div>
    </aside>
  );
}
