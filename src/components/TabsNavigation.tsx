import { ActiveTab } from '../types';
import { retroAudio } from '../utils/retroAudio';
import { BookOpen, Lock, MessageSquare, Calendar, Settings } from 'lucide-react';

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  secretCount: number;
  layout?: 'vertical' | 'horizontal';
}

export default function TabsNavigation({
  activeTab,
  onTabChange,
  secretCount,
  layout = 'vertical',
}: Props) {
  const tabs: { id: ActiveTab; label: string; icon: any; count?: number }[] = [
    { id: 'diary', label: '다이어리', icon: BookOpen },
    { id: 'secret', label: '비밀금고', icon: Lock, count: secretCount },
    { id: 'doodle', label: '아무낙서', icon: MessageSquare },
    { id: 'calendar', label: '달력보기', icon: Calendar },
    { id: 'settings', label: '홈피설정', icon: Settings },
  ];

  const handleSelect = (tabId: ActiveTab) => {
    retroAudio.playClick();
    onTabChange(tabId);
  };

  if (layout === 'horizontal') {
    return (
      <nav className="flex items-center gap-1 overflow-x-auto pb-0 px-1 border-b border-[#2b84cb] bg-[#e2e8f0] scrollbar-none shrink-0 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`cyworld-tab-mobile px-2.5 py-1.5 text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all ${
                isActive ? 'active' : 'hover:bg-[#3a94db]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[9px] px-1 py-0.1 rounded-full font-bold ${
                    isActive ? 'bg-[#ff5252] text-white' : 'bg-white text-[#2b84cb]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop Vertical Right-edge tabs
  return (
    <nav className="hidden md:flex flex-col gap-1 py-4 -mr-1 z-10 shrink-0 select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={`cyworld-tab px-3 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              isActive ? 'active translate-x-1.5' : 'hover:bg-[#3a94db]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-[#ff5252] text-white' : 'bg-white text-[#2b84cb]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
