import React, { useEffect, useState } from 'react';
import { aviationStore, API_BASE_URL } from '../services/api';

interface HeaderProps {
  currentView: 'admin' | 'client';
  onToggleView: (view: 'admin' | 'client') => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onToggleView }) => {
  const [utcTime, setUtcTime] = useState<string>('--:--:-- UTC');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);

  useEffect(() => {
    const updateUtc = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };

    updateUtc();
    const interval = setInterval(updateUtc, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    aviationStore.checkBackendHealth().then((status) => {
      setIsConnected(status);
    });
  }, []);

  return (
    <header className="flex justify-between items-center w-full px-4 h-14 bg-white border-b border-[#c4c6ce]/70 z-50 shrink-0">
      {/* Brand & Console Identifiers */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="font-headline text-[18px] font-bold tracking-tight text-[#000f22]">
            AeroNexus
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0a2540] text-white tracking-wider">
            OPS CONSOLE [ADMIN V2.4]
          </span>
        </div>
        <div className="h-4 w-px bg-[#c4c6ce]"></div>
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#f3f4f3] border border-[#c4c6ce]/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-[11px] font-semibold text-[#43474d] tracking-wider">
            SECTOR 04 - DISPATCH
          </span>
        </div>
      </div>

      {/* Central Telemetry & UTC Master Clock */}
      <div className="hidden lg:flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-[#f3f4f3] px-3 py-1 rounded border border-[#c4c6ce]/60 font-mono text-[12px]">
          <span className="text-[#43474d] font-medium">UTC MASTER:</span>
          <span className="text-[#000f22] font-bold tracking-widest text-[13px]" id="utc-clock">
            {utcTime}
          </span>
        </div>

        <button
          onClick={() => {
            aviationStore.checkBackendHealth().then((s) => setIsConnected(s));
          }}
          title={`Backend API Endpoint: ${API_BASE_URL}`}
          className={`flex items-center space-x-2 px-2.5 py-1 rounded font-mono text-[10px] font-semibold transition-colors cursor-pointer ${
            isConnected
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <span className={`material-symbols-outlined text-[13px] ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`}>sensors</span>
          <span>API: {isConnected ? 'CONNECTED [v1]' : 'STANDBY [OFFLINE]'}</span>
        </button>
      </div>

      {/* Session & Client Portal Switch */}
      <div className="flex items-center space-x-3">
        {/* Admin Officer Identification */}
        <div className="flex items-center space-x-2 bg-[#f3f4f3] pl-2 pr-3 py-1 rounded border border-[#c4c6ce]/60">
          <div className="w-6 h-6 rounded bg-[#0a2540] text-white flex items-center justify-center font-mono text-[10px] font-bold">
            VV
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] text-[#000f22] font-semibold leading-tight font-body">
              Capt. V. Vance
            </span>
            <span className="font-mono text-[9px] text-[#43474d] leading-none">
              CHIEF DISPATCHER
            </span>
          </div>
        </div>

        {/* Quick Switch to Client Portal / Admin Console */}
        <button
          onClick={() => onToggleView(currentView === 'admin' ? 'client' : 'admin')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border border-[#c4c6ce] text-[#000f22] text-[12px] font-semibold transition-all active:scale-[0.98] ${
            currentView === 'client'
              ? 'bg-[#005cba] text-white border-[#005cba]'
              : 'bg-white hover:bg-[#f3f4f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px] text-[#005cba]">
            {currentView === 'admin' ? 'open_in_new' : 'terminal'}
          </span>
          <span className="hidden sm:inline">
            {currentView === 'admin' ? 'Client Portal' : 'Ops Console'}
          </span>
        </button>

        {/* Utility Tray Icons */}
        <div className="flex items-center space-x-1 pl-1 relative">
          <button
            onClick={() => setShowNotificationToast(!showNotificationToast)}
            className="p-1.5 rounded hover:bg-[#f3f4f3] text-[#43474d] hover:text-[#000f22] transition-colors relative"
            title="Notifications (2 Active)"
          >
            <span className="material-symbols-outlined text-[16px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
          </button>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('aeronexus:open-telemetry'));
            }}
            className="p-1.5 rounded hover:bg-[#f3f4f3] text-[#43474d] hover:text-[#000f22] transition-colors"
            title="Console Settings & Streams"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
          </button>

          {/* Notifications Dropdown */}
          {showNotificationToast && (
            <div className="absolute right-0 top-10 w-72 bg-white rounded shadow-xl border border-[#c4c6ce] p-3 text-xs z-50 animate-in fade-in">
              <div className="font-bold text-[#000f22] font-mono text-[11px] mb-2 flex items-center justify-between">
                <span>OPERATIONAL ALERTS (2)</span>
                <button
                  onClick={() => setShowNotificationToast(false)}
                  className="text-gray-400 hover:text-black"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 font-body">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                  <span className="font-bold text-amber-900 block font-mono text-[10px]">
                    AP-882 GATE HOLD
                  </span>
                  <span className="text-amber-800 text-[11px]">
                    SFO slot delayed +24 min due to oceanic flow sequencing.
                  </span>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                  <span className="font-bold text-rose-900 block font-mono text-[10px]">
                    AP-419 MAINTENANCE HOLD
                  </span>
                  <span className="text-rose-800 text-[11px]">
                    ORD gate maintenance inspecting sensor loop.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
