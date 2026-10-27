import { Copy, Check, Lock, Sparkles, LogOut } from 'lucide-react';
import { useState } from 'react';
import { retroAudio } from '../utils/retroAudio';

interface Props {
  title: string;
  userEmail: string;
  onLogout: () => void;
  dotoriCount: number;
  onChargeDotori: () => void;
}

export default function HeaderBar({
  title,
  userEmail,
  onLogout,
  dotoriCount,
  onChargeDotori,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    retroAudio.playClick();
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-[#f0f4f8] border-b-2 border-[#b8c6d4] px-4 py-2.5 rounded-t-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
      {/* Title & Cyworld brackets */}
      <div className="flex items-center gap-2">
        <span className="text-[#2b84cb] font-bold text-sm tracking-wider flex items-center gap-1">
          <span className="text-[#ff5252]">▶▷</span>
          <span className="truncate max-w-[280px] sm:max-w-[420px]">{title}</span>
          <span className="text-[#ff5252]">◁◀</span>
        </span>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc] rounded text-[10px] font-bold">
          <Lock className="w-2.5 h-2.5" />
          비공개 보안
        </span>
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Dotori counter */}
        <button
          onClick={() => {
            retroAudio.playChime();
            onChargeDotori();
          }}
          className="flex items-center gap-1 bg-[#fff8e7] hover:bg-[#fff2d1] text-[#92400e] px-2 py-1 rounded border border-[#fde68a] text-xs font-bold transition-transform active:scale-95"
          title="클릭하여 도토리 충전하기!"
        >
          <span>🌰</span>
          <span>도토리 {dotoriCount}개</span>
          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
        </button>

        {/* Copy hompy URL */}
        <button
          onClick={handleCopyUrl}
          className="cyworld-btn-light px-2 py-0.5 flex items-center gap-1 text-[11px] rounded"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? '복사됨!' : '주소복사'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={() => {
            retroAudio.playClick();
            onLogout();
          }}
          className="cyworld-btn px-2.5 py-0.5 flex items-center gap-1 text-[11px] rounded"
          title={`${userEmail} 로그아웃`}
        >
          <LogOut className="w-3 h-3" />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
}
