interface Props {
  onInsert: (symbol: string) => void;
}

const RETRO_SYMBOLS = [
  '★', '☆', '♥', '♡', '♨', '♧', '♣', '♪', '♬', '♩',
  '☞', '☜', '◈', '◇', '◆', '◐', '◑', '▷', '▶', '◁',
  '◀', '▦', '▣', '☎', '☏', '⊙', '˚', 'º', '˘', 'ㅅ',
  'ㄴr는', 'ㄱr끔', '눈물을', '흘린ㄷr...', '★~', '~★', '(^-^)', '(ㅠ_ㅠ)'
];

export default function CyworldSpecialSymbols({ onInsert }: Props) {
  return (
    <div className="bg-[#f0f4f8] p-2 border border-[#b8c6d4] rounded text-xs">
      <div className="text-[11px] text-[#2b84cb] font-bold mb-1 flex items-center justify-between">
        <span>★ 싸이월드 감성 특수문자 & 문구</span>
        <span className="text-[10px] text-gray-500 font-normal">클릭시 본문에 쏙!</span>
      </div>
      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
        {RETRO_SYMBOLS.map((sym, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(sym)}
            className="px-1.5 py-0.5 bg-white hover:bg-[#e0f2fe] border border-[#cfd9e3] hover:border-[#2b84cb] rounded text-[#333] text-xs font-pixel transition-colors"
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
