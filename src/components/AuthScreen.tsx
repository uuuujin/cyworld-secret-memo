import { useState } from 'react';
import { loginWithGoogle } from '../firebase';
import { retroAudio } from '../utils/retroAudio';
import { Lock, Sparkles, Shield, AlertCircle } from 'lucide-react';

interface Props {
  onLoginSuccess?: () => void;
  noticeMessage?: string | null;
}

export default function AuthScreen({ onLoginSuccess, noticeMessage }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    retroAudio.playClick();
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      retroAudio.playChime();
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err?.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-pixel select-none">
      {/* Outer nostalgic pop-up window */}
      <div className="w-full max-w-md bg-[#edf2f7] border-3 border-[#2b84cb] rounded-xl shadow-2xl overflow-hidden">
        {/* Retro Window Title Bar */}
        <div className="bg-[#2b84cb] text-white px-3 py-2 flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#ff5252]">▶▷</span>
            <span>CYWORLD MINI-HOMPY MEMO (2000s)</span>
            <span className="text-[#ff5252]">◁◀</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-[#e0f2fe] text-[#2b84cb] rounded-xs flex items-center justify-center text-[10px]">
              _
            </span>
            <span className="w-3 h-3 bg-[#e0f2fe] text-[#2b84cb] rounded-xs flex items-center justify-center text-[10px]">
              □
            </span>
            <span className="w-3 h-3 bg-[#ff5252] text-white rounded-xs flex items-center justify-center text-[10px]">
              ×
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Nostalgic Minihompy Lock Graphic */}
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-white border-2 border-[#2b84cb] rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-4xl animate-bounce">🏊‍♀️</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#2b84cb] text-white p-1 rounded-full border-2 border-white shadow">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-base font-bold text-gray-800 mb-1 flex items-center justify-center gap-1">
            <span className="text-[#2b84cb]">★</span>
            <span>나만 들어갈 수 있는 비밀 메모장</span>
            <span className="text-[#2b84cb]">★</span>
          </h1>

          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            2000년대 싸이월드 미니홈피 감성 그대로!
            <br />
            오직 로그인한 본인만 볼 수 있는 1인 비공개 다이어리입니다.
          </p>

          {/* Security highlight box */}
          <div className="w-full bg-white p-3 rounded-lg border border-[#cfd9e3] text-left text-[11px] mb-5 space-y-1.5 shadow-inner">
            <div className="flex items-center gap-1.5 text-[#0369a1] font-bold">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Firebase Firestore 100% 비공개 보안</span>
            </div>
            <p className="text-gray-500 text-[10px] leading-relaxed">
              작성된 메모와 다이어리는 철저한 보안 규칙으로 본인 구글 계정(UID)에만
              귀속되어 타인이 절대 열람하거나 검색할 수 없습니다.
            </p>
            <div className="pt-1 border-t border-dashed border-gray-200 text-gray-400 text-[10px] flex items-center justify-between">
              <span>기분 & 날씨 & 종이 속지</span>
              <span>4자리 비밀번호 잠금 지원</span>
            </div>
          </div>

          {noticeMessage && (
            <div className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-800 text-xs mb-3 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">로그인 세션 만료 안내</p>
                <p className="text-[10px] text-amber-700 leading-tight mt-0.5">{noticeMessage}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="w-full p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs mb-3 flex items-center gap-1.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sky Blue Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="cyworld-btn w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{loading ? '로그인 연결 중...' : 'Google 계정으로 미니홈피 열기'}</span>
          </button>

          <p className="text-[10px] text-gray-400 mt-4">
            Today 48 · Total 12,840 · 도토리 77개 충전 대기중
          </p>
        </div>
      </div>
    </div>
  );
}
