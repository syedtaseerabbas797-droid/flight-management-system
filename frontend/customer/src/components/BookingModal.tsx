import React, { useState } from 'react';
import { Flight, BookingResponse, holdFareApi, confirmTicketApi } from '../services/api';
import { X, CheckCircle, ShieldCheck, Ticket, Download, ArrowRight, Loader2 } from 'lucide-react';

interface BookingModalProps {
  mode: 'hold' | 'confirm' | null;
  flight: Flight | null;
  onClose: () => void;
  onSuccess: (booking: BookingResponse) => void;
  onShowToast: (msg: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  mode,
  flight,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  if (!mode || !flight) return null;

  // Passenger state
  const [fullName, setFullName] = useState('Capt. Jordan Hayes');
  const [passportOrCnic, setPassportOrCnic] = useState('USA • P29810482');
  const [email, setEmail] = useState('jordan.hayes@aeronexus.aero');
  const [seatPreference, setSeatPreference] = useState('04A (Window - Forward)');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [specialReq, setSpecialReq] = useState('Low Sodium Airline Meal');

  // Loading & confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<BookingResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !passportOrCnic.trim() || !email.trim()) {
      onShowToast('Please fill out all required passenger credentials.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'hold') {
        const payload = {
          flightNo: flight.flightNo,
          origin: flight.originCode,
          destination: flight.destinationCode,
          fare: flight.basePrice,
          fullName,
          passportOrCnic,
          email,
          seatPreference,
          holdFee: 25,
        };
        const res = await holdFareApi(payload);
        setConfirmationData(res);
        onSuccess(res);
        onShowToast(`Fare locked! 24h PNR: ${res.pnr}`);
      } else {
        const payload = {
          flightNo: flight.flightNo,
          origin: flight.originCode,
          destination: flight.destinationCode,
          fare: flight.basePrice,
          fullName,
          passportOrCnic,
          email,
          seatPreference,
          cabin: flight.cabin,
        };
        const res = await confirmTicketApi(payload);
        setConfirmationData(res);
        onSuccess(res);
        onShowToast(`Confirmed! PNR ${res.pnr} issued to ${fullName}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast('Transaction failed. Check console or network telemetry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a2540]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#c4c6ce] p-6 max-w-xl w-full shadow-2xl relative my-8 animate-in fade-in zoom-in duration-200">
        {/* Modal Close Button */}
        <button
          type="button"
          className="absolute top-4 right-4 text-[#74777e] hover:text-[#000f22] p-1 rounded-full hover:bg-[#f3f4f3] transition-colors"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* View 1: If Booking Confirmed State */}
        {confirmationData ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline text-lg sm:text-xl font-bold text-[#000f22]">
                  {confirmationData.status === 'HOLD'
                    ? '24-Hour Fare Lock Confirmed!'
                    : 'Ticket Successfully Issued & Confirmed!'}
                </h3>
                <p className="text-xs text-[#43474d]">
                  Synchronized with Sabre GDS &amp; live Transponder Telemetry.
                </p>
              </div>
            </div>

            {/* Boarding Pass Ticket Summary */}
            <div className="bg-[#f9f9f8] border border-[#c4c6ce] rounded-xl overflow-hidden mb-5">
              {/* Ticket Top Ribbon */}
              <div className="bg-[#000f22] text-white px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[#5095fe]" />
                  <span className="font-label-caps font-semibold tracking-wider">
                    {confirmationData.status === 'HOLD' ? 'ALGORITHMIC FARE HOLD' : 'ELECTRONIC PASSENGER TICKET'}
                  </span>
                </div>
                <div className="font-code-telemetry text-emerald-400 font-bold">
                  STATUS: {confirmationData.status}
                </div>
              </div>

              {/* Ticket Content */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      RECORD LOCATOR (PNR)
                    </span>
                    <span className="font-code-telemetry text-lg font-bold text-[#005cba]">
                      {confirmationData.pnr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      FLIGHT NUMBER
                    </span>
                    <span className="font-code-telemetry text-sm font-bold text-[#000f22]">
                      {confirmationData.flightNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      ROUTING SECTOR
                    </span>
                    <span className="font-code-telemetry text-xs font-semibold text-[#000f22]">
                      {confirmationData.sector}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      SEAT NUMBER
                    </span>
                    <span className="font-code-telemetry text-sm font-bold text-emerald-700">
                      {confirmationData.seatAssigned}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#c4c6ce]/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      PASSENGER NAME
                    </span>
                    <span className="font-medium text-[#000f22]">
                      {confirmationData.passengerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      PASSPORT / DOC ID
                    </span>
                    <span className="font-code-telemetry text-[#000f22]">
                      {confirmationData.passportOrCnic}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-label-caps text-[#43474d] block uppercase font-bold">
                      CONTACT DISPATCH
                    </span>
                    <span className="text-[#000f22] truncate block">
                      {confirmationData.email}
                    </span>
                  </div>
                </div>

                {confirmationData.ticketNumber && (
                  <div className="pt-2 text-xs flex justify-between items-center bg-[#eeeeed] p-2.5 rounded">
                    <span className="text-[#43474d] font-label-caps text-[11px]">
                      e-TICKET NO: {confirmationData.ticketNumber}
                    </span>
                    <span className="font-code-telemetry font-bold text-[#000f22]">
                      TOTAL: ${confirmationData.totalPaid.toLocaleString()} USD
                    </span>
                  </div>
                )}

                {confirmationData.expiresAt && (
                  <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded">
                    <span className="font-semibold block">24-Hour Hold Guarantee:</span>
                    Price is frozen until <strong className="font-mono">{confirmationData.expiresAt}</strong>. A confirmation link has been sent to your email.
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
              <button
                type="button"
                className="px-4 py-2 border border-[#c4c6ce] text-xs font-semibold rounded text-[#43474d] hover:bg-[#f3f4f3] flex items-center justify-center gap-1.5"
                onClick={() => {
                  window.print();
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Save e-Ticket</span>
              </button>
              <button
                type="button"
                className="px-5 py-2 bg-[#000f22] text-white text-xs font-semibold rounded hover:bg-[#162538] flex items-center justify-center gap-1.5"
                onClick={onClose}
              >
                <span>Done &amp; Return to Flight Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* View 2: Booking Details Input Form */
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-1">
              {mode === 'hold' ? (
                <div className="w-8 h-8 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">lock_clock</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-[#d2e4ff] text-[#005cba] flex items-center justify-center font-bold">
                  <Ticket className="w-4 h-4" />
                </div>
              )}
              <h3 className="font-headline text-lg sm:text-xl font-bold text-[#000f22]">
                {mode === 'hold' ? 'Algorithmic 24-Hour Fare Hold' : 'Passenger & Booking Confirmation'}
              </h3>
            </div>

            <p className="text-xs text-[#43474d] mb-4">
              {mode === 'hold'
                ? `Lock current fare of $${flight.basePrice.toLocaleString()} for 24 hours ($25 token fee applicable toward final ticket).`
                : `Enter passenger identification to issue immediate IATA e-ticket for Flight ${flight.flightNo}.`}
            </p>

            {/* Flight Sector Summary Card */}
            <div className="bg-[#f3f4f3] p-3.5 rounded-lg border border-[#c4c6ce] mb-4 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-code-telemetry font-bold text-[#005cba]">
                  FLIGHT {flight.flightNo} • {flight.aircraft}
                </span>
                <span className="font-display-hero text-lg font-bold text-[#000f22]">
                  {mode === 'hold' ? '$25.00 Token' : `$${flight.basePrice.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-[#43474d]">
                <span>
                  {flight.originCode} ({flight.depTime}) → {flight.destinationCode} ({flight.arrTime})
                </span>
                <span className="font-medium text-[#000f22]">{flight.cabin}</span>
              </div>
            </div>

            {/* Form Fields: Full Name, Passport/CNIC, Email, Seat preference */}
            <div className="space-y-3 mb-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Primary Passenger Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Capt. Jordan Hayes"
                    className="w-full text-xs px-3 py-2 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Passport / CNIC / Government ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={passportOrCnic}
                    onChange={(e) => setPassportOrCnic(e.target.value)}
                    placeholder="e.g. USA • P29810482 or CNIC"
                    className="w-full text-xs font-code-telemetry px-3 py-2 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Contact Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="passenger@domain.com"
                    className="w-full text-xs px-3 py-2 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Seat Preference &amp; Allocation
                  </label>
                  <select
                    value={seatPreference}
                    onChange={(e) => setSeatPreference(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] bg-white outline-none cursor-pointer"
                  >
                    <option value="04A (Window - Forward Suite)">04A (Window - Forward Suite)</option>
                    <option value="04K (Window - Right Suite)">04K (Window - Right Suite)</option>
                    <option value="03D (Center Aisle Suite)">03D (Center Aisle Suite)</option>
                    <option value="02A (Bulkhead Window)">02A (Bulkhead Window)</option>
                    <option value="Best Available Seat">Auto-Assign Best Available</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Mobile Phone (SMS Gate Updates)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-xs px-3 py-2 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label-caps uppercase text-[#43474d] mb-1 font-bold">
                    Special Assistance &amp; Dietary
                  </label>
                  <input
                    type="text"
                    value={specialReq}
                    onChange={(e) => setSpecialReq(e.target.value)}
                    placeholder="e.g. Vegetarian, Wheelchair, None"
                    className="w-full text-xs px-3 py-2 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] bg-white outline-none"
                  />
                </div>
              </div>

              {/* API Integration Notice */}
              <div className="pt-2 text-[10px] font-code-telemetry text-[#74777e] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#005cba]" />
                <span>
                  Dispatched via Axios client to {mode === 'hold' ? 'POST /bookings/hold' : 'POST /bookings/confirm'} (http://localhost:8000/api/v1)
                </span>
              </div>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#c4c6ce]/60">
              <button
                type="button"
                className="px-4 py-2 border border-[#c4c6ce] text-xs font-semibold rounded text-[#43474d] hover:bg-[#f3f4f3] transition-colors cursor-pointer"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 text-xs font-semibold rounded text-white flex items-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                  mode === 'hold'
                    ? 'bg-[#000f22] hover:bg-[#162538]'
                    : 'bg-[#005cba] hover:bg-[#00458e] shadow-xs'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Telemetry...</span>
                  </>
                ) : mode === 'hold' ? (
                  <span>Lock Fare for $25.00</span>
                ) : (
                  <span>Confirm &amp; Issue Ticket (${flight.basePrice.toLocaleString()})</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
