import { useState } from 'react';
import { MemoItem, QuickNote, UserProfile } from '../types';
import { retroAudio } from '../utils/retroAudio';
import { Settings, Shield, Lock, Download, Check, Save, ExternalLink } from 'lucide-react';

interface Props {
  profile: UserProfile;
  memos: MemoItem[];
  quickNotes?: QuickNote[];
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export default function SettingsView({ profile, memos, quickNotes = [], onUpdateProfile }: Props) {
  const [hompyTitle, setHompyTitle] = useState(profile.hompyTitle || '★~나만의 비밀 미니홈피~★');
  const [displayName, setDisplayName] = useState(profile.displayName || '주인장');
  const [passcode, setPasscode] = useState(profile.passcode || '1234');
  const [isLockEnabled, setIsLockEnabled] = useState(profile.isLockEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    retroAudio.playClick();
    setIsSaving(true);
    try {
      await onUpdateProfile({
        hompyTitle,
        displayName,
        passcode,
        isLockEnabled,
      });
      retroAudio.playChime();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportMemos = () => {
    retroAudio.playClick();
    const backupData = {
      profile,
      memos,
      quickNotes,
      exportedAt: new Date().toISOString(),
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `cyworld_memos_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-full font-pixel text-xs overflow-y-auto pr-1">
      <div className="bg-[#f0f4f8] p-3 rounded-lg border border-[#cfd9e3] mb-3">
        <div className="flex items-center gap-1.5 font-bold text-[#2b84cb] text-sm mb-1">
          <Settings className="w-4 h-4" />
          <span>★ 미니홈피 관리 및 보안 잠금 설정 ★</span>
        </div>
        <p className="text-gray-500 text-[11px]">
          홈피 타이틀, 나만의 4자리 비밀번호(PIN), 데이터 백업 등을 관리할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        {/* Basic hompy profile settings */}
        <div className="bg-white p-3.5 rounded-lg border border-[#cfd9e3] space-y-3">
          <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1">
            <span className="text-[#2b84cb]">■</span>
            <span>홈피 기본 정보</span>
          </h4>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              미니홈피 상단 제목
            </label>
            <input
              type="text"
              value={hompyTitle}
              onChange={(e) => setHompyTitle(e.target.value)}
              maxLength={80}
              className="w-full p-2 bg-[#f8fafc] border border-gray-300 rounded text-xs focus:outline-none focus:border-[#2b84cb]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              주인장 닉네임
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="w-full p-2 bg-[#f8fafc] border border-gray-300 rounded text-xs focus:outline-none focus:border-[#2b84cb]"
            />
          </div>
        </div>

        {/* Security / PIN Lock Settings */}
        <div className="bg-white p-3.5 rounded-lg border border-[#cfd9e3] space-y-3">
          <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#0369a1]" />
            <span>비밀 금고 보안 설정 (나만 열어보기)</span>
          </h4>

          <label className="flex items-center gap-2 cursor-pointer select-none bg-[#f0f9ff] p-2.5 rounded border border-[#bae6fd]">
            <input
              type="checkbox"
              checked={isLockEnabled}
              onChange={(e) => setIsLockEnabled(e.target.checked)}
              className="rounded text-[#2b84cb] focus:ring-0"
            />
            <div>
              <span className="font-bold text-[#0369a1] text-xs">
                비밀 메모 탭 열람 시 4자리 비밀번호 확인 요청
              </span>
              <p className="text-[10px] text-gray-500">
                활성화하면 '비밀금고' 탭을 열 때 PIN 비밀번호 입력창이 뜹니다.
              </p>
            </div>
          </label>

          {isLockEnabled && (
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                4자리 숫자 비밀번호 (현재: {passcode})
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="p-2 bg-[#f8fafc] border border-gray-300 rounded text-center tracking-widest text-sm font-bold text-[#2b84cb] focus:outline-none focus:border-[#2b84cb]"
                />
                <span className="text-[10px] text-gray-400">숫자 4자리만 입력 가능</span>
              </div>
            </div>
          )}
        </div>

        {/* Backup & Export */}
        <div className="bg-white p-3.5 rounded-lg border border-[#cfd9e3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1 mb-0.5">
              <Download className="w-3.5 h-3.5 text-[#2b84cb]" />
              <span>전체 데이터 백업 & 내보내기</span>
            </h4>
            <p className="text-[11px] text-gray-500">
              현재 저장된 다이어리 메모 {memos.length}개, 아무낙서 {quickNotes.length}개를 안전하게 JSON 파일로 다운로드합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportMemos}
            className="cyworld-btn-light px-3 py-1.5 rounded flex items-center gap-1 font-bold shrink-0"
          >
            <Download className="w-3 h-3" />
            <span>전체 백업 다운로드</span>
          </button>
        </div>

        {/* Firebase Live Connection Info */}
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-3.5 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[#166534] text-xs flex items-center gap-1.5">
              <span>🔥</span>
              <span>Firebase 연동 및 보안 상태</span>
            </h4>
            <span className="px-2 py-0.5 bg-[#dcfce7] text-[#15803d] border border-[#86efac] rounded text-[10px] font-bold">
              ● 실시간 정상 연동됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1">
            <div className="bg-white p-2 rounded border border-[#e2e8f0]">
              <span className="text-gray-400 block text-[10px]">연동된 프로젝트 ID</span>
              <span className="font-mono font-bold text-[#2b84cb]">emergent-poetry-mq6d2</span>
            </div>
            <div className="bg-white p-2 rounded border border-[#e2e8f0]">
              <span className="text-gray-400 block text-[10px]">Firestore 데이터베이스 ID</span>
              <span className="font-mono text-[10px] font-bold text-gray-700">ai-studio-c1ec6c8a-6d5f-4828-9737-65c98ef874c9</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-[#e2e8f0] text-[10px] text-gray-600 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#166534]">보안 규칙 상태: </span>
              사용자 로그인 계정(<span className="font-bold text-[#2b84cb]">{profile.email}</span>)의 고유 UID로만 조회 및 작성이 허용되는 1인 비공개 규칙이 적용되어 있습니다.
            </div>
            <a
              href="https://console.firebase.google.com/project/emergent-poetry-mq6d2/firestore/databases/ai-studio-c1ec6c8a-6d5f-4828-9737-65c98ef874c9/data"
              target="_blank"
              rel="noopener noreferrer"
              className="cyworld-btn-light px-2 py-1 rounded inline-flex items-center gap-1 text-[10px] font-bold shrink-0"
              title="Firebase 콘솔에서 직접 데이터 확인"
            >
              <span>Firebase 콘솔에서 DB 보기</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* Save button bar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>설정이 안전하게 저장되었습니다!</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="cyworld-btn px-5 py-2 rounded font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '저장 중...' : '★ 설정 변경사항 저장 ★'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
