import React, { useState, useEffect } from 'react';
import { Flight } from '../types/aviation';

interface RadarViewportProps {
  flights: Flight[];
  onSelectFlight: (flight: Flight) => void;
}

export const RadarViewport: React.FC<RadarViewportProps> = ({ flights, onSelectFlight }) => {
  const [selectedPin, setSelectedPin] = useState<Flight | null>(flights[0] || null);
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSweepAngle((prev) => (prev + 3) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Map coordinates to 0-100% SVG canvas
  // JFK (-73.7, 40.6) -> 26%, 42%
  // LHR (-0.4, 51.4)  -> 52%, 35%
  // SFO (-122.3, 37.6) -> 12%, 46%
  // HND (139.7, 35.5) -> 86%, 48%
  // BOS (-71.0, 42.3) -> 28%, 40%
  // DUB (-6.2, 53.4)  -> 49%, 33%
  // LAX (-118.4, 33.9)-> 14%, 50%
  // CDG (2.5, 49.0)   -> 54%, 37%
  // ORD (-87.9, 41.9) -> 21%, 41%
  // FRA (8.5, 50.0)   -> 56%, 36%
  // MIA (-80.2, 25.8) -> 24%, 60%
  // EZE (-58.5, -34.8)-> 32%, 85%

  const routePositions: Record<string, { x1: number; y1: number; x2: number; y2: number; midX: number; midY: number }> = {
    'AP-104': { x1: 26, y1: 42, x2: 52, y2: 35, midX: 41, midY: 34 },
    'AP-882': { x1: 12, y1: 46, x2: 86, y2: 48, midX: 20, midY: 42 },
    'AP-305': { x1: 28, y1: 40, x2: 49, y2: 33, midX: 38, midY: 34 },
    'AP-712': { x1: 14, y1: 50, x2: 54, y2: 37, midX: 32, midY: 38 },
    'AP-419': { x1: 21, y1: 41, x2: 56, y2: 36, midX: 38, midY: 36 },
    'AP-901': { x1: 24, y1: 60, x2: 32, y2: 85, midX: 28, midY: 72 },
  };

  return (
    <div className="flex-1 p-3 flex flex-col h-full overflow-hidden bg-[#f9f9f8]">
      {/* Viewport Top Bar */}
      <div className="h-9 px-3 bg-white border border-[#c4c6ce] rounded-t flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[#005cba] text-[16px]">radar</span>
          <span className="font-bold text-[#000f22]">TRANSOCEANIC SITUATIONAL RADAR VIEWPORT</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
            ADS-B DUAL FREQ ACTIVE
          </span>
        </div>

        <div className="flex items-center space-x-4 text-[#43474d] text-[11px]">
          <span>SECTOR RANGE: <strong>12,400 NM</strong></span>
          <span>•</span>
          <span>LATENCY: <strong>18ms</strong></span>
          <span>•</span>
          <span>TRACKING: <strong>{flights.length} SECTORS</strong></span>
        </div>
      </div>

      {/* Main Radar Screen Canvas */}
      <div className="flex-1 bg-[#0a2540] border-x border-b border-[#c4c6ce] rounded-b relative overflow-hidden flex">
        {/* Animated Radar Sweep & Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {/* Concentric distance circles */}
          <svg className="w-full h-full">
            <circle cx="50%" cy="50%" r="20%" fill="none" stroke="#5095fe" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="50%" cy="50%" r="40%" fill="none" stroke="#5095fe" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="50%" cy="50%" r="60%" fill="none" stroke="#5095fe" strokeWidth="1" strokeDasharray="5 5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#5095fe" strokeWidth="1" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#5095fe" strokeWidth="1" />
          </svg>
        </div>

        {/* Global Route Paths & Flight Markers */}
        <svg className="absolute inset-0 w-full h-full">
          {/* Transoceanic flight corridors */}
          {flights.map((flight) => {
            const pos = routePositions[flight.flightNumber] || { x1: 30, y1: 40, x2: 60, y2: 40, midX: 45, midY: 38 };
            const isSelected = selectedPin?.id === flight.id;
            const isAirborne = flight.status.includes('AIRBORNE');

            return (
              <g key={flight.id} className="cursor-pointer" onClick={() => { setSelectedPin(flight); onSelectFlight(flight); }}>
                {/* Geodesic Arc */}
                <path
                  d={`M ${pos.x1}% ${pos.y1}% Q ${pos.midX}% ${pos.midY}% ${pos.x2}% ${pos.y2}%`}
                  fill="none"
                  stroke={isSelected ? '#5095fe' : isAirborne ? '#10b981' : '#64748b'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  strokeDasharray={isAirborne ? 'none' : '4 4'}
                  opacity={isSelected ? 1 : 0.7}
                />

                {/* Waypoint Departure */}
                <circle cx={`${pos.x1}%`} cy={`${pos.y1}%`} r="3" fill="#ffffff" />
                <text x={`${pos.x1}%`} y={`${pos.y1 - 1.5}%`} fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  {flight.origin}
                </text>

                {/* Waypoint Arrival */}
                <circle cx={`${pos.x2}%`} cy={`${pos.y2}%`} r="3" fill="#cbd5e1" />
                <text x={`${pos.x2}%`} y={`${pos.y2 - 1.5}%`} fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  {flight.destination}
                </text>

                {/* Plane Target Marker */}
                <circle
                  cx={`${pos.midX}%`}
                  cy={`${pos.midY}%`}
                  r={isSelected ? '6' : '4.5'}
                  fill={isAirborne ? '#10b981' : '#f59e0b'}
                  className={isAirborne ? 'animate-pulse' : ''}
                />

                {/* Flight Tag Box */}
                <rect
                  x={`${pos.midX + 1}%`}
                  y={`${pos.midY - 3}%`}
                  width="54"
                  height="16"
                  rx="2"
                  fill="#000f22"
                  stroke={isSelected ? '#5095fe' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x={`${pos.midX + 2}%`}
                  y={`${pos.midY - 1.2}%`}
                  fill={isSelected ? '#5095fe' : '#ffffff'}
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {flight.flightNumber} {isAirborne ? 'FL390' : 'GATE'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Flight Live Readout Card (Overlay Bottom-Left) */}
        {selectedPin && (
          <div className="absolute bottom-3 left-3 w-80 bg-white/95 backdrop-blur-xs border border-[#c4c6ce] rounded shadow-lg p-3 text-xs font-mono z-20">
            <div className="flex items-center justify-between border-b border-[#c4c6ce] pb-1.5 mb-2">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-[#005cba] text-sm">{selectedPin.flightNumber}</span>
                <span className="text-gray-500">• {selectedPin.aircraft}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {selectedPin.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 font-body">
              <div>
                <span className="text-gray-500 block font-mono text-[9px]">ROUTE PAIR</span>
                <span className="font-bold text-[#000f22]">{selectedPin.origin} ➔ {selectedPin.destination}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-mono text-[9px]">TAIL &amp; ENGINES</span>
                <span className="text-[#000f22]">{selectedPin.tailNumber} ({selectedPin.engineSpecs})</span>
              </div>
              <div>
                <span className="text-gray-500 block font-mono text-[9px]">ALTITUDE / SPEED</span>
                <span className="text-emerald-700 font-bold">{selectedPin.altitude ? `${selectedPin.altitude.toLocaleString()} FT / ${selectedPin.speedKnots} KTS` : 'GROUND LEVEL'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-mono text-[9px]">CABIN LOAD</span>
                <span className="text-[#000f22]">{selectedPin.cabinLoad.booked}/{selectedPin.cabinLoad.capacity} ({selectedPin.cabinLoad.percentage}%)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#c4c6ce] flex items-center justify-between">
              <button
                onClick={() => onSelectFlight(selectedPin)}
                className="w-full py-1 bg-[#0a2540] hover:bg-[#162538] text-white rounded text-[11px] font-semibold text-center"
              >
                Focus Sector in Operations Desk
              </button>
            </div>
          </div>
        )}

        {/* Legend Overlay Top-Right */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs border border-[#c4c6ce] rounded p-2 text-[10px] font-mono text-[#43474d] space-y-1 z-10">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>AIRBORNE TRANSIT</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>GATE / TAXIING HOLD</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5095fe]"></span>
            <span>ACTIVE FOCUS SECTOR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
