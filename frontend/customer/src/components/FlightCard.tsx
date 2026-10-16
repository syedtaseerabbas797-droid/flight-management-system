import React from 'react';
import { Flight } from '../services/api';
import { Plane } from 'lucide-react';

interface FlightCardProps {
  flight: Flight;
  onHold: (flight: Flight) => void;
  onConfirm: (flight: Flight) => void;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, onHold, onConfirm }) => {
  return (
    <div className="bg-white border border-[#c4c6ce] rounded-xl p-5 hover:border-[#005cba] hover:shadow-[0px_4px_16px_-2px_rgba(10,37,64,0.08)] transition-all">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        {/* Flight Route Segment */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="font-label-caps text-xs px-2 py-0.5 rounded bg-[#0a2540] text-white font-semibold">
                {flight.flightNo}
              </span>
              <span className="text-xs text-[#43474d] font-medium">
                {flight.aircraft} • {flight.techBadge}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                {flight.onTimeRecord}
              </span>
            </div>

            {/* Seat Availability Label */}
            {flight.seatsUrgency ? (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                {flight.seatsLabel || `${flight.seatsLeft} seats left`}
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#43474d] bg-[#f3f4f3] px-2.5 py-0.5 rounded border border-[#c4c6ce]">
                {flight.seatsLabel || `${flight.seatsLeft} seats available`}
              </span>
            )}
          </div>

          {/* Journey Timelines */}
          <div className="grid grid-cols-7 items-center gap-2">
            <div className="col-span-2">
              <div className="font-display-hero text-2xl sm:text-3xl font-semibold text-[#000f22]">
                {flight.depTime}
              </div>
              <div className="font-label-caps text-xs font-bold text-[#000f22]">
                {flight.originCode}
              </div>
              <div className="text-[11px] text-[#43474d] truncate">
                {flight.originTerminal}
              </div>
            </div>

            {/* Flight Path Graphic */}
            <div className="col-span-3 flex flex-col items-center">
              <span className="font-code-telemetry text-[11px] text-[#43474d] font-medium">
                {flight.duration}
              </span>
              <div className="w-full flex items-center gap-1 my-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#005cba]"></div>
                <div className="flex-1 h-[2px] bg-[#005cba]"></div>
                <Plane className="w-4 h-4 text-[#005cba] rotate-90 shrink-0" />
                <div className="flex-1 h-[2px] bg-[#005cba]"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-[#000f22]"></div>
              </div>
              <span className="text-[10px] font-code-telemetry text-emerald-700 font-semibold tracking-wider">
                {flight.routeNauticalMiles}
              </span>
            </div>

            <div className="col-span-2 text-right">
              <div className="font-display-hero text-2xl sm:text-3xl font-semibold text-[#000f22]">
                {flight.arrTime}
                {flight.arrDayOffset && (
                  <span className="text-xs font-normal text-[#43474d] ml-0.5">
                    {flight.arrDayOffset}
                  </span>
                )}
              </div>
              <div className="font-label-caps text-xs font-bold text-[#000f22]">
                {flight.destinationCode}
              </div>
              <div className="text-[11px] text-[#43474d] truncate">
                {flight.destinationTerminal}
              </div>
            </div>
          </div>
        </div>

        {/* Fares Breakdown & Interaction */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-[#c4c6ce] pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-[#43474d]">
                {flight.cabin} Fare
              </span>
              <div className="text-right">
                {flight.strikePrice && (
                  <span className="text-xs text-[#43474d] line-through mr-1.5">
                    ${flight.strikePrice.toLocaleString()}
                  </span>
                )}
                <span className="font-display-hero text-2xl sm:text-3xl font-bold text-[#000f22]">
                  ${flight.basePrice.toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#43474d] text-right">
              Taxes and aviation security fees included
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded border border-[#c4c6ce] hover:border-[#74777e] text-xs font-semibold text-[#000f22] bg-white hover:bg-[#f3f4f3] transition-colors text-center active:scale-[0.99] cursor-pointer"
              onClick={() => onHold(flight)}
            >
              Hold Fare ($25)
            </button>
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded bg-[#005cba] text-white hover:bg-[#00458e] text-xs font-semibold text-center transition-colors shadow-xs active:scale-[0.99] cursor-pointer"
              onClick={() => onConfirm(flight)}
            >
              Confirm Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
