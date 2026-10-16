import React, { useState } from 'react';
import { Flight } from '../types/aviation';

interface OperationsGridProps {
  flights: Flight[];
  selectedFlightId: string;
  onSelectFlight: (flight: Flight) => void;
  onOpenScheduleModal: () => void;
  onOpenManifestModal: (flight: Flight) => void;
  onOpenHoldSlipModal?: (flight: Flight) => void;
  onOpenDispatchModal?: (flight: Flight) => void;
}

export const OperationsGrid: React.FC<OperationsGridProps> = ({
  flights,
  selectedFlightId,
  onSelectFlight,
  onOpenScheduleModal,
  onOpenManifestModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Airborne' | 'Gate' | 'Held' | 'Waitlist'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHub, setSelectedHub] = useState('All Route Hubs');
  const [selectedFleet, setSelectedFleet] = useState('All Fleets');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCompactDensity, setIsCompactDensity] = useState(false);

  // Filter logic
  const filteredFlights = flights.filter((flight) => {
    // Status filter
    if (statusFilter === 'Airborne' && !flight.status.includes('AIRBORNE')) return false;
    if (statusFilter === 'Gate' && !flight.status.includes('FINAL BOARDING') && !flight.status.includes('GATE')) return false;
    if (statusFilter === 'Held' && !flight.status.includes('HOLD') && !flight.status.includes('DELAY')) return false;
    if (statusFilter === 'Waitlist' && flight.waitlistCount === 0) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        flight.flightNumber.toLowerCase().includes(q) ||
        flight.tailNumber.toLowerCase().includes(q) ||
        flight.origin.toLowerCase().includes(q) ||
        flight.destination.toLowerCase().includes(q) ||
        flight.aircraft.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Hub filter
    if (selectedHub !== 'All Route Hubs') {
      const hubCode = selectedHub.split(' ')[0];
      if (flight.origin !== hubCode && flight.destination !== hubCode) return false;
    }

    // Fleet filter
    if (selectedFleet !== 'All Fleets') {
      if (selectedFleet.includes('A350') && !flight.aircraft.includes('A350')) return false;
      if (selectedFleet.includes('787') && !flight.aircraft.includes('787')) return false;
      if (selectedFleet.includes('A321') && !flight.aircraft.includes('A321')) return false;
      if (selectedFleet.includes('777') && !flight.aircraft.includes('777')) return false;
    }

    return true;
  });

  // Export CSV Manifest function
  const handleExportCSV = () => {
    const headers = ['Flight Number,Aircraft,Tail,Origin,Destination,STD UTC,ETD UTC,STA UTC,ETA UTC,Status,Booked,Capacity,Waitlist'];
    const rows = filteredFlights.map((f) =>
      `"${f.flightNumber}","${f.aircraft}","${f.tailNumber}","${f.origin}","${f.destination}","${f.stdUtc}","${f.etdUtc}","${f.staUtc}","${f.etaUtc}","${f.status}",${f.cabinLoad.booked},${f.cabinLoad.capacity},${f.waitlistCount}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AeroNexus_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 px-3 pb-3 overflow-hidden flex flex-col">
      {/* 2. Primary Action Bar & Filters Toolbar */}
      <section className="pb-2 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 shrink-0">
        {/* Filter Tabs & Quick Inputs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Status Tabs */}
          <div className="inline-flex p-0.5 bg-white rounded border border-[#c4c6ce]">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-2.5 py-1 font-mono text-[11px] rounded font-semibold transition-colors ${
                statusFilter === 'All'
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#eeeeed]'
              }`}
            >
              All (48)
            </button>
            <button
              onClick={() => setStatusFilter('Airborne')}
              className={`px-2.5 py-1 font-mono text-[11px] rounded font-semibold transition-colors ${
                statusFilter === 'Airborne'
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#eeeeed]'
              }`}
            >
              Airborne (42)
            </button>
            <button
              onClick={() => setStatusFilter('Gate')}
              className={`px-2.5 py-1 font-mono text-[11px] rounded font-semibold transition-colors ${
                statusFilter === 'Gate'
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-[#43474d] hover:text-[#000f22] hover:bg-[#eeeeed]'
              }`}
            >
              Gate (4)
            </button>
            <button
              onClick={() => setStatusFilter('Held')}
              className={`px-2.5 py-1 font-mono text-[11px] rounded font-semibold transition-colors ${
                statusFilter === 'Held'
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              Held/Delayed (2)
            </button>
            <button
              onClick={() => setStatusFilter('Waitlist')}
              className={`px-2.5 py-1 font-mono text-[11px] rounded font-semibold transition-colors ${
                statusFilter === 'Waitlist'
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-[#005cba] hover:bg-blue-50'
              }`}
            >
              Waitlist (4)
            </button>
          </div>

          {/* Flight/Tail Search */}
          <div className="relative w-48 md:w-56">
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-[#43474d] text-[15px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Flight #, Tail, ICAO, Route..."
              className="w-full h-7 pl-7 pr-2 py-0 text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] placeholder:text-[#74777e]"
            />
          </div>

          {/* Select Pair */}
          <select
            value={selectedHub}
            onChange={(e) => setSelectedHub(e.target.value)}
            className="h-7 font-mono text-[11px] font-semibold bg-white border border-[#c4c6ce] rounded px-2 py-0 text-[#43474d] focus:border-[#005cba]"
          >
            <option>All Route Hubs</option>
            <option>JFK • New York</option>
            <option>LHR • London</option>
            <option>SFO • San Francisco</option>
            <option>HND • Tokyo</option>
            <option>BOS • Boston</option>
            <option>LAX • Los Angeles</option>
            <option>ORD • Chicago</option>
            <option>MIA • Miami</option>
          </select>

          {/* Aircraft Selector */}
          <select
            value={selectedFleet}
            onChange={(e) => setSelectedFleet(e.target.value)}
            className="h-7 font-mono text-[11px] font-semibold bg-white border border-[#c4c6ce] rounded px-2 py-0 text-[#43474d] focus:border-[#005cba]"
          >
            <option>All Fleets</option>
            <option>Airbus A350-900</option>
            <option>Boeing 787-9 Dreamliner</option>
            <option>Airbus A321neo LR</option>
            <option>Boeing 777-300ER</option>
          </select>
        </div>

        {/* Master Right Action Cluster */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={onOpenScheduleModal}
            className="h-7 px-3 rounded bg-[#0a2540] hover:bg-[#162538] text-white text-[12px] font-semibold flex items-center space-x-1.5 transition-colors shadow-xs active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Schedule New Flight</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="h-7 px-2.5 rounded bg-white border border-[#c4c6ce] hover:bg-[#f3f4f3] text-[#000f22] font-mono text-[10px] font-semibold flex items-center space-x-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[13px] text-[#43474d]">
              file_download
            </span>
            <span>CSV Manifest</span>
          </button>

          <button
            onClick={() => setIsCompactDensity(!isCompactDensity)}
            className={`h-7 px-2.5 rounded border font-mono text-[10px] font-semibold flex items-center space-x-1 transition-colors ${
              isCompactDensity
                ? 'bg-[#005cba] text-white border-[#005cba] shadow-2xs'
                : 'bg-white border-[#c4c6ce] text-[#000f22] hover:bg-[#f3f4f3]'
            }`}
            title="Toggle compact row density to show 10+ flights at once"
          >
            <span className="material-symbols-outlined text-[13px]">
              {isCompactDensity ? 'density_small' : 'density_medium'}
            </span>
            <span>{isCompactDensity ? 'COMPACT (SABRE)' : 'DENSITY'}</span>
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-7 px-2 flex items-center space-x-1.5 bg-[#f3f4f3] border border-[#c4c6ce] rounded font-mono text-[10px] text-[#43474d]"
            title="Toggle Auto Refresh"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'
              }`}
            ></span>
            <span>AUTO: {autoRefresh ? '30s' : 'OFF'}</span>
          </button>
        </div>
      </section>

      {/* 3. Sabre/Amadeus High-Density Flight Operations Grid */}
      <div className="flex-1 bg-white border border-[#c4c6ce] rounded flex flex-col overflow-hidden shadow-xs">
        {/* Monospace Grid Header */}
        <div className="bg-[#f3f4f3] border-b border-[#c4c6ce] flex items-center font-mono text-[11px] font-semibold text-[#43474d] uppercase tracking-wider h-8 px-3 select-none shrink-0">
          <div className="w-20 shrink-0 font-bold">FLT #</div>
          <div className="w-36 shrink-0">AIRCRAFT / TAIL</div>
          <div className="w-32 shrink-0">ROUTE PAIR</div>
          <div className="w-28 shrink-0">STD / ETD (UTC)</div>
          <div className="w-28 shrink-0">STA / ETA (UTC)</div>
          <div className="w-44 shrink-0">SECTOR STATUS</div>
          <div className="flex-1 min-w-[140px]">CABIN LOAD / CAP</div>
          <div className="w-28 shrink-0 text-center">WAITLIST</div>
          <div className="w-48 shrink-0 text-right pr-2">ACTIONS</div>
        </div>

        {/* Grid Table Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-[#c4c6ce]/60">
          {filteredFlights.length === 0 ? (
            <div className="p-8 text-center text-[#43474d]">
              <span className="material-symbols-outlined text-3xl mb-2 text-[#74777e]">flight_takeoff</span>
              <p className="font-headline font-semibold text-[#000f22]">No Active Sectors Found</p>
              <p className="text-xs text-gray-500 mt-1">Adjust search parameters or schedule a new sector.</p>
            </div>
          ) : (
            filteredFlights.map((flight) => {
              const isSelected = flight.id === selectedFlightId || flight.flightNumber === 'AP-104' && selectedFlightId === 'f-104';
              const isWaitlistActive = flight.waitlistCount > 0;

              return (
                <div
                  key={flight.id}
                  onClick={() => onSelectFlight(flight)}
                  className={`flex items-center ${
                    isCompactDensity ? 'h-8 px-2.5 text-[12px]' : 'h-10 px-3 text-[13px]'
                  } transition-colors text-[#000f22] font-medium cursor-pointer border-l-4 ${
                    isSelected
                      ? 'bg-blue-50/60 hover:bg-blue-50 border-l-[#005cba]'
                      : 'hover:bg-[#f3f4f3]/70 border-l-transparent'
                  }`}
                >
                  {/* Flight # */}
                  <div className="w-20 shrink-0 flex items-center space-x-1 font-mono text-[12px] font-bold text-[#005cba]">
                    <span>{flight.flightNumber}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#005cba]"></span>}
                  </div>

                  {/* Aircraft / Tail */}
                  <div className="w-36 shrink-0 font-mono text-[12px] text-[#43474d] flex flex-col leading-none">
                    <span className="text-[#000f22] font-semibold">{flight.aircraft}</span>
                    <span className="text-[10px] text-[#74777e]">
                      {flight.tailNumber} • {flight.engineSpecs}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="w-32 shrink-0 flex items-center space-x-1.5 font-mono font-semibold">
                    <span className="bg-[#eeeeed] px-1 py-0.5 rounded text-[11px] text-[#000f22]">
                      {flight.origin}
                    </span>
                    <span className="material-symbols-outlined text-[11px] text-[#74777e]">
                      arrow_forward
                    </span>
                    <span className="bg-[#eeeeed] px-1 py-0.5 rounded text-[11px] text-[#000f22]">
                      {flight.destination}
                    </span>
                  </div>

                  {/* STD / ETD */}
                  <div className="w-28 shrink-0 font-mono text-[11px] leading-tight">
                    <span className="text-[#000f22] font-medium">{flight.stdUtc}</span>
                    <span
                      className={`ml-1 font-medium ${
                        flight.etdUtc === 'HOLD'
                          ? 'text-rose-700 font-bold'
                          : flight.etdUtc !== flight.stdUtc
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {flight.etdUtc}
                    </span>
                  </div>

                  {/* STA / ETA */}
                  <div className="w-28 shrink-0 font-mono text-[11px] leading-tight">
                    <span className="text-[#000f22] font-medium">{flight.staUtc}</span>
                    <span
                      className={`ml-1 font-medium ${
                        flight.etaUtc === 'TBD'
                          ? 'text-rose-700 font-bold'
                          : flight.etaUtc !== flight.staUtc
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {flight.etaUtc}
                    </span>
                  </div>

                  {/* Sector Status */}
                  <div className="w-44 shrink-0">
                    {flight.status.includes('AIRBORNE') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                        AIRBORNE / EN ROUTE
                      </span>
                    )}
                    {flight.status.includes('GATE DELAY') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping"></span>
                        GATE DELAY +24M
                      </span>
                    )}
                    {flight.status.includes('FINAL BOARDING') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5"></span>
                        FINAL BOARDING (G14)
                      </span>
                    )}
                    {flight.status.includes('MAINTENANCE HOLD') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-50 text-rose-900 border border-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
                        MAINTENANCE HOLD
                      </span>
                    )}
                    {flight.status.includes('SCHEDULED') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
                        SCHEDULED / ON-TIME
                      </span>
                    )}
                  </div>

                  {/* Cabin Load / Cap */}
                  <div className="flex-1 min-w-[160px] pr-3 flex flex-col justify-center">
                    <div className="flex justify-between items-center text-[11px] font-mono leading-none mb-1">
                      <span className="font-semibold text-[#000f22]">
                        {flight.cabinLoad.booked}/{flight.cabinLoad.capacity}{' '}
                        <span
                          className={
                            flight.cabinLoad.percentage === 100
                              ? 'text-emerald-700 font-bold'
                              : 'text-[#74777e] font-normal'
                          }
                        >
                          ({flight.cabinLoad.percentage}%)
                        </span>
                      </span>
                      <span className="text-[10px] text-[#43474d]">
                        F:{flight.cabinLoad.breakdown.first} C:{flight.cabinLoad.breakdown.club} Y:
                        {flight.cabinLoad.breakdown.main}
                      </span>
                    </div>
                    <div className="w-full bg-[#eeeeed] h-1.5 rounded overflow-hidden flex">
                      {flight.status.includes('MAINTENANCE') ? (
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${flight.cabinLoad.percentage}%` }}
                        ></div>
                      ) : flight.cabinLoad.percentage === 100 ? (
                        <div className="bg-amber-600 h-full w-full"></div>
                      ) : (
                        <>
                          <div className="bg-[#0a2540] h-full" style={{ width: '15%' }}></div>
                          <div className="bg-[#005cba] h-full" style={{ width: '25%' }}></div>
                          <div
                            className="bg-[#5095fe] h-full"
                            style={{
                              width: `${Math.max(0, flight.cabinLoad.percentage - 40)}%`,
                            }}
                          ></div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Waitlist Counter & Quick Desk Focus */}
                  <div className="w-28 shrink-0 text-center">
                    {isWaitlistActive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlight(flight);
                        }}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all border ${
                          isSelected
                            ? 'bg-amber-200 border-amber-400 text-amber-900 shadow-2xs scale-[1.02] ring-1 ring-amber-400'
                            : 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                        }`}
                        title="Click to focus Waitlist Desk on this flight"
                      >
                        {flight.waitlistCount} QUEUED{' '}
                        {flight.vipWaitlistCount > 0 ? `(VIP ${flight.vipWaitlistCount})` : ''}
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#eeeeed] text-[#74777e] border border-[#c4c6ce]">
                        0 NONE
                      </span>
                    )}
                  </div>

                  {/* Actions: Guaranteed Single-Line (No Overlap) */}
                  <div className="w-48 shrink-0 flex items-center justify-end gap-1.5 pr-2 font-mono text-[10px] whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenManifestModal(flight);
                      }}
                      className="px-2 py-0.5 border border-[#c4c6ce] bg-white hover:bg-[#eeeeed] hover:border-[#005cba] rounded text-[#000f22] font-semibold transition-colors shadow-2xs cursor-pointer"
                      title="Inspect PNR Passenger Manifest"
                    >
                      Manifest
                    </button>

                    {flight.status.includes('GATE DELAY') ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Hold Slip generated for ${flight.flightNumber}: Delay +24m acknowledged with SFO dispatch.`);
                        }}
                        className="px-2 py-0.5 border border-amber-400 bg-amber-50 hover:bg-amber-100 rounded text-amber-900 font-bold transition-colors shadow-2xs cursor-pointer"
                        title="Generate Delay Hold Slip"
                      >
                        Hold Slip
                      </button>
                    ) : flight.status.includes('FINAL BOARDING') ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Gate closeout active for ${flight.flightNumber}. 172 scanned.`);
                        }}
                        className="px-2 py-0.5 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-900 font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Gate Closeout Summary"
                      >
                        Closeout
                      </button>
                    ) : flight.status.includes('MAINTENANCE') ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`ORD Tech Log for ${flight.flightNumber}: Sensor loop B replacement underway. Estimated clear 19:40 UTC.`);
                        }}
                        className="px-2 py-0.5 border border-rose-300 bg-rose-50 hover:bg-rose-100 rounded text-rose-900 font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Aircraft Maintenance Tech Log"
                      >
                        Tech Log
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Flight ${flight.flightNumber} dispatch package active.`);
                        }}
                        className="px-2 py-0.5 border border-[#c4c6ce] bg-white hover:bg-[#eeeeed] hover:border-[#005cba] rounded text-[#005cba] font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Operational Flight Dispatch Package"
                      >
                        Dispatch
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table Bottom Status Footer */}
        <div className="bg-[#f3f4f3] border-t border-[#c4c6ce] px-3 py-1 flex items-center justify-between font-mono text-[#43474d] text-[11px] shrink-0">
          <div className="flex items-center space-x-3">
            <span>
              ACTIVE SECTORS:{' '}
              <strong className="text-[#000f22]">
                {filteredFlights.length} OF 48 DISPLAYED
              </strong>
            </span>
            <span>•</span>
            <span>FILTER: {selectedHub.toUpperCase()}</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">
              AMADEUS GDS TICKETING: RUNNING NORMAL
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span>PAGE {currentPage} OF 8</span>
            <div className="inline-flex border border-[#c4c6ce] rounded bg-white">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-1.5 py-0.5 hover:bg-[#f3f4f3] text-[#43474d] disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[13px]">chevron_left</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(8, p + 1))}
                disabled={currentPage === 8}
                className="px-1.5 py-0.5 hover:bg-[#f3f4f3] text-[#000f22]"
              >
                <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
