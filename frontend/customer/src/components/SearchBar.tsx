import React from 'react';
import { ArrowLeftRight, Search, ShieldCheck, Clock } from 'lucide-react';

interface SearchBarProps {
  tripType: 'round' | 'oneway' | 'multi';
  setTripType: (type: 'round' | 'oneway' | 'multi') => void;
  origin: string;
  setOrigin: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
  travelDates: string;
  setTravelDates: (val: string) => void;
  cabin: string;
  setCabin: (val: string) => void;
  directOnly: boolean;
  setDirectOnly: (val: boolean) => void;
  flexibleDates: boolean;
  setFlexibleDates: (val: boolean) => void;
  onSearch: () => void;
  onSwap: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  tripType,
  setTripType,
  origin,
  setOrigin,
  destination,
  setDestination,
  travelDates,
  setTravelDates,
  cabin,
  setCabin,
  directOnly,
  setDirectOnly,
  flexibleDates,
  setFlexibleDates,
  onSearch,
  onSwap,
}) => {
  return (
    <div className="bg-white rounded-lg border border-[#c4c6ce] p-5 shadow-[0px_4px_20px_-2px_rgba(10,37,64,0.06)]">
      {/* Trip Mode Pills & Guarantees */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#c4c6ce]/60">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              tripType === 'round'
                ? 'bg-[#000f22] text-white shadow-xs'
                : 'text-[#43474d] hover:bg-[#f3f4f3]'
            }`}
            onClick={() => setTripType('round')}
          >
            Round Trip
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              tripType === 'oneway'
                ? 'bg-[#000f22] text-white shadow-xs font-semibold'
                : 'text-[#43474d] hover:bg-[#f3f4f3]'
            }`}
            onClick={() => setTripType('oneway')}
          >
            One Way
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              tripType === 'multi'
                ? 'bg-[#000f22] text-white shadow-xs font-semibold'
                : 'text-[#43474d] hover:bg-[#f3f4f3]'
            }`}
            onClick={() => setTripType('multi')}
          >
            Multi-City
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#43474d]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#005cba]" />
            <span className="font-medium">Instant Ticket Assurance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#005cba]" />
            <span className="font-medium">Free 24h Fare Hold</span>
          </div>
        </div>
      </div>

      {/* Main Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Origin */}
        <div className="md:col-span-3">
          <label className="block text-[10px] font-label-caps text-[#43474d] uppercase mb-1 font-semibold">
            Departure Airport
          </label>
          <div className="flex items-center border border-[#c4c6ce] rounded bg-white focus-within:border-[#005cba] focus-within:ring-1 focus-within:ring-[#005cba] px-3 py-2 transition-all">
            <span className="font-code-telemetry text-xs font-bold text-[#005cba] mr-2">
              JFK
            </span>
            <input
              type="text"
              className="w-full text-xs font-medium text-[#000f22] p-0 border-0 focus:ring-0 bg-transparent placeholder-[#74777e] outline-none"
              placeholder="Origin city or code"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center -my-2 md:my-0">
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-[#c4c6ce] bg-[#f3f4f3] hover:bg-[#eeeeed] text-[#000f22] flex items-center justify-center transition-transform duration-200 active:rotate-180 hover:border-[#74777e]"
            onClick={onSwap}
            title="Swap Departure and Arrival"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#43474d]" />
          </button>
        </div>

        {/* Destination */}
        <div className="md:col-span-3">
          <label className="block text-[10px] font-label-caps text-[#43474d] uppercase mb-1 font-semibold">
            Arrival Airport
          </label>
          <div className="flex items-center border border-[#c4c6ce] rounded bg-white focus-within:border-[#005cba] focus-within:ring-1 focus-within:ring-[#005cba] px-3 py-2 transition-all">
            <span className="font-code-telemetry text-xs font-bold text-[#005cba] mr-2">
              LHR
            </span>
            <input
              type="text"
              className="w-full text-xs font-medium text-[#000f22] p-0 border-0 focus:ring-0 bg-transparent placeholder-[#74777e] outline-none"
              placeholder="Destination city or code"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="md:col-span-3">
          <label className="block text-[10px] font-label-caps text-[#43474d] uppercase mb-1 font-semibold">
            Travel Dates (Depart - Return)
          </label>
          <div className="flex items-center border border-[#c4c6ce] rounded bg-white focus-within:border-[#005cba] focus-within:ring-1 focus-within:ring-[#005cba] px-3 py-2 transition-all">
            <span className="material-symbols-outlined text-[16px] text-[#74777e] mr-2">
              calendar_month
            </span>
            <input
              type="text"
              className="w-full text-xs font-medium text-[#000f22] p-0 border-0 focus:ring-0 bg-transparent outline-none"
              value={travelDates}
              onChange={(e) => setTravelDates(e.target.value)}
            />
          </div>
        </div>

        {/* Passengers & Class Dropdown */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-label-caps text-[#43474d] uppercase mb-1 font-semibold">
            Cabin &amp; Pax
          </label>
          <select
            className="w-full text-xs font-medium text-[#000f22] border border-[#c4c6ce] rounded bg-white focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] py-2 px-2.5 outline-none cursor-pointer"
            value={cabin}
            onChange={(e) => setCabin(e.target.value)}
          >
            <option value="economy">1 Adult, Economy</option>
            <option value="premium">1 Adult, Premium Economy</option>
            <option value="business">1 Adult, Business Class</option>
            <option value="first">1 Adult, First Class</option>
          </select>
        </div>
      </div>

      {/* Bottom Action Strip */}
      <div className="mt-4 pt-3 border-t border-[#c4c6ce]/60 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-4 text-xs text-[#43474d]">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
              className="rounded text-[#000f22] focus:ring-[#000f22] border-[#c4c6ce] cursor-pointer"
            />
            <span className="font-medium">Direct flights only</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={flexibleDates}
              onChange={(e) => setFlexibleDates(e.target.checked)}
              className="rounded text-[#000f22] focus:ring-[#000f22] border-[#c4c6ce] cursor-pointer"
            />
            <span className="font-medium">Flexible ±3 days</span>
          </label>
        </div>

        <button
          type="button"
          className="w-full sm:w-auto px-6 py-2.5 bg-[#000f22] text-white hover:bg-[#162538] rounded font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] shadow-xs cursor-pointer"
          onClick={onSearch}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Flights</span>
        </button>
      </div>
    </div>
  );
};
