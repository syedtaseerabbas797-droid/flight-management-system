import React, { useState } from 'react';
import { AdminFlightCreateRequest } from '../types/aviation';
import { aviationStore } from '../services/api';

interface ScheduleFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlightCreated: () => void;
}

export const ScheduleFlightModal: React.FC<ScheduleFlightModalProps> = ({
  isOpen,
  onClose,
  onFlightCreated,
}) => {
  const [flightNumber, setFlightNumber] = useState('AP-');
  const [tailNumber, setTailNumber] = useState('N908AP');
  const [aircraftType, setAircraftType] = useState('A350-900');
  const [originIcao, setOriginIcao] = useState('KJFK');
  const [originGate, setOriginGate] = useState('Gate B22');
  const [destinationIcao, setDestinationIcao] = useState('EGLL');
  const [destinationTerminal, setDestinationTerminal] = useState('Term 5');
  const [stdUtc, setStdUtc] = useState('2026-04-18 19:30');
  const [staUtc, setStaUtc] = useState('2026-04-19 07:15');
  const [firstSeats, setFirstSeats] = useState(12);
  const [clubSeats, setClubSeats] = useState(48);
  const [mainSeats, setMainSeats] = useState(240);
  const [broadcastGds, setBroadcastGds] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNumber.trim() || flightNumber === 'AP-') {
      alert('Please enter a valid Flight Number (e.g. AP-502)');
      return;
    }

    setIsSubmitting(true);
    const flightReq: AdminFlightCreateRequest = {
      flightNumber,
      tailNumber,
      aircraftType,
      originIcao,
      originGate,
      destinationIcao,
      destinationTerminal,
      stdUtc,
      staUtc,
      firstSeats: Number(firstSeats),
      clubSeats: Number(clubSeats),
      mainSeats: Number(mainSeats),
      broadcastGds,
    };

    try {
      await aviationStore.createAdminFlight(flightReq);
      onFlightCreated();
      onClose();
    } catch (err) {
      console.error('Error creating flight:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a2540]/40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#c4c6ce] rounded shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#f3f4f3] border-b border-[#c4c6ce] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#005cba] text-[18px]">add_circle</span>
            <span className="font-headline text-[15px] font-bold text-[#000f22] uppercase">
              Flight Creation &amp; Dispatch Slip
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#43474d] hover:text-[#000f22] hover:bg-[#eeeeed] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Flight Number */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                FLIGHT NUMBER (IATA)
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                required
                className="w-full h-8 px-2.5 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] uppercase font-bold text-[#000f22]"
              />
            </div>

            {/* Tail Number */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                AIRCRAFT TAIL / REG
              </label>
              <input
                type="text"
                value={tailNumber}
                onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
                placeholder="e.g. N904AP"
                className="w-full h-8 px-2.5 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] uppercase text-[#000f22]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Aircraft Type */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                AIRCRAFT FLEET TYPE
              </label>
              <select
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                className="w-full h-8 px-2 font-mono text-[11px] bg-white border border-[#c4c6ce] rounded text-[#000f22]"
              >
                <option value="A350-900">Airbus A350-900 (ETOPS 370)</option>
                <option value="B787-9">Boeing 787-9 Dreamliner (GE-GEnx)</option>
                <option value="A321neo">Airbus A321neo LR (CFM-LEAP)</option>
                <option value="B777-300ER">Boeing 777-300ER (GE90-115B)</option>
              </select>
            </div>

            {/* Broadcast Mode */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                OPERATION CLASSIFICATION
              </label>
              <input
                type="text"
                readOnly
                value="SCHEDULED COMMERCIAL (FLAG)"
                className="w-full h-8 px-2.5 font-mono text-[11px] bg-[#f3f4f3] border border-[#c4c6ce] rounded text-[#43474d]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Origin ICAO */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                ORIGIN ICAO / GATE
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  maxLength={4}
                  value={originIcao}
                  onChange={(e) => setOriginIcao(e.target.value.toUpperCase())}
                  placeholder="KJFK"
                  className="w-20 h-8 px-2 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] uppercase text-center font-bold text-[#000f22]"
                />
                <input
                  type="text"
                  value={originGate}
                  onChange={(e) => setOriginGate(e.target.value)}
                  placeholder="Gate B22"
                  className="flex-1 h-8 px-2 text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] text-[#000f22]"
                />
              </div>
            </div>

            {/* Destination ICAO */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                DESTINATION ICAO / TERM
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  maxLength={4}
                  value={destinationIcao}
                  onChange={(e) => setDestinationIcao(e.target.value.toUpperCase())}
                  placeholder="EGLL"
                  className="w-20 h-8 px-2 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] uppercase text-center font-bold text-[#000f22]"
                />
                <input
                  type="text"
                  value={destinationTerminal}
                  onChange={(e) => setDestinationTerminal(e.target.value)}
                  placeholder="Term 5"
                  className="flex-1 h-8 px-2 text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] text-[#000f22]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* STD Departure UTC */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                SCHEDULED DEPARTURE (UTC)
              </label>
              <input
                type="text"
                value={stdUtc}
                onChange={(e) => setStdUtc(e.target.value)}
                className="w-full h-8 px-2.5 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] text-[#000f22]"
              />
            </div>

            {/* STA Arrival UTC */}
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                SCHEDULED ARRIVAL (UTC)
              </label>
              <input
                type="text"
                value={staUtc}
                onChange={(e) => setStaUtc(e.target.value)}
                className="w-full h-8 px-2.5 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded focus:border-[#005cba] text-[#000f22]"
              />
            </div>
          </div>

          {/* Cabin Allocation Grid */}
          <div className="p-2.5 rounded bg-[#f9f9f8] border border-[#c4c6ce]">
            <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1.5">
              CABIN SEAT ALLOCATION &amp; RESERVED INVENTORY
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-mono text-[#74777e] block">FIRST / SUITE</span>
                <input
                  type="number"
                  value={firstSeats}
                  onChange={(e) => setFirstSeats(Number(e.target.value))}
                  className="w-full h-7 px-2 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#74777e] block">BUSINESS / CLUB</span>
                <input
                  type="number"
                  value={clubSeats}
                  onChange={(e) => setClubSeats(Number(e.target.value))}
                  className="w-full h-7 px-2 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#74777e] block">MAIN CABIN</span>
                <input
                  type="number"
                  value={mainSeats}
                  onChange={(e) => setMainSeats(Number(e.target.value))}
                  className="w-full h-7 px-2 font-mono text-[12px] bg-white border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>
            </div>
          </div>

          {/* GDS Routing Toggle */}
          <div className="flex items-center justify-between font-mono text-[11px] text-[#43474d] py-1">
            <div className="flex items-center space-x-2">
              <input
                id="gds-sync"
                type="checkbox"
                checked={broadcastGds}
                onChange={(e) => setBroadcastGds(e.target.checked)}
                className="rounded border-[#c4c6ce] text-[#005cba] focus:ring-0"
              />
              <label htmlFor="gds-sync" className="cursor-pointer">
                BROADCAST TO AMADEUS / SABRE GDS NETWORKS
              </label>
            </div>
            <span className="text-[#005cba] font-bold">TYPE: SCHEDULED COMM</span>
          </div>

          {/* Modal Action Footer */}
          <div className="pt-3 border-t border-[#c4c6ce] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded border border-[#c4c6ce] hover:bg-[#eeeeed] text-[#000f22] text-[12px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-4 rounded bg-[#0a2540] hover:bg-[#162538] text-white text-[12px] font-semibold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">send</span>
              <span>{isSubmitting ? 'Dispatching...' : 'File & Dispatch Sector'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
