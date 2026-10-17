import React from 'react';
import { X, Plane, Calendar, Clock, AlertTriangle, CheckCircle, Ban, Ticket } from 'lucide-react';

export interface CustomerBooking {
  id: string;
  pnr: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string; // ISO string
  arrivalTime: string;
  cabinClass: 'ECONOMY' | 'BUSINESS' | 'FIRST';
  status: 'CONFIRMED' | 'HELD' | 'CANCELLED_BY_CUSTOMER' | 'CANCELLED_BY_ADMIN';
  passengerName: string;
  totalPriceUSD: number;
}

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: CustomerBooking[];
  onCancelBooking: (bookingId: string) => void;
  onShowToast: (msg: string) => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  bookings,
  onCancelBooking,
  onShowToast,
}) => {
  if (!isOpen) return null;

  // Calculate hours remaining until departure
  const getHoursUntilDeparture = (departureIso: string): number => {
    const dep = new Date(departureIso).getTime();
    const now = new Date().getTime();
    return (dep - now) / (1000 * 60 * 60);
  };

  const handleCancel = (booking: CustomerBooking) => {
    const hoursLeft = getHoursUntilDeparture(booking.departureTime);

    if (hoursLeft < 4) {
      onShowToast('❌ Cancellation Restricted: Departure is within 4 hours. Under airline policy, please contact Operations Desk.');
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel booking PNR ${booking.pnr} (${booking.flightNumber})? Refund will be processed as per fare rules.`
    );

    if (confirmCancel) {
      onCancelBooking(booking.id);
      onShowToast(`✅ Booking ${booking.pnr} has been cancelled successfully.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000f22]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#c4c6ce] max-w-3xl w-full shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#c4c6ce] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#000f22] text-white flex items-center justify-center font-bold">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-[#000f22]">
                My Passenger Bookings &amp; PNR Itineraries
              </h3>
              <p className="text-[11px] text-[#43474d]">
                Self-service management adhering to the AeroNexus 4-Hour Cancellation Protocol
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#74777e] hover:text-[#000f22] rounded-md hover:bg-[#eeeeed] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Strip */}
        <div className="bg-[#fff8e1] border-b border-[#ffe082] px-3 sm:px-5 py-2 sm:py-2.5 flex items-start sm:items-center gap-2 text-[10px] sm:text-xs text-[#b78103]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Cancellation Policy:</strong> Self-cancel up to <strong>4 hours</strong> before departure.
          </span>
        </div>

        {/* Bookings List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-[#74777e]">
              <Plane className="w-12 h-12 mx-auto mb-2 opacity-30 text-[#005cba]" />
              <p className="font-semibold text-sm text-[#000f22]">No Bookings Found</p>
              <p className="text-xs">You have no active flight reservations on this account yet.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const hoursRemaining = getHoursUntilDeparture(booking.departureTime);
              const isCanCancel = hoursRemaining >= 4 && (booking.status === 'CONFIRMED' || booking.status === 'HELD');
              const isCancelled = booking.status.startsWith('CANCELLED');

              return (
                <div
                  key={booking.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isCancelled
                      ? 'bg-[#f8f9fa] border-[#c4c6ce]/60 opacity-70'
                      : 'bg-white border-[#c4c6ce] shadow-xs hover:border-[#005cba]/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0a2540] text-white">
                        {booking.flightNumber}
                      </span>
                      <span className="text-xs font-bold text-[#000f22]">
                        PNR: <span className="font-mono text-[#005cba]">{booking.pnr}</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#eeeeed] text-[#43474d]">
                        {booking.cabinClass}
                      </span>
                    </div>

                    <div>
                      {booking.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Confirmed
                        </span>
                      )}
                      {booking.status === 'HELD' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Fare Held (24h)
                        </span>
                      )}
                      {booking.status === 'CANCELLED_BY_CUSTOMER' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <Ban className="w-3 h-3" /> Cancelled by You
                        </span>
                      )}
                      {booking.status === 'CANCELLED_BY_ADMIN' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <Ban className="w-3 h-3" /> Cancelled by Dispatch Ops
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Route & Times */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs py-2 border-y border-[#eeeeed]">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#74777e]">Routing</p>
                      <p className="font-bold text-[#000f22] flex items-center gap-1.5 mt-0.5">
                        <span>{booking.origin}</span>
                        <span className="text-[#005cba]">→</span>
                        <span>{booking.destination}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#74777e]">Scheduled Departure</p>
                      <p className="font-mono text-[#000f22] mt-0.5">
                        {new Date(booking.departureTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#74777e]">Passenger</p>
                      <p className="font-medium text-[#000f22] mt-0.5">{booking.passengerName}</p>
                    </div>
                  </div>

                  {/* Footer & Cancellation Action */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-[#43474d] flex items-center gap-1.5">
                      {!isCancelled && (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#005cba]" />
                          <span>
                            Time to Departure: <strong>{hoursRemaining > 0 ? `${hoursRemaining.toFixed(1)} hrs` : 'Departed'}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    {!isCancelled && (
                      <div>
                        {isCanCancel ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(booking)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel My Booking</span>
                          </button>
                        ) : (
                          <span
                            title="Cannot cancel within 4 hours of departure"
                            className="px-3 py-1 text-[11px] font-medium text-[#74777e] bg-[#eeeeed] rounded border border-[#c4c6ce] flex items-center gap-1.5 cursor-not-allowed"
                          >
                            <Ban className="w-3 h-3 text-[#74777e]" />
                            <span>Cancellation Locked (&lt; 4h)</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
