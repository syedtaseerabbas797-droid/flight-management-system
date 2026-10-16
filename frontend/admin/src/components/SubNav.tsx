import React from 'react';

export type AdminTab = 'grid' | 'radar' | 'waitlist' | 'telemetry' | 'audit';

interface SubNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const SubNav: React.FC<SubNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-full bg-white border-b border-[#c4c6ce]/70 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onTabChange('grid')}
          className={`px-3 py-1 rounded text-[12px] font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'grid'
              ? 'bg-[#eeeeed] text-[#005cba] border-b-2 border-[#005cba]'
              : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#f3f4f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">table_chart</span>
          <span>Flight Operations Grid</span>
        </button>

        <button
          onClick={() => onTabChange('radar')}
          className={`px-3 py-1 rounded text-[12px] font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'radar'
              ? 'bg-[#eeeeed] text-[#005cba] border-b-2 border-[#005cba]'
              : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#f3f4f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">radar</span>
          <span>Live Radar Viewport</span>
        </button>

        <button
          onClick={() => onTabChange('waitlist')}
          className={`px-3 py-1 rounded text-[12px] font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'waitlist'
              ? 'bg-[#eeeeed] text-[#005cba] border-b-2 border-[#005cba]'
              : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#f3f4f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">group</span>
          <span>Waitlist Clearing House</span>
        </button>

        <button
          onClick={() => onTabChange('telemetry')}
          className={`px-3 py-1 rounded text-[12px] font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'telemetry'
              ? 'bg-[#eeeeed] text-[#005cba] border-b-2 border-[#005cba]'
              : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#f3f4f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">monitoring</span>
          <span>Telemetry Stream</span>
        </button>

        <button
          onClick={() => onTabChange('audit')}
          className={`px-3 py-1 rounded text-[12px] font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'audit'
              ? 'bg-[#eeeeed] text-[#005cba] border-b-2 border-[#005cba]'
              : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#f3f4f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">history</span>
          <span>Admin Audit Trail</span>
        </button>
      </div>

      <div className="flex items-center space-x-3 font-mono text-[11px] text-[#43474d]">
        <span className="flex items-center space-x-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#005cba]"></span>
          <span>DATA REFRESH: SYNCED</span>
        </span>
        <span className="text-[#c4c6ce]">|</span>
        <span>GDS BRIDGE: AMADEUS DIRECT</span>
      </div>
    </div>
  );
};
