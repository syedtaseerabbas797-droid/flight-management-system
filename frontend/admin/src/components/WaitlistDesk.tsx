import React, { useState } from 'react';
import { Flight, WaitlistPassenger } from '../types/aviation';
import { aviationStore, apiClient } from '../services/api';

interface WaitlistDeskProps {
  selectedFlight: Flight;
  onRefreshData?: () => void;
}

export const WaitlistDesk: React.FC<WaitlistDeskProps> = ({ selectedFlight, onRefreshData }) => {
  const [passengers, setPassengers] = useState<WaitlistPassenger[]>(() =>
    aviationStore.getWaitlist(selectedFlight.flightNumber)
  );
  const [autoClearActive, setAutoClearActive] = useState<boolean>(true);
  const [clearingNotice, setClearingNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync passengers when flight changes (Fetch from live backend first)
  React.useEffect(() => {
    apiClient
      .get<any[]>('/waitlist', { params: { flight_number: selectedFlight.flightNumber } })
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const liveList: WaitlistPassenger[] = res.data.map((w: any) => ({
            id: w.id,
            pnr: w.pnr || '#' + w.id.slice(0, 6).toUpperCase(),
            name: w.passengerName || w.passenger_name,
            tier: w.tier || 'GENERAL Y',
            score: w.priorityScore || 85.0,
            flightNumber: selectedFlight.flightNumber,
            cabinRequested: w.seat_class?.toUpperCase() || 'BUSINESS',
            waitDuration: 'Active Standby',
            cleared: false,
          }));
          setPassengers(liveList);
        } else {
          setPassengers(aviationStore.getWaitlist(selectedFlight.flightNumber));
        }
      })
      .catch(() => {
        setPassengers(aviationStore.getWaitlist(selectedFlight.flightNumber));
      });
    setSearchQuery('');
  }, [selectedFlight.flightNumber]);

  // Filter passengers by Name, CNIC / Passport, PNR, or Tier
  const filteredPassengers = passengers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.pnr.toLowerCase().includes(q) ||
      (p.cnicOrPassport && p.cnicOrPassport.toLowerCase().includes(q)) ||
      p.tier.toLowerCase().includes(q) ||
      p.cabinRequested.toLowerCase().includes(q)
    );
  });

  const handleClearSingle = (passenger: WaitlistPassenger, seat: string) => {
    const res = aviationStore.clearWaitlistPassenger(passenger.id, seat);
    if (res.success) {
      setPassengers([...aviationStore.getWaitlist(selectedFlight.flightNumber)]);
      setClearingNotice(`Cleared ${passenger.name} into seat ${seat} for ${selectedFlight.flightNumber}`);
      setTimeout(() => setClearingNotice(null), 3500);
      onRefreshData?.();
    }
  };

  const handleAutoClear = () => {
    const cleared = aviationStore.autoClearTopPassengers(selectedFlight.flightNumber, 2);
    setPassengers([...aviationStore.getWaitlist(selectedFlight.flightNumber)]);
    if (cleared.length > 0) {
      setClearingNotice(
        `Auto-Cleared ${cleared.length} priority pax: ${cleared.map((c) => c.name).join(', ')}`
      );
    } else {
      setClearingNotice('No eligible standby passengers in queue.');
    }
    setTimeout(() => setClearingNotice(null), 4000);
    onRefreshData?.();
  };

  const handleRoll = (passenger: WaitlistPassenger) => {
    alert(`Rolled ${passenger.name} (${passenger.pnr}) to subsequent departure AP-${Number(selectedFlight.flightNumber.replace(/\D/g, '')) + 4}.`);
  };

  const standbyCount = passengers.filter((p) => !p.cleared).length;
  const clearedCount = passengers.filter((p) => p.cleared).length;

  return (
    <aside className="w-80 lg:w-96 bg-white border-l border-[#c4c6ce] flex flex-col shrink-0">
      {/* Panel Header */}
      <div className="h-10 px-3.5 bg-[#f3f4f3] border-b border-[#c4c6ce] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[#005cba] text-[17px]">group</span>
          <span className="font-headline text-[13px] font-bold text-[#000f22] uppercase tracking-tight">
            Waitlist Clearing Desk
          </span>
        </div>

        <button
          onClick={() => setAutoClearActive(!autoClearActive)}
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border transition-colors ${
            autoClearActive
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-gray-100 text-gray-600 border-gray-300'
          }`}
        >
          {autoClearActive ? 'AUTO-CLEAR ON' : 'MANUAL MODE'}
        </button>
      </div>

      {/* Sector Target Selection Bar */}
      <div className="p-3 bg-[#f9f9f8] border-b border-[#c4c6ce]">
        <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
          <span className="text-[#43474d] font-semibold">ACTIVE FOCUS SECTOR:</span>
          <span className="text-[#005cba] font-bold">
            {standbyCount} STANDBY / {clearedCount} CLEARED
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-white border border-[#c4c6ce]">
          <div className="flex items-center space-x-2">
            <span className="font-headline text-sm font-bold text-[#000f22]">
              {selectedFlight.flightNumber}
            </span>
            <span className="font-mono text-[11px] text-[#43474d]">
              {selectedFlight.origin} → {selectedFlight.destination}
            </span>
          </div>

          <div className="text-right">
            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
              2 C-SEATS AVAIL
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Standby Passenger Search Bar (Name, CNIC / Passport, PNR) */}
      <div className="px-3 py-2 bg-white border-b border-[#c4c6ce] shadow-2xs">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined text-[16px] text-[#74777e] absolute left-2.5 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CNIC, Passport, Name, PNR..."
            className="w-full pl-8 pr-7 py-1.5 text-xs font-mono border border-[#c4c6ce] rounded bg-[#f9f9f8] focus:bg-white focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] outline-none text-[#000f22] placeholder:text-[#74777e]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[#74777e] hover:text-[#000f22] text-xs font-bold p-0.5"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-[#005cba] px-0.5">
            <span>
              MATCHES: <strong>{filteredPassengers.length}</strong> of {passengers.length} PAX
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="underline text-[#74777e] hover:text-[#000f22]"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Real-time Notice banner if cleared */}
      {clearingNotice && (
        <div className="mx-3 mt-2 p-2 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded font-mono text-[10px] font-semibold flex items-center space-x-1.5 animate-in fade-in">
          <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
          <span>{clearingNotice}</span>
        </div>
      )}

      {/* Passenger Priority Standby Queue */}
      <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
        {filteredPassengers.length === 0 ? (
          <div className="p-6 text-center text-[#43474d]">
            <span className="material-symbols-outlined text-2xl text-gray-400 mb-1">person_search</span>
            <p className="font-mono text-[11px] font-medium">
              {searchQuery
                ? `No Standby Passengers match "${searchQuery}"`
                : `No Standby Passengers for ${selectedFlight.flightNumber}`}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {searchQuery ? 'Check CNIC, Passport number, or PNR spelling.' : 'Standby queue is currently cleared.'}
            </p>
          </div>
        ) : (
          filteredPassengers.map((passenger) => {
            const isDiamond = passenger.tier === 'DIAMOND VIP';
            const isPlatinum = passenger.tier === 'PLATINUM';

            return (
              <div
                key={passenger.id}
                className={`p-2.5 rounded bg-[#f9f9f8] border transition-all ${
                  passenger.cleared
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-[#c4c6ce] hover:border-[#005cba]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {isDiamond && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0a2540] text-white font-mono text-[9px] font-bold tracking-wider">
                        DIAMOND VIP
                      </span>
                    )}
                    {isPlatinum && (
                      <span className="px-1.5 py-0.5 rounded bg-[#e8e8e7] text-[#000f22] font-mono text-[9px] font-bold border border-[#c4c6ce]">
                        PLATINUM
                      </span>
                    )}
                    {!isDiamond && !isPlatinum && (
                      <span className="px-1.5 py-0.5 rounded bg-[#eeeeed] text-[#43474d] font-mono text-[9px]">
                        {passenger.tier}
                      </span>
                    )}
                    <span className="font-body text-[13px] font-bold text-[#000f22]">
                      {passenger.name}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isDiamond || isPlatinum ? 'text-emerald-700' : 'text-[#43474d]'
                    }`}
                  >
                    SCORE: {passenger.score.toFixed(1)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between font-mono text-[#43474d] text-[11px]">
                  <span>
                    PNR: <strong className="text-[#000f22]">{passenger.pnr}</strong>
                  </span>
                  <span>
                    REQ: <strong className="text-[#000f22]">{passenger.cabinRequested}</strong>
                  </span>
                  <span>WAIT: {passenger.waitDuration}</span>
                </div>

                {/* CNIC / Passport Verification Pill */}
                {passenger.cnicOrPassport && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#eeeeed] text-[#000f22] font-mono text-[10px] font-semibold border border-[#c4c6ce]/70 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-[#74777e]">badge</span>
                      <span className="text-[#74777e] font-bold">DOC / CNIC:</span>
                      <span className="text-[#005cba] font-bold">{passenger.cnicOrPassport}</span>
                    </span>
                  </div>
                )}

                {passenger.cleared ? (
                  <div className="mt-2.5 pt-2 border-t border-emerald-200 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-emerald-800 flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                      <span>CLEARED TO SEAT {passenger.assignedSeat || '2A'}</span>
                    </span>
                    <span className="font-mono text-[9px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      BOARDING PASS READY
                    </span>
                  </div>
                ) : (
                  <div className="mt-2.5 pt-2 border-t border-[#c4c6ce] flex items-center justify-between gap-1.5">
                    {isDiamond ? (
                      <button
                        onClick={() => handleClearSingle(passenger, '2A')}
                        className="flex-1 py-1 px-2 rounded bg-[#005cba] hover:bg-[#00458e] text-white font-mono text-[10px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px]">airline_seat_recline_extra</span>
                        <span>Clear to Seat 2A</span>
                      </button>
                    ) : isPlatinum ? (
                      <button
                        onClick={() => handleClearSingle(passenger, '8K')}
                        className="flex-1 py-1 px-2 rounded bg-[#005cba] hover:bg-[#00458e] text-white font-mono text-[10px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px]">airline_seat_recline_extra</span>
                        <span>Clear to Seat 8K</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClearSingle(passenger, '24C')}
                        className="flex-1 py-1 px-2 rounded bg-[#f3f4f3] border border-[#c4c6ce] hover:bg-[#eeeeed] text-[#000f22] font-mono text-[10px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                        <span>Hold Standby</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRoll(passenger)}
                      className="py-1 px-2 rounded bg-[#eeeeed] border border-[#c4c6ce] hover:bg-[#e8e8e7] text-[#43474d] font-mono text-[10px]"
                      title="Roll to Next Available Flight"
                    >
                      Roll
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Waitlist Clearing Automation Footer */}
      <div className="p-3 bg-[#f3f4f3] border-t border-[#c4c6ce] shrink-0">
        <div className="flex items-center justify-between font-mono text-[11px] text-[#43474d] mb-2">
          <span>PRIORITY PASS-THROUGH:</span>
          <span className="text-emerald-700 font-bold">ALGO-OPTIMIZED</span>
        </div>

        <button
          onClick={handleAutoClear}
          className="w-full py-1.5 rounded bg-[#0a2540] hover:bg-[#162538] text-white text-[12px] font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
        >
          <span className="material-symbols-outlined text-[15px]">flash_on</span>
          <span>Execute Auto-Clear (Top 2 Pax)</span>
        </button>
      </div>
    </aside>
  );
};
