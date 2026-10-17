import React, { useState } from 'react';
import { Users, X, UserPlus, CheckCircle } from 'lucide-react';
import { Flight, joinWaitlistApi } from '../services/api';

interface WaitlistModalProps {
  flight: Flight | null;
  onClose: () => void;
  onAddStandby: (flightNo: string, passengerName: string) => void;
  onShowToast: (msg: string) => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  flight,
  onClose,
  onAddStandby,
  onShowToast,
}) => {
  if (!flight) return null;

  const [standbyName, setStandbyName] = useState('');
  const [priorityTier, setPriorityTier] = useState('Corporate Partner');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!standbyName.trim()) return;
    try {
      await joinWaitlistApi({
        flightNo: flight.flightNo,
        passengerName: `${standbyName} (${priorityTier})`,
        cabinClass: flight.cabin || 'Business',
      });
      onShowToast(`Enqueued ${standbyName} on backend waitlist for ${flight.flightNo}`);
    } catch {
      onShowToast(`Added ${standbyName} to standby queue for ${flight.flightNo}`);
    }
    onAddStandby(flight.flightNo, `${standbyName} (${priorityTier})`);
    setStandbyName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a2540]/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl border border-[#c4c6ce] p-4 sm:p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <h3 className="font-headline text-sm sm:text-base font-bold text-[#000f22]">
              Standby &amp; Waitlist Queue
            </h3>
          </div>
          <button
            type="button"
            className="p-1 text-[#74777e] hover:text-[#000f22] cursor-pointer"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-[#f3f4f3] rounded border border-[#c4c6ce] mb-4 text-xs">
          <div className="flex justify-between font-code-telemetry">
            <span className="text-[#43474d] font-bold">FLIGHT TARGET:</span>
            <span className="font-bold text-[#000f22]">{flight.flightNo} ({flight.originCode} → {flight.destinationCode})</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[#43474d] font-bold">QUEUED PRIORITY PAX:</span>
            <span className="font-bold text-amber-700 font-code-telemetry">
              {flight.waitlistCount} Pax in Queue
            </span>
          </div>
        </div>

        {/* Existing Priority Standby Passengers */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between p-2 rounded bg-[#f9f9f8] border border-[#c4c6ce] text-xs gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="font-medium text-[#000f22] truncate">1. Miller, Sarah (VIP Medallion)</span>
            </div>
            <span className="font-code-telemetry text-emerald-700 font-bold text-[11px] whitespace-nowrap flex-shrink-0">
              CLEARED (04B)
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#f9f9f8] border border-[#c4c6ce] text-xs gap-2">
            <span className="font-medium text-[#000f22] truncate">2. Kovac, Alex (Corporate Partner)</span>
            <span className="font-code-telemetry text-amber-700 font-bold text-[11px] whitespace-nowrap flex-shrink-0">
              NEXT PRIORITY
            </span>
          </div>
          {flight.waitlistCount > 2 && (
            <div className="flex items-center justify-between p-2 rounded bg-[#f9f9f8] border border-[#c4c6ce] text-xs gap-2">
              <span className="font-medium text-[#000f22] truncate">3. Sterling, Eleanor (Gold Status)</span>
              <span className="font-code-telemetry text-amber-700 font-bold text-[11px] whitespace-nowrap flex-shrink-0">
                STANDBY #2
              </span>
            </div>
          )}
        </div>

        {/* Form to add standby traveler */}
        <form onSubmit={handleAdd} className="space-y-2.5 pt-3 border-t border-[#c4c6ce]">
          <label className="block text-[10px] font-label-caps uppercase text-[#43474d] font-bold">
            Add Standby Traveler (POST /waitlist)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="Passenger Name"
              value={standbyName}
              onChange={(e) => setStandbyName(e.target.value)}
              className="text-xs px-2.5 py-2 border border-[#c4c6ce] rounded flex-1 text-[#000f22]"
            />
            <select
              value={priorityTier}
              onChange={(e) => setPriorityTier(e.target.value)}
              className="text-xs px-2.5 py-2 border border-[#c4c6ce] rounded text-[#000f22]"
            >
              <option>Corporate Partner</option>
              <option>VIP Medallion</option>
              <option>Standard Standby</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-[#000f22] text-white text-xs font-semibold rounded hover:bg-[#162538] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Queue Standby Traveler</span>
          </button>
        </form>
      </div>
    </div>
  );
};
