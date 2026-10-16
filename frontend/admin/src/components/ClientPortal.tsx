import React, { useState, useEffect } from 'react';
import { Flight, BookingHoldResponse, BookingConfirmResponse, FrequentFlyerTier } from '../types/aviation';
import { aviationStore } from '../services/api';

interface ClientPortalProps {
  onBackToConsole: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onBackToConsole }) => {
  const [origin, setOrigin] = useState<string>('JFK');
  const [destination, setDestination] = useState<string>('LHR');
  const [cabinClass, setCabinClass] = useState<'First' | 'Club Suite' | 'Main Cabin'>('Club Suite');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Active Hold State (POST /bookings/hold)
  const [activeHold, setActiveHold] = useState<BookingHoldResponse | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(900);

  // Confirmation State (POST /bookings/confirm)
  const [confirmedBooking, setConfirmedBooking] = useState<BookingConfirmResponse | null>(null);

  // Waitlist Modal State (POST /waitlist/join)
  const [waitlistFlight, setWaitlistFlight] = useState<Flight | null>(null);
  const [waitlistSuccessMessage, setWaitlistSuccessMessage] = useState<string | null>(null);

  // Initial flight search
  useEffect(() => {
    handleSearch();
  }, []);

  // Timer for active hold
  useEffect(() => {
    if (!activeHold) return;
    const interval = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveHold(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeHold]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await aviationStore.searchFlights({
        origin,
        destination,
        cabin: cabinClass,
      });
      setFlights(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHoldBooking = async (flight: Flight) => {
    try {
      const hold = await aviationStore.holdBooking({
        flightNumber: flight.flightNumber,
        cabinClass,
        passengerName: 'Lord H. Sterling',
        email: 'sterling@aeronexus.aero',
        seats: 1,
      });
      setActiveHold(hold);
      setHoldSecondsLeft(900);
      setConfirmedBooking(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmBooking = async () => {
    if (!activeHold) return;
    try {
      const confirm = await aviationStore.confirmBooking({
        holdId: activeHold.holdId,
        pnr: activeHold.pnr,
        passengerDetails: {
          fullName: activeHold.passengerName,
          passportNumber: 'US98412849',
          nationality: 'United States',
        },
        paymentMethod: {
          cardNumberMasked: '•••• •••• •••• 4281',
          cardHolder: activeHold.passengerName,
        },
      });
      setConfirmedBooking(confirm);
      setActiveHold(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!waitlistFlight) return;

    const form = e.currentTarget;
    const name = (form.elements.namedItem('passengerName') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const tier = (form.elements.namedItem('tier') as HTMLSelectElement).value as FrequentFlyerTier;

    try {
      const res = await aviationStore.joinWaitlist({
        flightNumber: waitlistFlight.flightNumber,
        passengerName: name,
        email,
        tier,
        cabinClass,
      });
      setWaitlistSuccessMessage(
        `Added to standby queue for ${res.flightNumber}. PNR: ${res.pnr} | Priority Score: ${res.priorityScore} (Position #${res.waitlistPosition}).`
      );
      setWaitlistFlight(null);
      setTimeout(() => setWaitlistSuccessMessage(null), 6000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scroll bg-[#f9f9f8]">
      {/* Consumer Portal Navigation Bar */}
      <div className="bg-white border-b border-[#c4c6ce] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-headline text-xl font-bold text-[#000f22] tracking-tight">
            AeroNexus
          </span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#f3f4f3] text-[#005cba] border border-[#c4c6ce]">
            PRIVATE &amp; COMMERCIAL FLIGHT SUITES
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToConsole}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#0a2540] text-white text-xs font-semibold hover:bg-[#162538] transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">terminal</span>
            <span>Return to Ops Console [Admin V2.4]</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Banner */}
        <div className="p-6 bg-white border border-[#c4c6ce] rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-[#000f22] tracking-tight">
              Bespoke Transcontinental &amp; Oceanic Flight Booking
            </h1>
            <p className="text-sm text-[#43474d] mt-1 font-body">
              Reserve First Suites and Club Suites with guaranteed 15-minute price holds and direct GDS ticketing.
            </p>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs text-[#005cba] bg-blue-50 border border-blue-200 px-3 py-2 rounded">
            <span className="material-symbols-outlined text-sm">shield</span>
            <span>AMADEUS DIRECT API BRIDGE CONNECTED</span>
          </div>
        </div>

        {/* Global Toast if Waitlist Joined */}
        {waitlistSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded font-mono text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span>{waitlistSuccessMessage}</span>
          </div>
        )}

        {/* Search Flight Form Bar (GET /flights/search) */}
        <div className="bg-white border border-[#c4c6ce] rounded-lg p-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                ORIGIN (DEPARTURE)
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full h-9 px-2 font-mono text-xs font-semibold bg-white border border-[#c4c6ce] rounded text-[#000f22]"
              >
                <option value="JFK">JFK • New York John F. Kennedy</option>
                <option value="SFO">SFO • San Francisco Intl</option>
                <option value="BOS">BOS • Boston Logan</option>
                <option value="LAX">LAX • Los Angeles Intl</option>
                <option value="ORD">ORD • Chicago O'Hare</option>
                <option value="MIA">MIA • Miami Intl</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                DESTINATION (ARRIVAL)
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-9 px-2 font-mono text-xs font-semibold bg-white border border-[#c4c6ce] rounded text-[#000f22]"
              >
                <option value="LHR">LHR • London Heathrow T5</option>
                <option value="HND">HND • Tokyo Haneda</option>
                <option value="DUB">DUB • Dublin Airport</option>
                <option value="CDG">CDG • Paris Charles de Gaulle</option>
                <option value="FRA">FRA • Frankfurt am Main</option>
                <option value="EZE">EZE • Buenos Aires</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] font-semibold text-[#43474d] mb-1">
                CABIN CLASS
              </label>
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value as any)}
                className="w-full h-9 px-2 font-mono text-xs font-semibold bg-white border border-[#c4c6ce] rounded text-[#000f22]"
              >
                <option value="Club Suite">Club Suite (Business Flatbed)</option>
                <option value="First">First Class (Private Suite)</option>
                <option value="Main Cabin">Main Cabin (Preferred Economy)</option>
              </select>
            </div>

            <div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full h-9 bg-[#005cba] hover:bg-[#00458e] text-white rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">search</span>
                <span>{isSearching ? 'Searching GDS...' : 'Search Available Flights'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Hold Banner (POST /bookings/hold) */}
        {activeHold && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded bg-amber-200 text-amber-900 flex items-center justify-center font-mono font-bold text-lg">
                <span className="material-symbols-outlined">lock_clock</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-amber-950 uppercase">
                    SEAT PRICE HOLD SECURED
                  </span>
                  <span className="font-mono text-[11px] text-amber-800">
                    PNR: <strong>{activeHold.pnr}</strong>
                  </span>
                </div>
                <p className="text-xs text-amber-900 font-body">
                  Flight {activeHold.flightNumber} ({activeHold.cabinClass}) locked at $
                  {activeHold.priceTotal.toLocaleString()} for passenger {activeHold.passengerName}.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right font-mono text-xs">
                <span className="text-amber-800 block text-[10px]">TIME REMAINING:</span>
                <span className="text-base font-bold text-amber-950">
                  {formatTimer(holdSecondsLeft)}
                </span>
              </div>

              <button
                onClick={handleConfirmBooking}
                className="px-4 py-2 bg-[#0a2540] hover:bg-[#162538] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center space-x-1"
              >
                <span className="material-symbols-outlined text-sm">credit_card</span>
                <span>Confirm &amp; Issue Ticket</span>
              </button>
            </div>
          </div>
        )}

        {/* Confirmed Ticket Boarding Pass (POST /bookings/confirm) */}
        {confirmedBooking && (
          <div className="p-5 bg-white border-2 border-emerald-500 rounded-lg shadow-md animate-in fade-in space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-emerald-600">verified</span>
                <span className="font-headline text-base font-bold text-[#000f22]">
                  OFFICIAL BOARDING PASS ISSUED
                </span>
              </div>
              <span className="font-mono text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                ETKT: {confirmedBooking.confirmationNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
              <div>
                <span className="text-gray-500 block text-[10px]">PASSENGER</span>
                <span className="font-bold text-[#000f22] text-sm">
                  {confirmedBooking.passengerName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">FLIGHT / CABIN</span>
                <span className="font-bold text-[#005cba] text-sm">
                  {confirmedBooking.flightNumber} • {confirmedBooking.cabinClass}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">SEAT / GATE</span>
                <span className="font-bold text-emerald-700 text-sm">
                  Seat {confirmedBooking.seatAssignment} • {confirmedBooking.gate}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">PNR CODE</span>
                <span className="font-bold text-[#000f22] text-sm">{confirmedBooking.pnr}</span>
              </div>
            </div>

            <div className="bg-[#f3f4f3] p-2.5 rounded flex items-center justify-between font-mono text-[11px] text-[#43474d]">
              <span>TOKEN: {confirmedBooking.qrCodeToken}</span>
              <button
                onClick={() => alert(`Boarding pass sent to mobile wallet!`)}
                className="text-[#005cba] hover:underline font-bold"
              >
                Add to Apple Wallet / Google Pay
              </button>
            </div>
          </div>
        )}

        {/* Flight Search Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-[#43474d]">
            <span>FOUND {flights.length} DIRECT SECTOR OPTIONS</span>
            <span>SORT: EARLIEST DEPARTURE</span>
          </div>

          {flights.map((flight) => {
            const isSoldOut = flight.cabinLoad.percentage >= 100;

            return (
              <div
                key={flight.id}
                className="p-4 bg-white border border-[#c4c6ce] hover:border-[#005cba] rounded-lg shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Route & Times */}
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="font-headline text-2xl font-bold text-[#000f22] block leading-none">
                      {flight.stdUtc}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#43474d] mt-1 block">
                      {flight.origin}
                    </span>
                    <span className="text-[10px] text-gray-500">{flight.originName}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[10px] text-[#74777e] mb-1">
                      NON-STOP • 7h 35m
                    </span>
                    <div className="w-24 h-0.5 bg-[#c4c6ce] relative flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#005cba] text-xs">
                        flight_takeoff
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-emerald-700 font-bold mt-1">
                      {flight.aircraft} ({flight.engineSpecs})
                    </span>
                  </div>

                  <div>
                    <span className="font-headline text-2xl font-bold text-[#000f22] block leading-none">
                      {flight.staUtc}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#43474d] mt-1 block">
                      {flight.destination}
                    </span>
                    <span className="text-[10px] text-gray-500">{flight.destinationName}</span>
                  </div>
                </div>

                {/* Cabin Specs & Pricing */}
                <div className="flex items-center justify-between md:justify-end space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-[#c4c6ce]">
                  <div className="text-left md:text-right">
                    <span className="font-mono text-[10px] text-gray-500 block uppercase">
                      {cabinClass} FARE
                    </span>
                    <span className="font-headline text-xl font-bold text-[#000f22]">
                      ${(flight.priceUSD * (cabinClass === 'First' ? 2.8 : cabinClass === 'Club Suite' ? 1.6 : 1.0)).toFixed(0)}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 block">
                      {isSoldOut ? '0 SEATS REMAINING' : `${flight.cabinLoad.capacity - flight.cabinLoad.booked} SEATS AVAILABLE`}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-1.5 shrink-0">
                    {isSoldOut ? (
                      <button
                        onClick={() => setWaitlistFlight(flight)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors flex items-center space-x-1"
                      >
                        <span className="material-symbols-outlined text-sm">hourglass_top</span>
                        <span>Join Priority Waitlist</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleHoldBooking(flight)}
                        className="px-3.5 py-1.5 bg-[#005cba] hover:bg-[#00458e] text-white rounded text-xs font-semibold transition-colors flex items-center space-x-1"
                      >
                        <span className="material-symbols-outlined text-sm">lock_clock</span>
                        <span>Hold Seat (15m Freeze)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Join Waitlist Modal (POST /waitlist/join) */}
      {waitlistFlight && (
        <div
          className="fixed inset-0 z-50 bg-[#0a2540]/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWaitlistFlight(null);
          }}
        >
          <div className="bg-white border border-[#c4c6ce] rounded shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 bg-[#f3f4f3] border-b border-[#c4c6ce] flex items-center justify-between">
              <span className="font-headline font-bold text-sm text-[#000f22]">
                Join Standby Priority Waitlist: {waitlistFlight.flightNumber}
              </span>
              <button
                onClick={() => setWaitlistFlight(null)}
                className="text-gray-400 hover:text-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinWaitlist} className="p-4 space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[#43474d] mb-1">PASSENGER NAME</label>
                <input
                  name="passengerName"
                  required
                  defaultValue="Lord H. Sterling"
                  className="w-full h-8 px-2 border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>

              <div>
                <label className="block text-[#43474d] mb-1">EMAIL CONTACT</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue="sterling@aeronexus.aero"
                  className="w-full h-8 px-2 border border-[#c4c6ce] rounded text-[#000f22]"
                />
              </div>

              <div>
                <label className="block text-[#43474d] mb-1">MEDALLION / REWARD TIER</label>
                <select
                  name="tier"
                  defaultValue="DIAMOND VIP"
                  className="w-full h-8 px-2 border border-[#c4c6ce] rounded text-[#000f22]"
                >
                  <option value="DIAMOND VIP">Diamond VIP (Score Weight 99+)</option>
                  <option value="PLATINUM">Platinum Tier (Score Weight 94+)</option>
                  <option value="GOLD">Gold Tier (Score Weight 85+)</option>
                  <option value="GENERAL Y">General Revenue Standby (Score ~75)</option>
                </select>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-body">
                Our algorithmic auto-clearing engine continuously scans cancellations and releases seats based on Medallion tier weight.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setWaitlistFlight(null)}
                  className="px-3 py-1.5 border border-[#c4c6ce] rounded text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0a2540] text-white font-bold rounded hover:bg-[#162538]"
                >
                  Submit Standby Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
