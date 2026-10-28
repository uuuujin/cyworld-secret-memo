import { useState } from 'react';
import { retroAudio } from '../utils/retroAudio';
import { Lock, KeyRound, X, ShieldAlert } from 'lucide-react';

interface Props {
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function SecretLockModal({ correctPin, onSuccess, onClose }: Props) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleDigit = (digit: string) => {
    retroAudio.playClick();
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        if (nextPin === (correctPin || '1234')) {
          retroAudio.playSecretLock();
          onSuccess();
        } else {
          setErrorMsg('비밀번호가 일치하지 않습니다.');
          setIsShaking(true);
          setTimeout(() => {
            setIsShaking(false);
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    retroAudio.playClick();
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    retroAudio.playClick();
    setPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 font-pixel overflow-y-auto">
      <div
        className={`bg-[#f0f4f8] border-3 border-[#2b84cb] rounded-lg shadow-2xl w-full max-w-xs my-auto overflow-hidden ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-[#2b84cb] text-white px-3 py-2 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>★ 비밀 금고 인증 ★</span>
          </div>
          <button
            onClick={() => {
              retroAudio.playClick();
              onClose();
            }}
            className="hover:bg-[#10558a] p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lock Body */}
        <div className="p-4 flex flex-col items-center">
          <div className="w-12 h-12 bg-[#e0f2fe] border-2 border-[#2b84cb] rounded-full flex items-center justify-center mb-2 shadow-inner">
            <KeyRound className="w-6 h-6 text-[#0369a1]" />
          </div>

          <h3 className="font-bold text-gray-800 text-sm mb-1">비밀번호 4자리 입력</h3>
          <p className="text-[11px] text-gray-500 mb-3 text-center">
            나만 열어볼 수 있는 비밀 메모장입니다.
            <br />
            <span className="text-[10px] text-blue-500">(초기 기본 비번: {correctPin || '1234'})</span>
          </p>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-3 my-2 bg-white px-6 py-2.5 rounded-full border-2 border-[#b8c6d4] shadow-inner">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  idx < pin.length
                    ? 'bg-[#2b84cb] scale-110 shadow-xs'
                    : 'bg-gray-200 border border-gray-300'
                }`}
              />
            ))}
          </div>

          {errorMsg && (
            <div className="text-[11px] text-red-500 font-bold my-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full mt-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="cyworld-btn text-base font-bold py-2 rounded"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="cyworld-btn-light text-xs font-bold py-2 rounded"
            >
              초기화
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="cyworld-btn text-base font-bold py-2 rounded"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="cyworld-btn-light text-xs font-bold py-2 rounded"
            >
              ⌫ 지움
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
