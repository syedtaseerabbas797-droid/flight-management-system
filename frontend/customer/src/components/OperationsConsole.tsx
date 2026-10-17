import React, { useState } from 'react';
import { Flight } from '../services/api';
import { PlusCircle, RefreshCw, Users, FileText, Radio, X } from 'lucide-react';

interface OperationsConsoleProps {
  flights: Flight[];
  onUpdateStatus: (flightNo: string, newStatus: Flight['status']) => void;
  onAddFlight: (flight: Flight) => void;
  onOpenWaitlist: (flight: Flight) => void;
  onShowToast: (msg: string) => void;
}

export const OperationsConsole: React.FC<OperationsConsoleProps> = ({
  flights,
  onUpdateStatus,
  onAddFlight,
  onOpenWaitlist,
  onShowToast,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ON TIME' | 'BOARDING' | 'DELAYED' | 'DEPARTED'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New flight state
  const [newFlightNo, setNewFlightNo] = useState('');
  const [newAircraft, setNewAircraft] = useState('Airbus A350-900');
  const [newSector, setNewSector] = useState('JFK → CDG');
  const [newDepTime, setNewDepTime] = useState('18:45 UTC');
  const [newGate, setNewGate] = useState('B22 / T4');
  const [newPrice, setNewPrice] = useState('1750');

  const filteredFlights = flights.filter((f) => {
    if (filter === 'ALL') return true;
    return f.status === filter;
  });

  const totalWaitlist = flights.reduce((sum, f) => sum + (f.waitlistCount || 0), 0);

  const handleCreateFlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlightNo.trim()) return;

    const [originPart, destPart] = newSector.includes('→')
      ? newSector.split('→').map((s) => s.trim())
      : ['JFK', 'CDG'];

    const created: Flight = {
      id: `f-${Date.now()}`,
      flightNo: newFlightNo.toUpperCase().trim(),
      route: `${originPart} ⇄ ${destPart}`,
      origin: originPart,
      originCode: originPart,
      originTerminal: `${originPart} Terminal 1`,
      destination: destPart,
      destinationCode: destPart,
      destinationTerminal: `${destPart} Terminal 2`,
      aircraft: newAircraft,
      techBadge: 'NextGen Telemetry',
      depTime: newDepTime.replace(' UTC', ''),
      arrTime: '06:30',
      arrDayOffset: '+1',
      duration: '7h 45m (Non-stop)',
      onTimeRecord: '98.5% On-Time Record',
      flightType: 'NON-STOP',
      routeNauticalMiles: 'GREAT CIRCLE DISPATCH',
      tagline: 'SECTOR INJECTION',
      seatsLeft: 24,
      seatsLabel: '24 seats available',
      seatsUrgency: false,
      basePrice: Number(newPrice) || 1750,
      currency: 'USD',
      cabin: 'Business Suite',
      gate: newGate,
      status: 'ON TIME',
      waitlistCount: 0,
    };

    onAddFlight(created);
    setIsAddModalOpen(false);
    setNewFlightNo('');
    onShowToast(`Flight ${created.flightNo} added to Active Sector Board!`);
  };

  return (
    <main className="flex-1 flex flex-col bg-[#f3f4f3] min-h-[calc(100vh-3.5rem)] animate-in fade-in duration-150">
      {/* Console Sub-Header & Telemetry KPI Strip */}
      <div className="bg-white border-b border-[#c4c6ce] px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#0a2540] text-white text-[10px] font-label-caps uppercase font-bold">
                OPS CONTROL CENTER
              </span>
              <span className="text-[11px] sm:text-xs font-label-caps text-[#43474d]">
                SECTOR 04 - NORTH ATLANTIC DISPATCH
              </span>
            </div>
            <h2 className="font-headline text-lg sm:text-2xl font-bold text-[#000f22] tracking-tight mt-1">
              High-Density Flight Dispatch &amp; Manifest Board
            </h2>
          </div>

          {/* Telemetry KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-[#f3f4f3] border border-[#c4c6ce] rounded p-2.5 min-w-[130px]">
              <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                Active Fleet
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-display-hero text-xl font-bold text-[#000f22]">
                  {flights.length + 37}
                </span>
                <span className="text-[10px] font-code-telemetry text-emerald-700 font-semibold">
                  100% AIRWORTHY
                </span>
              </div>
            </div>

            <div className="bg-[#f3f4f3] border border-[#c4c6ce] rounded p-2.5 min-w-[130px]">
              <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                On-Time OTP
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-display-hero text-xl font-bold text-[#000f22]">
                  94.8%
                </span>
                <span className="text-[10px] font-code-telemetry text-emerald-700 font-semibold">
                  +1.2% STD
                </span>
              </div>
            </div>

            <div className="bg-[#f3f4f3] border border-[#c4c6ce] rounded p-2.5 min-w-[130px]">
              <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                Load Factor
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-display-hero text-xl font-bold text-[#000f22]">
                  87.2%
                </span>
                <span className="text-[10px] font-code-telemetry text-[#005cba] font-semibold">
                  OPTIMAL
                </span>
              </div>
            </div>

            <div className="bg-[#f3f4f3] border border-[#c4c6ce] rounded p-2.5 min-w-[130px]">
              <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                Pending Waitlist
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-display-hero text-xl font-bold text-amber-600">
                  {totalWaitlist}
                </span>
                <span className="text-[10px] font-code-telemetry text-amber-700 font-semibold">
                  PAX QUEUED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Controller Toolbar */}
      <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#eeeeed] border-b border-[#c4c6ce] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#000f22] uppercase font-label-caps mr-1">
            Filters:
          </span>
          {(['ALL', 'ON TIME', 'BOARDING', 'DELAYED'] as const).map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                filter === statusKey
                  ? 'bg-[#000f22] text-white'
                  : 'text-[#43474d] hover:bg-white bg-white/50 border border-[#c4c6ce]'
              }`}
              onClick={() => setFilter(statusKey)}
            >
              {statusKey === 'ALL' ? `ALL FLIGHTS (${flights.length})` : statusKey}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 bg-[#000f22] text-white rounded text-xs font-semibold hover:bg-[#162538] flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            onClick={() => setIsAddModalOpen(true)}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Flight</span>
          </button>
          <button
            type="button"
            className="px-3 py-1.5 bg-white border border-[#c4c6ce] hover:border-[#74777e] text-[#000f22] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            onClick={() => {
              onShowToast('Radar Sweep Initiated: Transponder signals synced with Shannon & Gander Oceanic Centers.');
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sweep Radar</span>
          </button>
        </div>
      </div>

      {/* Sabre / Amadeus Inspired Dense Data Table */}
      <div className="p-3 sm:p-6 flex-1">
        <div className="bg-white border border-[#c4c6ce] rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f3f4f3] border-b border-[#c4c6ce] h-9 font-label-caps text-[11px] uppercase tracking-wider text-[#43474d]">
                  <th className="px-4 py-2 font-bold">FLIGHT</th>
                  <th className="px-4 py-2 font-bold">SECTOR (ROUTING)</th>
                  <th className="px-4 py-2 font-bold">AIRCRAFT / TAIL</th>
                  <th className="px-4 py-2 font-bold">DEP (UTC)</th>
                  <th className="px-4 py-2 font-bold">GATE / TERM</th>
                  <th className="px-4 py-2 font-bold">SEAT INVENTORY</th>
                  <th className="px-4 py-2 font-bold">WAITLIST</th>
                  <th className="px-4 py-2 font-bold">DISPATCH STATUS</th>
                  <th className="px-4 py-2 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c6ce] text-xs text-[#000f22]">
                {filteredFlights.map((flight) => {
                  let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                  if (flight.status === 'BOARDING') {
                    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300';
                  } else if (flight.status === 'DELAYED') {
                    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
                  } else if (flight.status === 'DEPARTED') {
                    badgeStyle = 'bg-[#eeeeed] text-[#43474d] border-[#c4c6ce]';
                  }

                  return (
                    <tr
                      key={flight.id}
                      className="hover:bg-[#f3f4f3] transition-colors border-b border-[#c4c6ce]"
                    >
                      <td className="px-4 py-3 font-code-telemetry font-bold text-[#000f22]">
                        <span className="text-[#005cba] mr-1.5 font-bold">✈</span>
                        {flight.flightNo}
                      </td>
                      <td className="px-4 py-3 font-code-telemetry font-medium">
                        {flight.originCode} → {flight.destinationCode}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#43474d]">
                        {flight.aircraft}
                      </td>
                      <td className="px-4 py-3 font-code-telemetry font-semibold text-[#000f22]">
                        {flight.depTime} UTC
                      </td>
                      <td className="px-4 py-3 font-code-telemetry">
                        {flight.gate}
                      </td>
                      <td className="px-4 py-3 font-code-telemetry text-[11px] text-[#43474d]">
                        Eco: {flight.seatsLeft * 6} | Biz: {flight.seatsLeft} | 1st: 2
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className={`px-2 py-0.5 rounded text-[11px] font-code-telemetry font-bold cursor-pointer transition-opacity hover:opacity-80 ${
                            flight.waitlistCount > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-[#eeeeed] text-[#43474d]'
                          }`}
                          onClick={() => onOpenWaitlist(flight)}
                        >
                          {flight.waitlistCount} PAX
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={flight.status}
                          onChange={(e) =>
                            onUpdateStatus(
                              flight.flightNo,
                              e.target.value as Flight['status']
                            )
                          }
                          className={`text-[10px] font-label-caps font-bold uppercase rounded px-2 py-0.5 border ${badgeStyle} cursor-pointer outline-none`}
                        >
                          <option value="ON TIME">ON TIME</option>
                          <option value="BOARDING">BOARDING</option>
                          <option value="DELAYED">DELAYED</option>
                          <option value="DEPARTED">DEPARTED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Manage Waitlist"
                            className="p-1 hover:bg-[#eeeeed] rounded text-[#43474d] hover:text-[#000f22] cursor-pointer"
                            onClick={() => onOpenWaitlist(flight)}
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Print Sector Manifest"
                            className="p-1 hover:bg-[#eeeeed] rounded text-[#43474d] hover:text-[#000f22] cursor-pointer"
                            onClick={() =>
                              onShowToast(
                                `Manifest for ${flight.flightNo} printed to ground agent terminal.`
                              )
                            }
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="ADS-B Transponder Ping"
                            className="p-1 hover:bg-[#eeeeed] rounded text-[#005cba] hover:text-[#00458e] cursor-pointer"
                            onClick={() =>
                              onShowToast(
                                `Flight ${flight.flightNo} transponder sector beacon verified (Squawk 4217).`
                              )
                            }
                          >
                            <Radio className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Flight Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a2540]/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl border border-[#c4c6ce] p-4 sm:p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#000f22]" />
                <h3 className="font-headline text-base font-bold text-[#000f22]">
                  Create Dispatch Flight Slot
                </h3>
              </div>
              <button
                type="button"
                className="p-1 text-[#74777e] hover:text-[#000f22] cursor-pointer"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFlight} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Flight Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newFlightNo}
                    onChange={(e) => setNewFlightNo(e.target.value)}
                    placeholder="e.g. AP-512"
                    className="w-full text-xs font-code-telemetry px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Aircraft Model
                  </label>
                  <select
                    value={newAircraft}
                    onChange={(e) => setNewAircraft(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
                  >
                    <option>Airbus A350-900</option>
                    <option>Boeing 787-9 Dreamliner</option>
                    <option>Airbus A350-1000</option>
                    <option>Boeing 777-300ER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                  Sector (Origin → Destination)
                </label>
                <input
                  type="text"
                  required
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  placeholder="JFK → CDG"
                  className="w-full text-xs font-code-telemetry px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Departure (UTC)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDepTime}
                    onChange={(e) => setNewDepTime(e.target.value)}
                    placeholder="18:45 UTC"
                    className="w-full text-xs font-code-telemetry px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Gate / Terminal
                  </label>
                  <input
                    type="text"
                    required
                    value={newGate}
                    onChange={(e) => setNewGate(e.target.value)}
                    placeholder="B22 / T4"
                    className="w-full text-xs font-code-telemetry px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                  Base Price ($ USD)
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="1750"
                  className="w-full text-xs font-code-telemetry px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#c4c6ce]/60">
                <button
                  type="button"
                  className="px-3.5 py-2 border border-[#c4c6ce] text-xs font-semibold rounded text-[#43474d] cursor-pointer hover:bg-[#f3f4f3]"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#000f22] text-white text-xs font-semibold rounded hover:bg-[#162538] cursor-pointer transition-colors"
                >
                  Inject Flight Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
