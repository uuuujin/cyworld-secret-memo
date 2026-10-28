import { Copy, Check, Lock, Sparkles, LogOut, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { retroAudio } from '../utils/retroAudio';

interface Props {
  title: string;
  userEmail: string;
  onLogout: () => void;
  dotoriCount: number;
  onChargeDotori: () => void;
  minimeEmoji?: string;
  onOpenMobileProfile?: () => void;
}

export default function HeaderBar({
  title,
  userEmail,
  onLogout,
  dotoriCount,
  onChargeDotori,
  minimeEmoji = '🏊‍♀️',
  onOpenMobileProfile,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    retroAudio.playClick();
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-[#f0f4f8] border-b-2 border-[#b8c6d4] px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-none md:rounded-t-xl flex items-center justify-between gap-1.5 text-xs shrink-0 select-none">
      {/* Title & Cyworld brackets */}
      <div className="flex items-center gap-1.5 truncate">
        {/* Mobile Profile Drawer Button */}
        {onOpenMobileProfile && (
          <button
            onClick={() => {
              retroAudio.playClick();
              onOpenMobileProfile();
            }}
            className="md:hidden p-1 bg-white border border-[#2b84cb] rounded text-xs flex items-center justify-center shrink-0 hover:bg-[#e0f2fe]"
            title="프로필 & 미니미 보기"
          >
            <span>{minimeEmoji}</span>
          </button>
        )}

        <span className="text-[#2b84cb] font-bold text-xs sm:text-sm tracking-wider flex items-center gap-0.5 truncate">
          <span className="text-[#ff5252] shrink-0">▶▷</span>
          <span className="truncate max-w-[130px] sm:max-w-[240px] md:max-w-[420px]">{title}</span>
          <span className="text-[#ff5252] shrink-0">◁◀</span>
        </span>

        <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc] rounded text-[10px] font-bold shrink-0">
          <Lock className="w-2.5 h-2.5" />
          비공개
        </span>
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Dotori counter */}
        <button
          onClick={() => {
            retroAudio.playChime();
            onChargeDotori();
          }}
          className="flex items-center gap-0.5 sm:gap-1 bg-[#fff8e7] hover:bg-[#fff2d1] text-[#92400e] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-[#fde68a] text-[10px] sm:text-xs font-bold transition-transform active:scale-95 shrink-0"
          title="클릭하여 도토리 충전하기!"
        >
          <span>🌰</span>
          <span className="hidden xs:inline">도토리</span>
          <span>{dotoriCount}</span>
          <Sparkles className="w-2.5 h-2.5 text-amber-500 hidden sm:inline" />
        </button>

        {/* Copy hompy URL */}
        <button
          onClick={handleCopyUrl}
          className="cyworld-btn-light px-1.5 sm:px-2 py-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] rounded shrink-0"
          title="주소 복사"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          <span className="hidden sm:inline">{copied ? '복사됨!' : '주소복사'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={() => {
            retroAudio.playClick();
            onLogout();
          }}
          className="cyworld-btn px-2 py-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] rounded shrink-0"
          title={`${userEmail} 로그아웃`}
        >
          <LogOut className="w-3 h-3" />
          <span className="hidden sm:inline">로그아웃</span>
        </button>
      </div>
    </header>
  );
}
