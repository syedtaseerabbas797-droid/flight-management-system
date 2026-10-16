import React, { useState, useEffect } from 'react';
import { TelemetryEvent } from '../types/aviation';
import { INITIAL_TELEMETRY } from '../data/mockData';

export const TelemetryStream: React.FC = () => {
  const [events, setEvents] = useState<TelemetryEvent[]>(INITIAL_TELEMETRY);
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Simulate periodic live telemetry packet arrival
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
      
      const newSampleMessages: Array<Omit<TelemetryEvent, 'id' | 'timestampUtc'>> = [
        { sector: 'AP-104', channel: 'ADS-B', severity: 'INFO', message: 'Downlink FL390. SATCOM signal nominal. Sector ETA 21:42 UTC steady.' },
        { sector: 'AP-882', channel: 'DISPATCH', severity: 'INFO', message: 'Fuel upload complete: 64,200kg Jet-A1. Pushback tug attached SFO G94.' },
        { sector: 'AP-712', channel: 'GDS-AMADEUS', severity: 'SUCCESS', message: 'Ticketing cut-off reached. 242 confirmed e-tickets dispatched.' },
        { sector: 'AP-305', channel: 'ACARS', severity: 'INFO', message: 'BOS Clearance Delivery: Cleared to DUB via NAT-CHARLIE flight plan.' },
      ];

      const sample = newSampleMessages[Math.floor(Math.random() * newSampleMessages.length)];
      const newEvent: TelemetryEvent = {
        id: `tel-${Date.now()}`,
        timestampUtc: timeStr,
        ...sample,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 40)]);
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const filtered = events.filter((e) => {
    if (filterChannel !== 'ALL' && e.channel !== filterChannel) return false;
    return true;
  });

  return (
    <div className="flex-1 p-3 flex flex-col h-full overflow-hidden bg-[#f9f9f8]">
      {/* Stream Controls */}
      <div className="h-9 px-3 bg-white border border-[#c4c6ce] rounded-t flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[#005cba] text-[16px]">monitoring</span>
          <span className="font-bold text-[#000f22]">LIVE AVIATION TELEMETRY &amp; GDS AUDIT STREAM</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Channel selector */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="h-6 px-2 text-[10px] font-mono border border-[#c4c6ce] rounded bg-white"
          >
            <option value="ALL">ALL CHANNELS</option>
            <option value="ADS-B">ADS-B TRANSPONDER</option>
            <option value="ACARS">ACARS DATA LINK</option>
            <option value="GDS-AMADEUS">AMADEUS GDS</option>
            <option value="DISPATCH">DISPATCH COMMS</option>
          </select>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isPaused ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {isPaused ? 'RESUME STREAM' : 'PAUSE'}
          </button>
        </div>
      </div>

      {/* Stream Event Log */}
      <div className="flex-1 bg-white border-x border-b border-[#c4c6ce] rounded-b overflow-y-auto custom-scroll p-3 space-y-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded bg-[#f9f9f8] border border-[#c4c6ce] flex items-start space-x-3 text-xs font-mono hover:bg-blue-50/30 transition-colors"
          >
            <span className="text-[#74777e] shrink-0 font-bold">{item.timestampUtc}</span>

            <span className="px-1.5 py-0.5 rounded bg-[#eeeeed] text-[#000f22] font-bold text-[10px] shrink-0">
              {item.sector}
            </span>

            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                item.channel === 'ADS-B'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : item.channel === 'ACARS'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : item.channel === 'GDS-AMADEUS'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {item.channel}
            </span>

            <span
              className={`flex-1 font-body text-[12px] leading-tight ${
                item.severity === 'CRIT'
                  ? 'text-rose-700 font-semibold'
                  : item.severity === 'WARN'
                  ? 'text-amber-800'
                  : 'text-[#1a1c1c]'
              }`}
            >
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
